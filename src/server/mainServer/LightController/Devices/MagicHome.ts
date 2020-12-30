import { connect, Socket } from "net";
import { clamp } from "lodash";
import * as os from "os";
import { saveSettings, settings } from "../../main/storage";
import { includes, removeFromArray } from "../../../../shared/utils";
import { LightController, Lights } from "./Controller";
import { WebSocket } from "../../socket/Websocket";

export class MagicHomeController implements LightController {
  private readonly PORT = 5577;
  private readonly IPv4Reg = /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?(\.|$)){4}\b/;
  private mask = 0x0f; // 0x0F;
  private sockets: Socket[] = [];
  private addresses: string[] = [];
  private sending = false;
  private queue: Buffer[] = [];
  private destroyed = false;
  private timeout: NodeJS.Timeout;
  private last = Date.now();
  private delay = 25;
  private scanning = false;

  constructor() {
    const ips = settings.magicHome.ips;

    if (ips.length) {
      this.init(ips);
    } else {
      (async () => {
        Logger.info("Magic home", "Scanning for devices please wait. This could take up to few minutes");
        const ips = await this.ipScannerIPv4();
        if (ips.length) {
          settings.magicHome.ips = ips;
          await saveSettings();
          Logger.info("Magic home", `Found ${ips.length} devices`);
          this.init(ips);
        } else {
          Logger.info("Magic home", "Devices not found!");
        }
        this.timeout = setInterval(this.tick, 0);
      })();
    }
  }
  async setRGB(red: number, green: number, blue: number): Promise<void> {
    const buffer = this.getColourBuffer(red, green, blue);
    await this.send(buffer);
  }
  setIfPossible(red: number, green: number, blue: number): boolean {
    if (this.queue.length) return false;
    const now = Date.now();
    if (this.last + this.delay > now) {
      return false;
    }
    this.last = now;
    if (this.sending) {
      return false;
    }
    this.sending = true;
    const buffer = this.getColourBuffer(red, green, blue);
    (async () => {
      await this.broadcast(this.getCommand(buffer));
      this.sending = false;
    })();
    return true;
  }

  private init(addresses: string[]) {
    this.addresses = addresses;
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets = [];
    for (const address of addresses) {
      this.registerSocket(address);
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setInterval(this.tick, 0);
  }

  async ipScannerIPv4(ipV4?: string) {
    if (this.scanning) {
      throw new Error("Scan already in progress");
    }
    this.scanning = true;
    const RANGE = 255;
    if (ipV4) {
      if (!this.IPv4Reg.test(ipV4)) {
        throw new Error(`Invalid IP: ${ipV4}`);
      }
    }

    const ips = ipV4 ? [ipV4] : this.getIPV4sFromNetwork();
    const foundServers: string[] = [];
    for (const ip of ips) {
      const s = ip.split(".");
      for (let i = 0; i < RANGE; i++) {
        const seekIP = `${s[0]}.${s[1]}.${s[2]}.${i}`;
        if (includes(settings.magicHome.blockedIp, seekIP)) {
          continue;
        }
        const result = await this.isSocketAlive(seekIP);
        if (result) {
          foundServers.push(seekIP);
        }
      }
    }
    Logger.debug("IP scan done", foundServers);
    this.scanning = false;
    return foundServers;
  }

  private isSocketAlive(host: string) {
    return new Promise<boolean>(resolve => {
      const timeout = 1000;
      const port = this.PORT;
      const socket = connect({ port, host, timeout });
      socket.addListener("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.addListener("error", () => {
        socket.destroy();
        resolve(false);
      });
      socket.addListener("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  private getIPV4sFromNetwork() {
    const interfaces = os.networkInterfaces();
    const entries = Object.entries(interfaces);
    const ips: string[] = [];
    for (const [_, infoArray] of entries) {
      for (const info of infoArray) {
        const ip = info.address;
        const valid = this.IPv4Reg.test(ip);
        if (valid) {
          ips.push(ip);
        }
      }
    }
    return ips;
  }

  private registerSocket(address: string) {
    if (!includes(this.addresses, address)) {
      return;
    }
    const exist = this.sockets.find(s => s.localAddress === address);
    if (exist) {
      return;
    }

    const socket = connect(this.PORT, address);

    socket.on("end", () => {
      removeFromArray(this.sockets, socket);
      socket.destroy();
      this.registerSocket(address);
    });

    socket.on("error", () => {
      removeFromArray(this.sockets, socket);
      socket.destroy();
      this.registerSocket(address);
    });

    Logger.debug("Magic home", `Connecting to ${address}`);
    this.sockets.push(socket);
  }
  private getColourBuffer(red: number, green: number, blue: number, white = 0, mode = false) {
    /*this.lastWhite =*/ white = clamp(white, 0, 255);

    if (!mode) {
      return Buffer.from([0x31, red, green, blue, white, this.mask, 0x0f]);
    }
    const repeat = 15;
    const template = [0, 1, 2, 3];
    const array: number[] = [];
    for (let i = 0; i < repeat; i++) {
      for (const number of template) {
        array.push(number);
      }
    }
    return Buffer.from([0x51, red, green, blue, ...array, 0, 0x1f, 0x3b, 0xff, 0xf0]);
  }

  async setColorInstantly(red: number, green: number, blue: number, white?: number) {
    const fadeBuffer = this.getColourBuffer(red, green, blue, white, true);
    const buffer = this.getColourBuffer(red, green, blue, white);
    await this.send(fadeBuffer);
    await this.send(buffer);
    return;
  }

  getCommand(buffer: Buffer) {
    let checksum = 0;
    const values = buffer.values();
    for (const byte of values) {
      checksum += byte;
    }
    checksum &= 0xff;
    return Buffer.concat([buffer, Buffer.from([checksum])]);
  }

  async send(buffer: Buffer) {
    this.queue.push(this.getCommand(buffer));
  }

  tick = async () => {
    if (this.destroyed) return;
    if (this.sending) return;
    if (!this.queue.length) return;
    const buffer = this.queue.shift();
    this.sending = true;
    await this.broadcast(buffer);
    this.sending = false;
  };

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.queue.length = 0;
    for (const socket of this.sockets) {
      socket.destroy();
    }
    clearTimeout(this.timeout);
  }

  private broadcast(buffer: Buffer) {
    return new Promise<void>(resolve => {
      const expected = this.sockets.length;
      let result = 0;

      // eslint-disable-next-line prefer-const
      let interval: NodeJS.Timeout;
      const destroy = setTimeout(() => {
        Logger.debug("Socket broadcast", "Sending is taking too long!");
        clearTimeout(destroy);
        clearInterval(interval);
        resolve();
      }, 100);

      const loop = () => {
        if (expected === result) {
          clearTimeout(destroy);
          clearInterval(interval);
          return resolve();
        }
      };
      interval = setInterval(loop, 0);

      for (const socket of this.sockets) {
        this.sendOne(socket, buffer).then(() => result++);
      }
    });
  }
  private sendOne(socket: Socket, buffer: Buffer) {
    return new Promise<void>(resolve => {
      socket.write(buffer, "binary", () => {
        resolve();
      });
    });
  }
}

export function setupMagicWebsocket(socket: WebSocket, lights: Lights) {
  const isMagicHome = () => {
    return lights.getInstance() instanceof MagicHomeController;
  };

  socket.onPromise<boolean, []>("is-magic-active", async client => {
    client.validateAuthentication();
    return isMagicHome();
  });
}

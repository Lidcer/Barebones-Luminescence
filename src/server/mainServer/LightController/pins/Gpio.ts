import { EventEmitter } from "events";
import fs from "fs";
import binding from 'bindings';
export let pigpio: any;
try {
  pigpio = binding('pigpio.node');
} catch (error) {
  console.warn(`+-----------------------------------------------------------------------+`);
  console.warn(`| Warning: The pigpio C library can't be loaded on this machine and any |`);
  console.warn(`| attempt to use it will fail.                                          |`);
  console.warn(`|                                                                       |`);
  console.warn(`| Error: "Module did not self-register"                                 |`);
  console.warn(`| ------------------------------------                                  |`);
  console.warn(`| If you are working on a Raspberry Pi and see a "Module did not self-  |`);
  console.warn(`| register" error, this typically indicates that the installation       |`);
  console.warn(`| instructions were not exactly followed. For further details see the   |`);
  console.warn(`| installation section of the readme at                                 |`);
  console.warn(`| https://github.com/fivdi/pigpio#installation                          |`);
  console.warn(`| Note that step 1 of the installation instructions must be completed   |`);
  console.warn(`| before step 2.                                                        |`);
  console.warn(`+-----------------------------------------------------------------------+`);

  console.warn();
  console.warn(
    `Invoking require('bindings')('pigpio.node') resulted in ` +
    `the follwoing error:`
  );
  console.warn();

  console.warn(error.stack);

 pigpio = {
  gpioInitialise: () => {},
  gpioWaveClear: () => {},
  gpioWaveAddNew: () => {},
  gpioWaveAddGeneric: () => {},
  gpioWaveCreate: () => {},
  gpioWaveDelete: () => {},
  gpioWaveTxSend: () => {},
  gpioWaveChain: () => {},
  gpioSetMode: () => {},
  gpioWaveTxAt: () => {},
  gpioPWM: () => {},
  gpioWaveTxBusy: () => {},
  gpioWaveTxStop: () => {},
  gpioWaveGetHighMicros: () => {},
  gpioWaveGetMaxMicros: () => {},
  gpioWaveGetPulses: () => {},
  gpioWaveGetHighPulses: () => {},
  gpioWaveGetMaxPulses: () => {},
  gpioWaveGetCbs: () => {},
  gpioWaveGetHighCbs: () => {},
  gpioWaveGetMaxCbs: () => {},
  gpioHardwareRevision: () => {},
  gpioTerminate: () => {},
  gpioCfgSocketPort: () => {},
  gpioCfgClock: () => {},
 }
}


let initialized = false;
const initializePigpio = () => {
  if (!initialized) {
    try {
      pigpio.gpioInitialise();
      
    } catch (error) {
      console.error(error)
    }
    initialized = true;
  }
};

export function getTick() {
  return pigpio.gpioTick();
}
export function tickDiff(startUsec: number, endUsec: number) {
  return (endUsec >> 0) - (startUsec >> 0);
}
export function waveClear(){
  pigpio.gpioWaveClear();
};

export function waveAddNew (){
  pigpio.gpioWaveAddNew();
};

export function waveAddGeneric(pulses: number) {
  return pigpio.gpioWaveAddGeneric(pulses);
};

export function waveCreate () {
  return pigpio.gpioWaveCreate();
};

export function waveDelete(waveId: number) {
  pigpio.gpioWaveDelete(waveId);
};

export function waveTxSend(waveId: number, waveMode: number) {
  return pigpio.gpioWaveTxSend(waveId, waveMode);
};

export function waveChain(chain: any) {
  let buf = Buffer.from(chain);
  pigpio.gpioWaveChain(buf, buf.length);
};

export function waveTxAt() {
  return pigpio.gpioWaveTxAt();
};

export function waveTxBusy() {
  return pigpio.gpioWaveTxBusy();
};

export function waveTxStop() {
  pigpio.gpioWaveTxStop();
};

export function waveGetMicros() {
  return pigpio.gpioWaveGetMicros();
};

export function waveGetHighMicros() {
  return pigpio.gpioWaveGetHighMicros();
};

export function waveGetMaxMicros() {
  return pigpio.gpioWaveGetMaxMicros();
};

export function waveGetPulses() {
  return pigpio.gpioWaveGetPulses();
};

export function waveGetHighPulses() {
  return pigpio.gpioWaveGetHighPulses();
};

export function waveGetMaxPulses() {
  return pigpio.gpioWaveGetMaxPulses();
};

export function waveGetCbs() {
  return pigpio.gpioWaveGetCbs();
};

export function waveGetHighCbs() {
  return pigpio.gpioWaveGetHighCbs();
};

export function waveGetMaxCbs() {
  return pigpio.gpioWaveGetMaxCbs();
};


interface GpioOptions {
  mode?: number;
  pullUpDown?: number;
  edge?: number;
  timeout?: number;
  alert?: boolean;
}

export class Gpio extends EventEmitter {
  private gpio: number;
  constructor(gpio:number, options: GpioOptions) {
    super();

    initializePigpio();

    options = options || {};

    this.gpio = +gpio;

    if (typeof options.mode === 'number') {
      this.mode(options.mode);
    }

    if (typeof options.pullUpDown === 'number') {
      this.pullUpDown(options.pullUpDown);
    }

    if (typeof options.edge === 'number') {
      this.enableInterrupt(options.edge,
        typeof options.timeout === 'number' ? options.timeout : 0
      );
    }

    if (typeof options.alert === 'boolean' && options.alert) {
      this.enableAlert();
    }
  }

  mode(mode: number) {
    // What happens if the mode is INPUT, there is an ISR, and the mode is
    // changed to OUTPUT (or anything else for that matter)?
    pigpio.gpioSetMode(this.gpio, +mode);
    return this;
  }

  getMode() {
    return pigpio.gpioGetMode(this.gpio);
  }

  pullUpDown(pud: number) {
    pigpio.gpioSetPullUpDown(this.gpio, +pud);
    return this;
  }

  digitalRead() {
    return pigpio.gpioRead(this.gpio);
  }

  digitalWrite(level: number) {
    pigpio.gpioWrite(this.gpio, +level);
    return this;
  }

  trigger(pulseLen: number, level: number) {
    pigpio.gpioTrigger(this.gpio, +pulseLen, +level);
    return this;
  }

  pwmWrite(dutyCycle: number) {
    pigpio.gpioPWM(this.gpio, +dutyCycle);
    return this;
  }

  hardwarePwmWrite(frequency: number, dutyCycle: number) {
    pigpio.gpioHardwarePWM(this.gpio, +frequency, +dutyCycle);
    return this;
  }

  getPwmDutyCycle() {
    return pigpio.gpioGetPWMdutycycle(this.gpio);
  }

  pwmRange(range: number) {
    pigpio.gpioSetPWMrange(this.gpio, +range);
    return this;
  }

  getPwmRange() {
    return pigpio.gpioGetPWMrange(this.gpio);
  }

  getPwmRealRange() {
    return pigpio.gpioGetPWMrealRange(this.gpio);
  }

  pwmFrequency(frequency: number) {
    pigpio.gpioSetPWMfrequency(this.gpio, +frequency);
    return this;
  }

  getPwmFrequency() {
    return pigpio.gpioGetPWMfrequency(this.gpio);
  }

  servoWrite(pulseWidth: number) {
    pigpio.gpioServo(this.gpio, +pulseWidth);
    return this;
  }

  getServoPulseWidth() {
    return pigpio.gpioGetServoPulsewidth(this.gpio);
  }

  enableInterrupt(edge: number, timeout: number) {
    const handler = (_gpio, level: number, tick: number) => {
      this.emit('interrupt', level, tick);
    };

    timeout = timeout || 0;
    pigpio.gpioSetISRFunc(this.gpio, +edge, +timeout, handler);
    return this;
  }

  disableInterrupt() {
    pigpio.gpioSetISRFunc(this.gpio, Gpio.EITHER_EDGE, 0);
    return this;
  }

  enableAlert() {
    const handler = (gpio, level, tick) => {
      this.emit('alert', level, tick);
    };

    pigpio.gpioSetAlertFunc(this.gpio, handler);
    return this;
  }

  disableAlert() {
    pigpio.gpioSetAlertFunc(this.gpio);
    return this;
  }

  glitchFilter(steady: number) {
    pigpio.gpioGlitchFilter(this.gpio, +steady);
    return this;
  }
  analogWrite(dutyCycle: number) {
    return this.pwmWrite(dutyCycle);
  }


  /* mode */
  static get INPUT() { return 0; } // PI_INPUT
  static get OUTPUT() { return 1; } //PI_OUTPUT;
  static get ALT0() { return 4; } // PI_ALT0;
  static get ALT1() { return 5; } // PI_ALT1;
  static get ALT2() { return 6; } // PI_ALT2;
  static get ALT3() { return 7; } // PI_ALT3;
  static get ALT4() { return 3; } // PI_ALT4;
  static get ALT5() { return 2; } // PI_ALT5;

  /* pull up/down resistors */
  static get PUD_OFF() { return 0; } // PI_PUD_OFF;
  static get PUD_DOWN() { return 1; } // PI_PUD_DOWN;
  static get PUD_UP() { return 2; } // PI_PUD_UP;

  /* isr */
  static get RISING_EDGE() { return 0; } // RISING_EDGE;
  static get FALLING_EDGE() { return 1; } // FALLING_EDGE;
  static get EITHER_EDGE() { return 2; } // EITHER_EDGE;

  /* timeout */
  static get TIMEOUT() { return 2; } // PI_TIMEOUT;

  /* gpio numbers */
  static get MIN_GPIO() { return 0; } // PI_MIN_GPIO;
  static get MAX_GPIO() { return 53; } // PI_MAX_GPIO;
  static get MAX_USER_GPIO() { return 31; } // PI_MAX_USER_GPIO;
}


export class GpioBank {
  private bankNo: number;
  constructor(bank: number) {
    initializePigpio();

    this.bankNo = +bank || GpioBank.BANK1;
  }

  read() {
    if (this.bankNo === GpioBank.BANK1) {
      return pigpio.GpioReadBits_0_31();
    } else if (this.bankNo === GpioBank.BANK2) {
      return pigpio.GpioReadBits_32_53();
    }
  }

  set(bits: number) {
    if (this.bankNo === GpioBank.BANK1) {
      pigpio.GpioWriteBitsSet_0_31(+bits);
    } else if (this.bankNo === GpioBank.BANK2) {
      pigpio.GpioWriteBitsSet_32_53(+bits);
    }

    return this;
  }

  clear(bits : number) {
    if (this.bankNo === GpioBank.BANK1) {
      pigpio.GpioWriteBitsClear_0_31(+bits);
    } else if (this.bankNo === GpioBank.BANK2) {
      pigpio.GpioWriteBitsClear_32_53(+bits);
    }

    return this;
  }

  bank() {
    return this.bankNo;
  }

  static get BANK1() { return 1; }
  static get BANK2() { return 2; }
}

const NOTIFICATION_PIPE_PATH_PREFIX = '/dev/pigpio';

export class Notifier {
  private notificationStream: fs.ReadStream;
  private handle: any;
  constructor(options) {
    initializePigpio();

    options = options || {};

    this.handle = pigpio.gpioNotifyOpenWithSize(0);

    // set highWaterMark to a multiple of NOTIFICATION_LENGTH to avoid 'data'
    // events being emitted with buffers containing partial notifications.
    this.notificationStream =
      fs.createReadStream(NOTIFICATION_PIPE_PATH_PREFIX + this.handle, {
        highWaterMark: Notifier.NOTIFICATION_LENGTH * 5000
      });

    if (typeof options.bits === 'number') {
      this.start(options.bits);
    }
  }

  start(bits: number) {
    pigpio.gpioNotifyBegin(this.handle, +bits);
    return this;
  }

  stop() {
    pigpio.gpioNotifyPause(this.handle);
    return this;
  }

  close() {
    pigpio.gpioNotifyClose(this.handle);
  }

  stream() {
    return this.notificationStream;
  }

  static get NOTIFICATION_LENGTH() { return 12; }
  static get PI_NTFY_FLAGS_ALIVE() { return 1 << 6; }
}



export function hardwareRevision() {
  return pigpio.gpioHardwareRevision();
};

export function configureInterfaces(interfaces) {
  return pigpio.gpioCfgInterfaces(+interfaces);
};

export const DISABLE_FIFO_IF = 1; // PI_DISABLE_FIFO_IF;
export const DISABLE_SOCK_IF = 2; // PI_DISABLE_SOCK_IF;
export const LOCALHOST_SOCK_IF = 4; // PI_LOCALHOST_SOCK_IF;
export const DISABLE_ALERT = 8; // PI_DISABLE_ALERT;
export const WAVE_MODE_ONE_SHOT = 0; // PI_WAVE_MODE_ONE_SHOT
export const WAVE_MODE_REPEAT = 1; // PI_WAVE_MODE_REPEAT
export const WAVE_MODE_ONE_SHOT_SYNC = 2; // PI_WAVE_MODE_ONE_SHOT_SYNC
export const WAVE_MODE_REPEAT_SYNC = 3; // PI_WAVE_MODE_REPEAT_SYNC

export function initialize (){
  initializePigpio();
};

export function terminate(){
  pigpio.gpioTerminate();

  initialized = false;
};

export function configureClock(microseconds: number, peripheral: number){
  pigpio.gpioCfgClock(+microseconds, +peripheral);
};

export function configureSocketPort(port: number){
  pigpio.gpioCfgSocketPort(+port);
};

export const CLOCK_PWM = 0; // PI_CLOCK_PWM;
export const CLOCK_PCM = 1; // PI_CLOCK_PCM;


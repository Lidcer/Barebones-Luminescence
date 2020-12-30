import { clamp } from "lodash";
import { MAGIC_HOME_CONTROLLER } from "../../main/config";
import { MagicHomeController } from "./MagicHome";
import { PIController } from "./pi";

export interface LightController {
  setRGB(red: number, green: number, blue: number): Promise<void>;
  setIfPossible(red: number, green: number, blue: number): boolean;
}

export class Lights implements LightController {
  private readonly MAX_RBG_VALUE = 255;
  private readonly MIN_RBG_VALUE = 0;
  private ledController: LightController;
  private red = 0;
  private green = 0;
  private blue = 0;

  constructor() {
    if (MAGIC_HOME_CONTROLLER) {
      Logger.info("Light Controller", "Using Magic home api");
      this.ledController = new MagicHomeController();
    } else {
      Logger.info("Light Controller", "Using pi api");
      this.ledController = new PIController();
    }
  }
  setRGB(red: number, green: number, blue: number): Promise<void> {
    if (this.red === red && this.green === green && this.blue === blue) {
      return;
    }

    this.red = red = clamp(red, this.MIN_RBG_VALUE, this.MAX_RBG_VALUE);
    this.green = green = clamp(green, this.MIN_RBG_VALUE, this.MAX_RBG_VALUE);
    this.blue = blue = clamp(blue, this.MIN_RBG_VALUE, this.MAX_RBG_VALUE);

    return this.ledController.setRGB(red, green, blue);
  }
  setIfPossible(red: number, green: number, blue: number): boolean {
    return this.ledController.setIfPossible(red, green, blue);
  }
  setRed(red: number) {
    return this.ledController.setRGB(red, this.green, this.blue);
  }
  setGreen(green: number) {
    return this.ledController.setRGB(this.red, green, this.blue);
  }
  setBlue(blue: number) {
    return this.ledController.setRGB(this.red, this.green, blue);
  }
  getInstance() {
    return this.ledController;
  }
}

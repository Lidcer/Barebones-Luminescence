import { LightController } from "./Controller";

export class PIController implements LightController {
  async setRGB(red: number, green: number, blue: number): Promise<void> {
    console.log(red, green, blue);
  }
  setIfPossible(red: number, green: number, blue: number): boolean {
    console.log(red, green, blue);
    return false;
  }
}

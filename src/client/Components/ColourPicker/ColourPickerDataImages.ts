import { RGB, HSV } from "../../../shared/interfaces";
import { hsv2rgb } from "../../../shared/colour";

export class PreGenerateColourPickerPalette {
  readonly SV_MAX = 100;
  readonly H_MAX = 360;
  readonly BOX_SIZE = 255;
  readonly BOX_SIDE_WIDTH = 25;
  readonly BOX_SIDE_HEIGHT = this.BOX_SIZE;
  readonly MAX_RGB_VALUE = 255;
  private preloaded = new Map<number, ImageData>();
  private preloadedSide = new Map<string, ImageData>(); // h:v
  private pixelArray = new Uint8ClampedArray(this.BOX_SIZE * this.BOX_SIZE * 4);
  constructor() {}

  async generate(process?: (percentage: number) => void) {
    return;
    const totalIterations = this.H_MAX * this.SV_MAX + this.SV_MAX;
    let i = 0;
    for (let v = 0; v <= this.SV_MAX; v++) {
      const imageData = this.generateImageDataMain(v);
      this.preloaded.set(v, imageData);
      await this.next();
      if (process) {
        process(Math.round((++i / totalIterations) * 100));
      }
    }
    for (let h = 0; h <= this.H_MAX; h++) {
      for (let s = 0; s < this.SV_MAX; s++) {
        const imageData = this.generateImageDataSide(h, s);
        const side = this.getSideString(h, s);
        this.preloadedSide.set(side, imageData);
        await this.next();
        if (process) {
          process(Math.round((++i / totalIterations) * 100));
        }
      }
    }
  }

  next() {
    return new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
  }

  getSideColour(h: number, s: number, v: number): RGB {
    const height = this.BOX_SIDE_HEIGHT;
    const HSV: HSV = {
      h,
      s,
      v: 1 - v / height,
    };

    const { r: red, g: green, b: blue } = hsv2rgb(HSV);
    return { r: red, g: green, b: blue };
  }

  getColourAt(x: number, y: number, v: number): RGB {
    y = ((y / this.BOX_SIZE) * this.SV_MAX) / this.SV_MAX;

    const HSV: HSV = {
      h: (x / this.BOX_SIZE) * this.H_MAX,
      s: 1 - y,
      v: v / this.SV_MAX,
    };

    const { r: red, g: green, b: blue } = hsv2rgb(HSV);
    return { r: red, g: green, b: blue };
  }

  generateImageDataSide(h: number, s: number) {
    const width = this.BOX_SIDE_WIDTH;
    const height = this.BOX_SIDE_HEIGHT;
    const len = width * height * 4;
    const pixelArray = new Uint8ClampedArray(len);

    let i = 0;
    for (let y = 0; y < height; y++) {
      const colourObj = this.getSideColour(h, s, y);
      for (let x = 0; x < width; x++) {
        pixelArray[i++] = colourObj.r;
        pixelArray[i++] = colourObj.g;
        pixelArray[i++] = colourObj.b;
        pixelArray[i++] = this.MAX_RGB_VALUE;
      }
    }
    return new ImageData(pixelArray, width);
  }
  generateImageDataMain(v: number) {
    const width = this.BOX_SIZE;
    const height = this.BOX_SIZE;
    const len = width * height * 4;
    const pixelArray = new Uint8ClampedArray(len);

    let i = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const colourObj = this.getColourAt(y, x, v);
        pixelArray[i++] = colourObj.r;
        pixelArray[i++] = colourObj.g;
        pixelArray[i++] = colourObj.b;
        pixelArray[i++] = this.MAX_RGB_VALUE;
      }
    }
    return new ImageData(pixelArray, width);
  }

  getImageDataMain(v: number) {
    let imageData = this.preloaded.get(v);
    if (!imageData) {
      imageData = this.generateImageDataMain(v);
      this.preloaded.set(v, imageData);
    }
    return imageData;
  }
  getImageDataSide(h: number, s: number) {
    const sideString = this.getSideString(h, s);
    let imageData = this.preloadedSide.get(sideString);
    if (!imageData) {
      imageData = this.generateImageDataSide(h, s);
      this.preloadedSide.set(sideString, imageData);
    }
    return imageData;
  }

  getSideString(h: number, s: number) {
    return `${h}:${s}`;
  }
}

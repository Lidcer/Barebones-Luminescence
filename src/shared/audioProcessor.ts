import { clamp } from "lodash";
import { Logger } from "./logger";

export class AudioProcessor {
  private Int16Array = new Int16Array(128);
  private leftSpeaker = new Int16Array(128);
  private rightSpeaker = new Int16Array(128);
  private merged = new Int16Array(128);
  private smooth: Int16Array[] = [];
  private rgbProcessorMax: number = 150;
  private amplify = false;
  public readonly maxValue = 32767;

  constructor(private smoothingSize = 3) {}

  pipe(arrayBuffer: Int16Array) {
    if (arrayBuffer.length !== this.Int16Array.length) {
      const originalArray = this.Int16Array;
      this.Int16Array = new Int16Array(arrayBuffer.length);
      const half = Math.round(arrayBuffer.length * 0.5);
      this.leftSpeaker = new Int16Array(half);
      this.rightSpeaker = new Int16Array(half);
      this.merged = new Int16Array(half);
      Logger.debug(`Array buffer has been resized ${this.Int16Array.length}`);
      this.smooth.length = 0;
      for (let i = 0; i < this.Int16Array.length; i++) {
        this.Int16Array[i] = originalArray[i] || 0;
      }
    }
    this.addNewValues(arrayBuffer);
  }
  get arrayBuffer() {
    return this.Int16Array;
  }
  get leftBuffer() {
    return this.leftSpeaker;
  }
  get rightBuffer() {
    return this.rightSpeaker;
  }
  get mergedBuffer() {
    return this.merged;
  }
  get rgbBuffer() {
    const array = this.merged;
    const len = this.rgbProcessorMax > this.merged.length ? this.merged.length : this.rgbProcessorMax;
    const buffer = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = array[i];
    }
    // const buffer = new Int16Array(array.length);
    // for (let i = 0; i < array.length; i++) {
    //   buffer[i] = array[i];
    // }
    return buffer;
  }
  getFrequency(arrayBuffer?: Int16Array) {
    arrayBuffer = arrayBuffer ? arrayBuffer : this.arrayBuffer;
    const len = arrayBuffer.length;
    let last = arrayBuffer[0];
    let oscillations = 0;
    let seekingHigh = false;
    for (let i = 1; i < len; i++) {
      const value = arrayBuffer[i];
      if (value > last && value > 0) {
        if (!seekingHigh) {
          oscillations++;
        }
        seekingHigh = true;
      } else if (value < last && value < 0) {
        seekingHigh = false;
      }
      last = value;
    }
    const magicNumber = 23;
    return Math.round(oscillations * magicNumber);
  }

  getRgbColor() {
    const data = this.rgbBuffer;
    const chuckLength = data.length / 3;
    const arrayLike = [...this.rgbBuffer].map(e => Math.abs(e));
    const max = Math.max.apply(null, arrayLike);
    const min = Math.min.apply(null, arrayLike);
    let minIndex = arrayLike.indexOf(min);
    let maxIndex = arrayLike.indexOf(max);
    if (minIndex > maxIndex) {
      const temp = maxIndex;
      maxIndex = minIndex;
      minIndex = temp;
    }

    const distance = maxIndex - minIndex;
    const RGB_MAX = 255;
    const redRaw = [0, 0];
    const greenRaw = [0, 0];
    const blueRaw = [0, 0];
    for (let i = 0; i < arrayLike.length; i++) {
      const value = data[i];
      const setRed = i < chuckLength;
      const setGreen = i < chuckLength * 2 && i > chuckLength;
      const setBlue = i < chuckLength * 3 && i > chuckLength * 2;
      if (setRed) {
        redRaw[0] += value;
        redRaw[1]++;
      } else if (setGreen) {
        greenRaw[0] += value;
        greenRaw[1]++;
      } else if (setBlue) {
        blueRaw[0] += value;
        blueRaw[1]++;
      }
    }
    const sum = data.reduce((a, v) => a + v) + distance;
    const red = redRaw[0] / redRaw[1];
    const green = greenRaw[0] / greenRaw[1];
    const blue = blueRaw[0] / blueRaw[1];
    const r = Math.round(((red / this.maxValue) * RGB_MAX + sum) % 255);
    const g = Math.round(((green / this.maxValue) * RGB_MAX + sum + 64) % 255);
    const b = Math.round(((blue / this.maxValue) * RGB_MAX + distance + 64 * 2) % 255);

    if (sum < 255) {
      return { r: 0, g: 0, b: 0 };
    }
    //const r = sum % 255;
    //const g = sum + 64  % 255;
    //const b = sum + (64 * 2) % 255;
    //console.log(r, g, b)
    return { r, g, b };
  }
  // getBoostedRbgColours() {
  //   const {r, g, b} = this.getBoostedRbgColours();
  // }

  get bufferLength() {
    return this.merged.length;
  }
  noiseFreeArrayBuffer(maxAttempts = 8, range?: number, arrayBuffer?: Int16Array) {
    range = range ? range : this.maxValue * 0.1;
    arrayBuffer = arrayBuffer ? arrayBuffer : this.merged;
    const buff: number[] = [];
    let last = arrayBuffer[0];
    let attempt = 0;
    for (let i = 0; i < arrayBuffer.length; i++) {
      const value = arrayBuffer[i];
      if (this.isInRange(value, last, range)) {
        buff.push(value);
        last = value;
        attempt = 0;
      } else {
        attempt++;
        if (attempt > maxAttempts) {
          buff.push(value);
          last = value;
          attempt = 0;
        }
      }
    }

    const array = new Int16Array(buff.length);
    for (let i = 0; i < buff.length; i++) {
      array[i] = buff[i];
    }
    return array;
  }

  findPattern(size = 100, accuracy: "exact" | "low" | "medium" | "heigh" = "exact", array?: Int16Array) {
    array = array ? array : this.merged;
    const sample: number[] = [];
    for (let i = 0; i < size; i++) {
      sample.push(this.Int16Array[i]);
    }
    const match: number[] = [];
    let skip = 0;
    const lowChecker = this.maxValue * 0.25;
    const mediumChecker = this.maxValue * 0.15;
    const highChecker = this.maxValue * 0.5;

    for (let i = 0; i < this.Int16Array.length; i++) {
      const index = match.length - 1;
      if (match.length >= size) {
        const intArray = new Int16Array(match.length);
        for (let j = 0; j < match.length; j++) {
          intArray[j] = match[j];
        }
        return intArray;
      }
      const checker = sample[index];
      const looking = this.Int16Array[i];
      if (looking === checker) {
        match.push(checker);
        skip = 0;
      } else if (accuracy === "low" && this.isInRange(looking, checker, lowChecker)) {
        match.push(checker);
        skip = 0;
      } else if (accuracy === "medium" && this.isInRange(looking, checker, mediumChecker)) {
        match.push(checker);
        skip = 0;
      } else if (accuracy === "heigh" && this.isInRange(looking, checker, highChecker)) {
        match.push(checker);
        skip = 0;
      } else {
        if (skip > 4) {
          match.length = 0;
          skip = 0;
        }
        skip++;
      }
    }
    return this.Int16Array;
  }

  setSmoothSampling(value: number) {
    this.smoothingSize = value;
  }
  get smoothSampling() {
    return this.smoothingSize;
  }

  private isInRange(number: number, check: number, range: number) {
    return number <= check + range && number >= check - range;
  }

  private addNewValues(arrayBuffer: Int16Array) {
    if (this.smooth.length > this.smoothingSize) {
      this.smooth.shift();
    }
    this.smooth.push(arrayBuffer);
    if (this.amplify) {
      const max = Math.max.apply(Math, [...arrayBuffer]);
      const amplifySize = (this.maxValue - max) / this.maxValue;
      for (let i = 0; i < arrayBuffer.length; i++) {
        const value = arrayBuffer[i];
        if (value >= 0) {
          arrayBuffer[i] += max * amplifySize;
        } else {
          arrayBuffer[i] -= -(max * amplifySize);
        }
      }
    }
    let j = 0;
    let last = 0;
    for (let i = 0; i < this.Int16Array.length; i++) {
      if (this.smoothingSize === 0) {
        const value = arrayBuffer[i];
        this.Int16Array[i] = arrayBuffer[i];
        if (i % 2) {
          this.rightSpeaker[j] = value;
          last = value;
        } else {
          this.leftSpeaker[j] = value;
          this.merged[j] = (last + value) / 2;
          j++;
        }
        continue;
      }

      let sum = 0;
      const len = this.smooth.length;
      for (let j = 0; j < len; j++) {
        sum += this.smooth[j][i];
      }
      let value = 0;
      const result = Math.round(sum / len);
      if (!isNaN(result)) {
        value = result;
      }

      value = clamp(value, -this.maxValue, this.maxValue);

      this.Int16Array[i] = value;
      if (i % 2) {
        this.rightSpeaker[j] = value;
        last = value;
      } else {
        this.leftSpeaker[j] = value;
        this.merged[j] = (last + value) / 2;
        j++;
      }
    }
  }
}

import { AudioProcessor } from "./audioProcessor";
import { getRWithoutAlpha, MAX_RGB } from "./colour";
import { RGB } from "./interfaces";

export type SpeakerSide = "left" | "right" | "merged";

export class AudioAnalyser {
  private readonly MAX_RGB_VALUE = MAX_RGB;
  private maxHills = 0;
  private maxTotalXDistance = 0;
  private maxTotalYDistance = 0;
  private maxAvgXDistance = 0;
  private maxAvgYDistance = 0;
  private reds: number[] = [0];
  private greens: number[] = [0];
  private blues: number[] = [0];

  constructor(private audioProcessor: AudioProcessor, private memory = 10) {}

  getHills(speaker: SpeakerSide = "merged") {
    const arrayBuffer = this.getArrayBuffer(speaker);
    const len = arrayBuffer.length;
    let lastValue = arrayBuffer[0];
    const lastPos = {
      x: 0,
      y: arrayBuffer[0],
    };
    let hillCount = 0;
    let totalXDistance = 0;
    let totalYDistance = 0;
    let ascending = arrayBuffer[0] > arrayBuffer[1];
    for (let i = 1; i < len; i++) {
      const value = arrayBuffer[i];
      if (ascending) {
        if (lastValue < value) {
          hillCount++;
          totalXDistance += i - lastPos.x;
          let value1 = arrayBuffer[i];
          let value2 = lastPos.y;
          if (value1 < value2) {
            const temp = value2;
            value2 = value1;
            value1 = temp;
          }
          totalYDistance += value1 - value2;
          ascending = false;
          lastPos.x = i;
          lastPos.y = arrayBuffer[i];
        }
      } else {
        if (lastValue > value) {
          //hillCount++;
          ascending = true;
        }
      }
      lastValue = value;
    }
    if (this.maxHills < hillCount) {
      this.maxHills = hillCount;
    }
    if (this.maxTotalXDistance < totalXDistance) {
      this.maxTotalXDistance = totalXDistance;
    }
    if (this.maxTotalYDistance < totalYDistance) {
      this.maxTotalYDistance = totalYDistance;
    }
    const n = totalXDistance / hillCount;
    const avgXDistance = isNaN(n) ? 0 : n;
    if (this.maxAvgYDistance < avgXDistance) {
      this.maxAvgXDistance = avgXDistance;
    }

    const m = totalYDistance / hillCount;
    const avgYDistance = isNaN(m) ? 0 : m;
    if (this.maxAvgYDistance < avgYDistance) {
      this.maxAvgYDistance = avgYDistance;
    }

    return {
      hillCount,
      totalXDistance,
      totalYDistance,
      avgXDistance,
      avgYDistance,
    };
  }
  getRGB(): RGB {
    const { hillCount, avgXDistance, avgYDistance } = this.getHills();
    const green = hillCount / this.maxHills;
    const red = avgXDistance / this.maxAvgXDistance;
    const blue = avgYDistance / this.maxAvgYDistance;
    if (this.reds.length > this.memory) {
      this.reds.shift();
    }
    if (this.blues.length > this.memory) {
      this.blues.shift();
    }
    this.reds.push(red);
    if (this.reds.length > this.memory) {
      this.reds.shift();
    }
    this.blues.push(blue);

    if (this.greens.length > this.memory) {
      this.greens.shift();
    }
    this.greens.push(green);

    const avgR = this.reds.reduce((a, b) => a + b) / this.reds.length;
    const avgG = this.greens.reduce((a, b) => a + b) / this.greens.length;
    const avgB = this.blues.reduce((a, b) => a + b) / this.blues.length;

    const r = getRWithoutAlpha(Math.round(this.MAX_RGB_VALUE * avgR));
    const g = getRWithoutAlpha(Math.round(this.MAX_RGB_VALUE * avgG));
    const b = getRWithoutAlpha(Math.round(this.MAX_RGB_VALUE * avgB));
    return { r, g, b };
  }

  reset() {
    this.maxHills = 0;
  }

  private getArrayBuffer(speaker: SpeakerSide) {
    switch (speaker) {
      case "left":
        return this.audioProcessor.leftBuffer;
      case "right":
        return this.audioProcessor.rightBuffer;
      default:
        return this.audioProcessor.mergedBuffer;
    }
  }
}

import { AudioProcessor } from "./audioProcessor";
import { getRWithoutAlpha, hsv2rgb, MAX_RGB } from "./colour";
import { RGB } from "./interfaces";
import { FixAverage } from "../shared/Arrays";
import fjs from "frequencyjs";
import { memo } from "react";
export type SpeakerSide = "left" | "right" | "merged";
interface EJSData {
  frequency: number,
  amplitude: number

}

interface FJSResult extends Array<EJSData> {
  dominantFrequency(): EJSData;
  amplitudes(): number[];
  sampling: number;
}


export class AudioAnalyser {
  private readonly MAX_RGB_VALUE = MAX_RGB;
  private maxHills = 0;
  private maxTotalXDistance = 0;
  private maxTotalYDistance = 0;
  private maxAvgXDistance = 0;
  private maxAvgYDistance = 0;
  private reds: FixAverage;
  private greens: FixAverage;
  private blues: FixAverage;
  private sample: FixAverage;
  private offset = 0;
  private maxAmplitude = 1;

  constructor(private audioProcessor: AudioProcessor, private memory = 5) {
    this.reds = new FixAverage(memory);
    this.greens = new FixAverage(memory);
    this.blues = new FixAverage(memory);
    this.sample = new FixAverage(10);
  }

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
    const buffer = this.getArrayBuffer('merged')
    const sample = fjs.Transform.toSpectrum([...buffer],{sampling: 2048, method: 'dft'}) as FJSResult;
    const dom = sample.dominantFrequency();
    const amp = Math.round(dom.amplitude);

    if (this.maxAmplitude < amp) {
      this.maxAmplitude = amp;
    }
    this.sample.push(amp);
      
    const aSample = this.sample.getAvg();
    let zero = false;
    if (aSample < 50) { 
      this.maxAmplitude = aSample;
      zero = true;
    } else if (aSample > 50) {
      const offsetAdd = Math.round(aSample / 15000);
      this.offset = (this.offset + offsetAdd) % this.MAX_RGB_VALUE;  
    }

    let h = Math.round((aSample / this.maxAmplitude * 360) + this.offset) % 720;
    if (h > 360) {
      h = h - 360;
    }
    const color = hsv2rgb({h, v:zero ? 0: 1, s: zero ? 0 :1});
    const green = color.g;
    const red = color.r;
    const blue = color.b;

    this.blues.push(blue);
    this.reds.push(red);
    this.greens.push(green);

  //  console.log(r,g,b)
    return { r: this.reds.getAvg(), g: this.greens.getAvg(), b: this.blues.getAvg() };
  }

  getRGBCustom(): RGB {
    const { hillCount, avgXDistance, avgYDistance } = this.getHills();
    const green = hillCount / this.maxHills;
    const red = avgXDistance / this.maxAvgXDistance;
    const blue = avgYDistance / this.maxAvgYDistance;
    this.reds.push(red);
    this.blues.push(blue);
    this.greens.push(green);

    const r = getRWithoutAlpha(Math.round(this.MAX_RGB_VALUE * this.reds.getAvg()));
    const g = getRWithoutAlpha(Math.round(this.MAX_RGB_VALUE * this.greens.getAvg()));
    const b = getRWithoutAlpha(Math.round(this.MAX_RGB_VALUE * this.blues.getAvg()));
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

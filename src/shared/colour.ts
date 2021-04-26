import { clamp } from "lodash";
import { RGB, HSV } from "./interfaces";

export const MAX_RGB = 0xffffff;

export function componentToHex(c: number) {
    c = clamp(c, 0, 255);
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

export function rgb2hex(r: number, g: number, b: number) {
    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);

    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function rgbObj2Hex(obj: { r: number; g: number; b: number }) {
    return rgb2hex(obj.r, obj.g, obj.b);
}
/// h = <0, 360>; s, v = <0, 1>
export function hsv2rgb(hsv: HSV): RGB {
    let h = hsv.h;
    let s = hsv.s;
    let v = hsv.v;

    h = Math.max(0, Math.min(360, h === 360 ? 0 : h));
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));

    let r = v;
    let g = v;
    let b = v;

    if (s !== 0) {
        h /= 60;

        const i = Math.floor(h);
        const f = h - i;
        const p = v * (1 - s);
        const q = v * (1 - s * f);
        const t = v * (1 - s * (1 - f));

        switch (i) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            default:
                r = v;
                g = p;
                b = q;
        }
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}
export function getR(color: number) {
    return (color >> 24) & 0xff;
}

export function getG(color: number) {
    return (color >> 16) & 0xff;
}

export function getB(color: number) {
    return (color >> 8) & 0xff;
}

export function rgb2hsv(rgb: RGB): HSV {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    let h = 1;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;

    if (max !== min) {
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return { h: h * 360, s, v };
}

export function hex2rgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}

export function rgb2hsvRound(rgb: RGB) {
    let { h, s, v } = rgb2hsv(rgb);
    h = Math.round(h);
    s = Math.round(s * 100);
    v = Math.round(v * 100);
    return { h, s, v };
}

export function roundedHSV2rgb(hsv: HSV) {
    const s = clamp(hsv.s, 100) / 100;
    const v = clamp(hsv.v, 100) / 100;
    const h = clamp(hsv.h, 0, 360);
    return hsv2rgb({ h, s, v });
}

export function getRWithoutAlpha(colour: number) {
    return (colour >> 16) & 0xff;
}

export function getGWithoutAlpha(color: number) {
    return (color >> 8) & 0xff;
}

export function getBWithoutAlpha(color: number) {
    return (color >> 0) & 0xff;
}

export function colorToRGBA(color: number): RGB {
    return {
        r: getR(color),
        g: getG(color),
        b: getB(color),
    };
}

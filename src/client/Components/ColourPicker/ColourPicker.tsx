import React from "react";
import styled from "styled-components";
import { HSV, RGB } from "../../../shared/interfaces";
import { rgb2hex, hex2rgb, rgb2hsv, hsv2rgb } from "../../../shared/colour";
import { PreGenerateColourPickerPalette } from "./ColourPickerDataImages";
import { clamp } from "lodash";
import { cloneDeep } from "../../../shared/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

import * as namer from "color-namer-sdk";
const Div = styled.div`
  background: rgb(32, 32, 32);
  border-radius: 5px;
  padding: 10px;
  display: inline-block;
`;
const DivInputBoxes = styled.div`
  background: rgb(32, 32, 32);
  margin: 0px 0 0 5px;
  display: inline-block;
  vertical-align: top;
`;
const UnselectableSpan = styled.span`
  pointer-events: none;
  user-select: none;
`;
const DivInputBox = styled.div`
  display: block;
  margin-bottom: 1px;
`;
const InputColourBoxes = styled.input`
  background: rgb(41, 41, 41);
  color: white;
  border: 1px solid rgb(71, 71, 71);
  padding: 5px;
  width: 35px;
  display: inline-block;
  outline: none;
`;
const Popup = styled.div`
  pointer-events: none;
  user-select: none;
  background: transparent;
  border-radius: 5px;
  padding: 10px;
  display: inline;
  position: fixed;
  z-index: 9999999;
`;
const ColorPreview = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid black;
  border-radius: 100%;
  position: relative;
  z-index: 99;
`;
const ColourName = styled.span`
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  display: inline-block;
  bottom: 10px;
  font-size: 13px;
  left: -10px;
  padding: 3px;
  padding-left: 12px;
  position: relative;
  border-top-right-radius: 3px;
  border-bottom-right-radius: 6px;
`;

const ExitButtons = styled.div`
  position: absolute;
  display: inline-block;
  background-color: rgb(0, 0, 0);
  border-radius: 5px;
  top: -10px;
  left: -10px;
  padding: 5px;
  margin: 5px;
  text-align: center;
  align-items: center;
  button {
    color: white;
    background-color: transparent;
    border: none;
    outline: none;
  }
`;

export interface Colour {
  rgb: RGB;
  hsv: HSV;
  hex: string;
}

export interface ColourInputs {
  rgb: {
    r: string;
    g: string;
    b: string;
  };
  hsv: {
    h: string;
    s: string;
    v: string;
  };
  hex: string;
}

interface ColourPickerState {
  height?: number;
  width?: number;
  activeHSV: HSV;
  colour: Colour;
  inputs: ColourInputs;
}

interface ColourPickerProps {
  palette: PreGenerateColourPickerPalette;
  onChange?: (color: Colour) => void;
  onClose?: () => void;
  lifeUpdate?: boolean;
  height?: number;
  width?: number;
  colour?: string;
}

interface MockTouch {
  x: number;
  y: number;
}

type InputValue = "H" | "S" | "V" | "R" | "G" | "B" | "HEX";

export class ColourPicker extends React.Component<ColourPickerProps, ColourPickerState> {
  private readonly MAX_COLOUR_VALUE = 255;
  private main = React.createRef<HTMLCanvasElement>();
  private side = React.createRef<HTMLCanvasElement>();
  private _renderer = React.createRef<HTMLDivElement>();
  private preview = React.createRef<HTMLCanvasElement>();
  private mainPressed = false;
  private sidePressed = false;
  private ctxMain: CanvasRenderingContext2D;
  private ctxSide: CanvasRenderingContext2D;
  private ctxPreview: CanvasRenderingContext2D;
  private lastX = 0;
  private lastY = 0;
  private userSelectState = false;

  private isTouch = false;
  private touch: MockTouch = {
    x: 0,
    y: 0,
  };

  constructor(props: ColourPickerProps) {
    super(props);
    const defaultHex = "#FF0000";
    const rgb = hex2rgb(defaultHex);
    const hsv = rgb2hsv(rgb);
    const colour: Colour = {
      rgb,
      hsv,
      hex: defaultHex,
    };

    this.state = {
      height: props.height || this.MAX_COLOUR_VALUE,
      width: props.width || this.MAX_COLOUR_VALUE,
      activeHSV: { ...hsv },
      colour,
      inputs: this.getColourString(colour),
    };
  }

  componentDidMount() {
    this.ctxMain = this.canvas.getContext("2d");
    this.ctxSide = this.canvasSide.getContext("2d");
    this.ctxPreview = this.canvasPreview.getContext("2d");

    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);

    window.addEventListener("touchstart", this.onTouchStart);
    window.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("touchmove", this.onTouchMove);

    if (this.props.colour) {
      const result = hex2rgb(this.props.colour);
      if (result) {
        this.setNewColor(result);
        requestAnimationFrame(() => this.updateViews());
      }
    }

    this.updateViews();
  }

  componentWillUnmount() {
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);

    window.removeEventListener("touchstart", this.onTouchStart);
    window.removeEventListener("touchend", this.onTouchEnd);
    window.removeEventListener("touchmove", this.onTouchMove);
    this.userSelect(true);
  }

  private createMouseEventFromTouch(type: string, ev: TouchEvent) {
    const screenX = ev.touches[0] ? ev.touches[0].screenX : this.touch.x;
    const screenY = ev.touches[0] ? ev.touches[0].screenY : this.touch.y;
    const clientX = ev.touches[0] ? ev.touches[0].clientX : this.touch.x;
    const clientY = ev.touches[0] ? ev.touches[0].clientY : this.touch.y;
    const mouseEvent = new MouseEvent(type, {
      screenX,
      screenY,
      clientX,
      clientY,
      view: window,
    });
    return mouseEvent;
  }

  private onTouchStart = (ev: TouchEvent) => {
    const mev = this.createMouseEventFromTouch("mousedown", ev);
    this.onMouseDown(mev);
  };
  private onTouchMove = (ev: TouchEvent) => {
    const mev = this.createMouseEventFromTouch("mousemove", ev);
    this.touch.x = mev.x;
    this.touch.y = mev.y;
    this.onMouseMove(mev);
  };
  private onTouchEnd = (ev: TouchEvent) => {
    this.isTouch = !ev.isTrusted;
    const mev = this.createMouseEventFromTouch("mouseup", ev);
    this.onMouseUp(mev);
  };

  private onMouseUp = (ev: MouseEvent) => {
    this.isTouch = !ev.isTrusted;
    const shouldEmitChange = this.isPickingColour;
    this.mainPressed = false;
    this.sidePressed = false;
    if (shouldEmitChange) {
      this.forceUpdate();
      this.emitColour();
    }
    this.userSelect(true);
  };

  private onMouseMove = (ev: MouseEvent) => {
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;
    this.isTouch = !ev.isTrusted;
    if (this.mainPressed) {
      const { x, y, width, height } = this.getCanvasBounds();
      const calcX = clamp(ev.x - x, 0, width);
      const calcY = clamp(ev.y - y, 0, height);
      const v = Math.round(this.state.colour.hsv.v * this.palette.SV_MAX);
      const rgb = this.palette.getColourAt(calcX, calcY, v);
      this.setNewColor(rgb);
      this.emitColour(true);
    } else if (this.sidePressed) {
      const { y, height } = this.getCanvasSideBounds();
      const calcY = clamp(ev.y - y, 0, height);
      const hsv = this.state.colour.hsv;
      const h = hsv.h;
      const s = hsv.s * this.palette.SV_MAX;
      const rgb = this.palette.getSideColour(h, s, calcY);
      const colour = this.getColour(rgb);
      const inputs = this.getColourString(colour);
      this.setState({ activeHSV: { ...colour.hsv }, colour: colour, inputs });
      this.updateViews();
      this.emitColour(true);
    }
  };

  private onMouseDown = (ev: MouseEvent) => {
    const target = ev.target || document.elementFromPoint(ev.x, ev.y);

    if (target === this.canvas) {
      this.mainPressed = true;
      this.userSelect(false);
    } else if (target === this.canvasSide) {
      this.sidePressed = true;
      this.userSelect(false);
    }
  };

  private emitColour(liveUpdate?: boolean) {
    if (!this.props.onChange) {
      return;
    }
    if (this.props.lifeUpdate && liveUpdate) {
      this.props.onChange(cloneDeep(this.state.colour));
    } else if (!this.props.lifeUpdate && liveUpdate) {
      // Do nothing
    } else {
      this.props.onChange(cloneDeep(this.state.colour));
    }
  }

  private drawCanvas = () => {
    const ctx = this.ctxMain;
    const v = Math.round(this.state.activeHSV.v * this.palette.SV_MAX);
    const imageData = this.props.palette.getImageDataMain(v);
    ctx.putImageData(imageData, 0, 0);
    ctx.fillStyle = "#000000";
    const { width, height } = this.getCanvasBounds();
    const x = Math.round((this.state.colour.hsv.h / this.palette.H_MAX) * width);
    const y = Math.round(height - this.state.colour.hsv.s * height);

    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 4 * Math.PI);
    ctx.stroke();
  };

  private drawSide = () => {
    const ctx = this.ctxSide;
    const { width, height } = this.getCanvasSideBounds();
    const hsl = this.state.activeHSV;
    const h = Math.round(hsl.h);
    const s = Math.round(hsl.s * this.palette.SV_MAX);
    const v = Math.round(height - hsl.v * height);

    const imageData = this.palette.getImageDataSide(h, s);
    ctx.putImageData(imageData, 0, 0);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, v, width, 3);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, v + 1, width, 1);
  };

  private getColour(rgb: RGB): Colour {
    const hex = rgb2hex(rgb.r, rgb.g, rgb.b);
    const hsv = rgb2hsv(rgb);
    return { rgb, hsv, hex };
  }
  private getColourString(color: Colour): ColourInputs {
    return {
      hex: color.hex.replace(/#/g, ""),
      hsv: {
        h: Math.round(color.hsv.h).toString(),
        s: Math.round(color.hsv.s * this.palette.SV_MAX).toString(),
        v: Math.round(color.hsv.v * this.palette.SV_MAX).toString(),
      },
      rgb: {
        r: color.rgb.r.toString(),
        b: color.rgb.b.toString(),
        g: color.rgb.g.toString(),
      },
    };
  }

  private updateViews() {
    this.drawCanvas();
    this.drawSide();
    this.drawPreview();
  }

  private setNewColor(rgb: RGB) {
    const colour = this.getColour(rgb);
    const inputs = this.getColourString(colour);
    const hsv = { ...colour.hsv };
    this.setState({ colour, inputs, activeHSV: hsv });
    this.updateViews();
  }

  private drawPreview() {
    const ctx = this.ctxPreview;
    const { width, height } = this.getCanvasPreviewBounds();
    ctx.fillStyle = this.state.colour.hex;
    ctx.fillRect(0, 0, width, height);
  }

  private get canvas() {
    return this.main.current;
  }
  private get canvasSide() {
    return this.side.current;
  }
  private get canvasPreview() {
    return this.preview.current;
  }
  private get palette() {
    return this.props.palette;
  }

  private getCanvasSideBounds() {
    return this.canvasSide.getBoundingClientRect();
  }
  private getCanvasBounds() {
    return this.canvas.getBoundingClientRect();
  }
  private getCanvasPreviewBounds() {
    return this.canvasPreview.getBoundingClientRect();
  }

  private onInputChange(type: "H" | "S" | "V" | "R" | "G" | "B" | "HEX", value: string) {
    if (type !== "HEX") {
      value = parseInt(value.replace(/\D/g, "")).toString();
    }
    let number = parseInt(value);
    if (isNaN(number)) {
      number = 0;
    }
    const inputs = { ...this.state.inputs };
    switch (type) {
      case "R":
        const rgb = { ...this.state.colour.rgb };
        rgb.r = number;
        this.setNewColor(rgb);
        return;
      case "G":
        const rgb2 = { ...this.state.colour.rgb };
        rgb2.g = number;
        this.setNewColor(rgb2);
        return;
      case "B":
        const rgb3 = { ...this.state.colour.rgb };
        rgb3.g = number;
        this.setNewColor(rgb3);
        return;
      case "H":
        const hsv = { ...this.state.colour.hsv };
        hsv.h = number;
        this.setNewColor(hsv2rgb(hsv));
        return;
      case "S":
        const hsv2 = { ...this.state.colour.hsv };
        hsv2.s = number / this.palette.SV_MAX;
        this.setNewColor(hsv2rgb(hsv2));
        return;
      case "V":
        const hsv3 = { ...this.state.colour.hsv };
        hsv3.v = number / this.palette.SV_MAX;
        this.setNewColor(hsv2rgb(hsv3));
        return;
      case "HEX":
        const result = hex2rgb(value);
        if (result) {
          this.setNewColor(result);
          return;
        } else {
          inputs.hex = value;
        }
        break;

      default:
        break;
    }
    this.setState({ inputs });
  }

  private userSelect(enable: boolean) {
    if (this.userSelectState === enable) {
      return;
    }
    if (enable) {
      document.body.style.userSelect = "";
    } else {
      document.body.style.userSelect = "none";
    }

    this.userSelectState = enable;
  }
  private get isPickingColour() {
    return this.mainPressed || this.sidePressed;
  }

  private get renderPopup() {
    if (!this.isPickingColour) {
      return null;
    }

    const diff = this.isTouch ? 90 : 30;
    let name = namer(this.state.colour.hex).basic[0].name;
    name = `${name[0].toUpperCase()}${name.substring(1)}`;
    const style: React.CSSProperties = {
      left: `${this.lastX}px`,
      top: `${this.lastY - diff}px`,
    };
    const styleColor: React.CSSProperties = {
      backgroundColor: `${this.state.colour.hex}`,
    };

    return (
      <Popup style={style}>
        <div>
          <ColorPreview style={styleColor}></ColorPreview>
          <ColourName>{name}</ColourName>
        </div>
      </Popup>
    );
  }

  private input(type: InputValue, displayedValue: string, value: string, larger = false) {
    const style: React.CSSProperties = larger ? { width: "60px" } : null;

    return (
      <DivInputBox>
        <UnselectableSpan>{displayedValue} </UnselectableSpan>
        <InputColourBoxes
          style={style}
          onChange={e => this.onInputChange(type, e.target.value)}
          type='text'
          value={value}
        />
      </DivInputBox>
    );
  }
  private get exitButtons() {
    if (!this.props.onClose) {
      return null;
    }
    return (
      <ExitButtons>
        <button onClick={this.props.onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </ExitButtons>
    );
  }
  get renderer() {
    return this._renderer;
  }

  render() {
    const i = this.state.inputs;
    return (
      <Div ref={this._renderer} style={{ width: `390px`, height: `270px` }}>
        {this.exitButtons}
        {this.renderPopup}
        <canvas ref={this.main} height={this.state.height} width={this.state.width}></canvas>
        <canvas style={{ marginLeft: "5px" }} ref={this.side} height={this.state.height} width={25}></canvas>
        <DivInputBoxes>
          <canvas ref={this.preview} height={50} width={50}></canvas>

          {this.input("H", "H", i.hsv.h)}
          {this.input("S", "S", i.hsv.s)}
          {this.input("V", "V", i.hsv.v)}

          <br />
          {this.input("R", "R", i.rgb.r)}
          {this.input("G", "G", i.rgb.g)}
          {this.input("B", "B", i.rgb.b)}

          {this.input("HEX", "#", i.hex, true)}
        </DivInputBoxes>
      </Div>
    );
  }
}

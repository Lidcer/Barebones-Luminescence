import React from "react";
import styled from "styled-components";
import { hex2rgb, rgb2hex } from "../../../shared/colour";
import { RGB } from "../../../shared/interfaces";
import { Colour, ColourPicker } from "../ColourPicker/ColourPicker";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";

const Canvas = styled.canvas`
  margin: 5px;
  border: 2px solid black;
  border-radius: 5px;
  touch-action: none;
`;

const Div = styled.div`
  cursor: pointer;
  display: inline-block;
  width: 70px;
  display: flex;
`;

const Input = styled.input`
  outline: none;
  margin-top: 8px;
  width: 72px !important;
  border-radius: 5px;
  height: 20px;
  padding: 0px;
  border: 2px solid black;

  ::disabled {
    border: 2px solid gray;
  }
`;

const FixedDix = styled.div`
  position: fixed;
  z-index: 9999;
`;

export type ColourSetterType = "read" | "set" | "read-set";
export type OnChangeEventType = "change" | "click";

interface ColourSetterProps {
  colour?: string;
  colourRGB?: RGB;
  palette: PreGenerateColourPickerPalette;
  onChange: (event: OnChangeEventType, colour: string) => void;
  width?: number;
  height?: number;
  mode?: ColourSetterType;
  renderInput?: boolean;
}

interface ColourSetterState {
  mode?: ColourSetterType;
  colour: string;
  width?: number;
  height?: number;
  input?: string;
  inputValid: boolean;
  colourPicker?: boolean;
  x: number;
  y: number;
}

export class ColourSetter extends React.Component<ColourSetterProps, ColourSetterState> {
  private HOLD = 1000;
  private _renderer = React.createRef<HTMLDivElement>();
  private canvasRef = React.createRef<HTMLCanvasElement>();
  private ref = React.createRef<HTMLDivElement>();
  private refColourPicker = React.createRef<ColourPicker>();
  private crx: CanvasRenderingContext2D;
  private onBoxClick = false;
  private touchStart: number | undefined = undefined;
  private destroyed = false;

  constructor(props: ColourSetterProps) {
    super(props);
    const rgb = props.colourRGB || hex2rgb(this.props.colour);
    const colour = rgb2hex(rgb.r, rgb.g, rgb.b);
    this.state = {
      height: this.props.height || 25,
      width: this.props.width || 50,
      colour: colour,
      input: colour,
      colourPicker: false,
      mode: this.props.mode || "set",
      inputValid: true,
      x: 0,
      y: 0,
    };
  }

  componentDidUpdate(props: ColourSetterProps) {
    if (props.colour && props.colour !== this.props.colour) {
      const hex = props.colour;
      this.setState({ colour: hex, input: hex });
      requestAnimationFrame(this.draw);
    } else if (
      props.colourRGB &&
      (props.colourRGB.r !== this.props.colourRGB.r ||
        props.colourRGB.g !== this.props.colourRGB.g ||
        props.colourRGB.b !== this.props.colourRGB.b)
    ) {
      const { r, g, b } = this.props.colourRGB;
      const hex = rgb2hex(r, g, b);
      this.setState({ colour: hex, input: hex });
      requestAnimationFrame(this.draw);
    }
  }

  componentDidMount() {
    this.crx = this.canvas.getContext("2d");
    this.draw();
    window.addEventListener("resize", this.onUpdate);
    window.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("click", this.onAnyClick);
  }

  componentWillUnmount() {
    this.destroyed = true;
    this.clearTimeout();
    window.removeEventListener("resize", this.onUpdate);
    window.removeEventListener("click", this.onAnyClick);
    window.removeEventListener("touchend", this.onTouchEnd);
  }

  onAnyClick = (ev: MouseEvent) => {
    if (this.onBoxClick || !this.colourPickerRef || !this.state.colourPicker) {
      this.onBoxClick = false;
      return;
    }
    const ref = this.refColourPicker.current.renderer.current;
    const div = ev.target as HTMLDivElement;

    if (!div.contains) return;
    if (div.contains(ref) || !ref.contains(div)) {
      this.setState({ colourPicker: false });
      this.props.onChange("change", this.state.colour);
    }
  };

  onTouchEnd = () => {
    this.clearTimeout();
  };

  onTouchStart = (ev: React.TouchEvent<HTMLCanvasElement>) => {
    ev.preventDefault();
    this.clearTimeout();
    this.touchStart = setTimeout(() => {
      this.openColourPicker();
    }, this.HOLD);
  };

  onUpdate = () => {
    if (!this.colourPickerRef) {
      return;
    }
    const div = this.colourPickerRef;
    const refBounds = this.ref.current.getBoundingClientRect();
    const divBounds = div.getBoundingClientRect();

    const offset = 10;
    let newX = Math.round(refBounds.x + refBounds.width * 0.5);
    let newY = Math.round(refBounds.y + refBounds.height * 0.5);
    if (window.innerWidth < newX + divBounds.width - offset) {
      newX = window.innerWidth - divBounds.width - offset;
    }
    if (window.innerHeight < newY + divBounds.height - offset) {
      newY = window.innerWidth - divBounds.height - offset;
    }

    this.setState({ x: newX, y: newY });
  };

  draw = () => {
    if (!this.canvas) return;
    const crx = this.crx;
    const { width, height } = this.canvas.getBoundingClientRect();
    crx.fillStyle = this.state.colour;
    crx.fillRect(0, 0, width, height);
  };

  clearTimeout = () => {
    if (this.touchStart) {
      clearTimeout(this.touchStart);
      this.touchStart = undefined;
    }
  };

  onClick = (ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const c = this.props.onChange;
    if (this.props.mode === "read" || this.props.mode === "read-set") {
      if (c) {
        return c("click", this.state.colour);
      }
    }

    this.openColourPicker();
  };

  onContext = (ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const c = this.props.onChange;
    if (this.props.mode === "read-set") {
      ev.preventDefault();
      this.openColourPicker();
    }
  };

  openColourPicker() {
    this.onBoxClick = true;
    if (!this.state.colourPicker) {
      this.setState({ colourPicker: true });
      requestAnimationFrame(this.onUpdate);
    }
  }

  get colourPicker() {
    if (!this.state.colourPicker) {
      return null;
    }
    const onChange = (ev: Colour) => {
      const colour = ev.hex;
      const input = colour;
      this.setState({ colour, input });
      this.draw();
    };

    const onExit = () => {
      this.setState({ colourPicker: false });
    };

    return (
      <FixedDix style={{ left: `${this.state.x}px`, top: `${this.state.y}px` }}>
        <ColourPicker ref={this.refColourPicker} palette={this.props.palette} onChange={onChange} onClose={onExit} />
      </FixedDix>
    );
  }
  get input() {
    if (!this.props.renderInput) return null;
    const readOnly = this.props.mode === "read";
    const onChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
      if (this.props.mode === "read") {
        return;
      }
      const hex = ev.target.value;
      const rgb = hex2rgb(hex);
      if (rgb) {
        const corrected = hex.startsWith("#") ? hex : `#${hex}`;
        this.setState({ colour: corrected, input: corrected, inputValid: true });
        requestAnimationFrame(() => {
          if (!this.destroyed) {
            this.props.onChange("change", this.state.colour);
            this.draw();
          }
        });
      } else {
        this.setState({ input: hex, inputValid: false });
      }
    };

    const style: React.CSSProperties = this.state.inputValid
      ? { border: "3px solid transparent" }
      : { border: "3px solid red" };

    return (
      <Input
        title={"Colour hex"}
        style={style}
        type='text'
        maxLength={7}
        value={this.state.input}
        onChange={onChange}
        readOnly={readOnly}
      />
    );
  }

  get colourPickerRef() {
    if (!this.refColourPicker || !this.refColourPicker.current || !this.refColourPicker.current.renderer.current) {
      return null;
    }
    return this.refColourPicker.current.renderer.current;
  }

  get renderer() {
    return this._renderer;
  }

  get canvas() {
    return this.canvasRef.current;
  }

  render() {
    return (
      <Div ref={this.ref} style={this.props.renderInput ? { width: "190px" } : {}}>
        {this.colourPicker}
        <Canvas
          ref={this.canvasRef}
          onClick={this.onClick}
          onTouchStart={this.onTouchStart}
          onContextMenu={this.onContext}
          height={this.state.height}
          width={this.state.width}
        />
        {this.input}
      </Div>
    );
  }
}

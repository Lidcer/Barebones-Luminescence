import React from "react";
import { rgbObj2Hex } from "../../../shared/colour";
import { LedPattern } from "../../../shared/interfaces";
import { PatternAnimator } from "../../../shared/PatternAnimator";

interface PatternPreviewProps {
  width: number;
  height: number;
  ledPattern: LedPattern;
}
interface PatternPreviewState {}

export class PatternPreview extends React.Component<PatternPreviewProps, PatternPreviewState> {
  private ref = React.createRef<HTMLCanvasElement>();
  private frame: number;
  private ctx: CanvasRenderingContext2D;
  private patternAnimator = new PatternAnimator();
  private isEnabled = true;

  constructor(props: PatternPreviewProps) {
    super(props);
  }
  componentDidMount() {
    this.patternAnimator.loadPattern(this.props.ledPattern);
    this.patternAnimator.start();
    this.ctx = this.canvas.getContext("2d");
    this.frame = requestAnimationFrame(() => {
      this.draw();
      this.isEnabled = false;
    });
  }
  componentWillUnmount() {
    this.patternAnimator.destroy();
    cancelAnimationFrame(this.frame);
  }
  componentDidUpdate() {
    if (!this.patternAnimator.isPatternActive(this.props.ledPattern)) {
      this.patternAnimator.loadPattern(this.props.ledPattern);
    }
  }
  draw = () => {
    if (this.isEnabled) {
      const { width, height } = this.canvas.getBoundingClientRect();
      this.ctx.fillStyle = rgbObj2Hex(this.patternAnimator.state);
      this.ctx.fillRect(0, 0, width, height);
    }
    this.frame = requestAnimationFrame(this.draw);
  };

  get canvas() {
    return this.ref.current;
  }
  render() {
    return (
      <canvas
        ref={this.ref}
        width={this.props.width}
        height={this.props.height}
        onMouseEnter={() => {
          this.patternAnimator.reset();
          this.isEnabled = true;
        }}
        onMouseLeave={() => {
          this.patternAnimator.reset();
          this.draw();
          this.isEnabled = false;
        }}
      />
    );
  }
}

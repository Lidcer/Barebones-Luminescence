import React from "react";

interface BaseCanvasProps {
    height: number;
    width: number;
    canvasStyle?: React.CSSProperties;
}

interface BaseCanvasState {}

export class BaseCanvas<P extends BaseCanvasProps, S extends BaseCanvasState, SS = any> extends React.Component<
    P,
    S,
    SS
> {
    private ref = React.createRef<HTMLCanvasElement>();
    public _ctx: CanvasRenderingContext2D = null;
    constructor(props: P) {
        super(props);
    }

    get ctx(): CanvasRenderingContext2D {
        if (!this._ctx) {
            this._ctx = this.canvas.getContext("2d");
        }
        return this._ctx;
    }
    clear() {
        const { width, height } = this.canvasBounds;
        this.ctx.clearRect(0, 0, width, height);
    }
    get canvas() {
        return this.ref.current;
    }
    get canvasBounds() {
        const width = this.ref.current.width;
        const height = this.ref.current.height;
        return { width, height };
    }
    render() {
        const css = this.props.canvasStyle;
        return <canvas ref={this.ref} style={css} height={this.props.height} width={this.props.width}></canvas>;
    }
}

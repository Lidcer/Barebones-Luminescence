import React from "react";
import styled from "styled-components";
import { rgb2hex } from "../../../shared/colour";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { ControllerMode, RGB } from "../../../shared/interfaces";
import { Logger } from "../../../shared/logger";

const H1 = styled.h1`
    display: inline-block;
`;
const Canvas = styled.canvas`
    margin: 10px 10px 0px 10px;
    border: 2px solid black;
    border-radius: 5px;
`;

interface ColourTitleProps {
    als: AudioLightSystem;
}

interface ColourTitleState {}

export class ColourTitle extends React.Component<ColourTitleProps, ColourTitleState> {
    private readonly title = "Light controller";
    private ref = React.createRef<HTMLCanvasElement>();
    private crx: CanvasRenderingContext2D;
    private canvasSize = 25;
    private destroyed = false;
    private favIconReference: HTMLLinkElement;
    async componentDidMount() {
        const lightSocket = this.props.als.lightSocket;
        this.crx = this.canvas.getContext("2d");
        lightSocket.clientSocket.on("rgb-update", this.onRGBUpdate);
        lightSocket.clientSocket.on("mode-update", this.onModeUpdate);
        this.favIconReference = document.createElement("link");
        document.head.append(this.favIconReference);
        this.favIconReference.rel = "shortcut icon";

        if (this.props.als.lightSocket.clientSocket.connected) {
            this.onSocketConnect();
        } else {
            this.props.als.lightSocket.clientSocket.on("connect", this.onSocketConnect);
        }
    }

    componentWillUnmount() {
        this.destroyed = true;
        this.props.als.lightSocket.clientSocket.off("rgb-update", this.onRGBUpdate);
        this.props.als.lightSocket.clientSocket.off("mode-update", this.onModeUpdate);
        this.props.als.lightSocket.clientSocket.off("connect", this.onSocketConnect);
        document.head.removeChild(this.favIconReference);
    }

    onSocketConnect = async () => {
        const lightSocket = this.props.als.lightSocket;
        try {
            const mode = await lightSocket.emitPromiseIfPossible<ControllerMode, []>("mode-get");
            const rgb = await lightSocket.emitPromiseIfPossible<RGB, []>("rgb-status");
            if (this.destroyed) {
                return;
            }
            this.onModeUpdate(mode);
            this.onRGBUpdate(rgb);
        } catch (error) {
            Logger.debug("Socket error", error);
        }
    }

    onModeUpdate = (mode: ControllerMode) => {
        document.title = `${this.title} (${mode})`;
    };

    onRGBUpdate = (rgb: RGB) => {
        if (this.destroyed) return;
        if (!this.crx) return;
        const red = rgb.r;
        const green = rgb.g;
        const blue = rgb.b;

        const h = this.canvas.height;
        const w = this.canvas.width;
        this.crx.fillStyle = rgb2hex(red, green, blue);
        this.crx.fillRect(0, 0, w, h);
        const dataUrl = this.crx.canvas.toDataURL();
        this.favIconReference.href = dataUrl;
    };

    get canvas() {
        return this.ref.current;
    }

    render() {
        return (
            <div>
                <Canvas ref={this.ref} height={this.canvasSize} width={this.canvasSize} />
                <H1>Light Controller</H1>
            </div>
        );
    }
}

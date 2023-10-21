import React from "react";
import styled from "styled-components";
import { rgb2hex } from "../../../shared/colour";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { ControllerMode, RGB, modeToString } from "../../../shared/interfaces";
import { Logger } from "../../../shared/logger";
import { ClientMessagesRaw, ServerMessagesRaw, SpecialEvents } from "../../../shared/Messages";

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
    private readonly title = "LumiFlex";
    private ref = React.createRef<HTMLCanvasElement>();
    private crx: CanvasRenderingContext2D;
    private canvasSize = 25;
    private destroyed = false;
    private favIconReference: HTMLLinkElement;
    async componentDidMount() {
        const lightSocket = this.props.als.lightSocket;
        this.crx = this.canvas.getContext("2d");
        lightSocket.on("rgb-update", this.onRGBUpdate);
        lightSocket.on("mode-update", this.onModeUpdate);
        this.favIconReference = document.createElement("link");
        document.head.append(this.favIconReference);
        this.favIconReference.rel = "shortcut icon";

        const connected = this.props.als.lightSocket.clientSocket.connected;
        if (connected) {
            this.onSocketConnect();
        } else {
            this.props.als.lightSocket.clientSocket.clientHandle.on(SpecialEvents.Connect, this.onSocketConnect);
        }
    }

    componentWillUnmount() {
        this.destroyed = true;
        //this.props.als.lightSocket.clientSocket.off("rgb-update", this.onRGBUpdate);
        //this.props.als.lightSocket.clientSocket.off("mode-update", this.onModeUpdate);
        //this.props.als.lightSocket.clientSocket.off("connect", this.onSocketConnect);
        document.head.removeChild(this.favIconReference);
    }

    onSocketConnect = async () => {
        const lightSocket = this.props.als.lightSocket;
        try {
            const modeBuffer = await lightSocket.emitPromiseIfPossible(ServerMessagesRaw.ModeGet);
            const rgb = await lightSocket.emitPromiseIfPossible(ServerMessagesRaw.RGBGet);
            if (this.destroyed) {
                return;
            }
            this.onModeUpdate(modeBuffer.getUint8());
            const r = rgb.getUint8();
            const g = rgb.getUint8();
            const b = rgb.getUint8();
            this.onRGBUpdate({ r, g, b });
        } catch (error) {
            Logger.debug("Socket error", error);
        }
    };

    onModeUpdate = (mode: ControllerMode) => {
        document.title = `${this.title} (${modeToString(mode)})`;
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
                <H1>LumiFlex</H1>
            </div>
        );
    }
}

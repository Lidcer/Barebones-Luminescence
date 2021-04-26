import { AudioLightSystem, AudioUpdateResult } from "../../Utils/AudioSystem";
import { BaseCanvas } from "../CanvasBase/CanvasBase";

interface AVLProps {
    height: number;
    width: number;
    audioSystem: AudioLightSystem;
}

interface AVLState {}
//A bit slower
export class AudioVisualizerLineExtended extends BaseCanvas<AVLProps, AVLState> {
    private multipliedSize = 32;
    private totalLength = -1;
    private frame: number;
    private arrayBuffer = new Int16Array(0);

    constructor(props: AVLProps) {
        super(props);
        (window as any).s = this;
    }

    componentDidMount() {
        this.frame = requestAnimationFrame(this.draw);
        this.props.audioSystem.on("audioUpdate", this.audioUpdate);
    }
    componentWillUnmount() {
        cancelAnimationFrame(this.frame);
        this.props.audioSystem.off("audioUpdate", this.audioUpdate);
    }

    audioUpdate = (update: AudioUpdateResult) => {
        const buffer = update.mergedBuffer;
        this.totalLength = buffer.length * this.multipliedSize;
        if (this.arrayBuffer.length !== this.totalLength) {
            const old = this.arrayBuffer;
            this.arrayBuffer = new Int16Array(this.totalLength);
            for (let i = 0; i < old.length; i++) {
                this.arrayBuffer[i] = old[i];
            }
        }

        const len = buffer.length;
        for (let i = 0; i < this.arrayBuffer.length - len; i++) {
            this.arrayBuffer[i] = this.arrayBuffer[i + len];
        }

        const moveLen = this.arrayBuffer.length - len;
        for (let i = 0; i < moveLen; i++) {
            this.arrayBuffer[i] = this.arrayBuffer[i + len];
        }

        for (let i = 0; i < buffer.length; i++) {
            this.arrayBuffer[i + moveLen] = buffer[i];
        }
    };
    draw = () => {
        this.clear();
        this.drawBuffer(this.arrayBuffer, "black");
        this.frame = requestAnimationFrame(this.draw);
    };

    drawBuffer(data: ArrayLike<number>, color: string) {
        const { height, width } = this.canvasBounds;
        const half = height * 0.5;
        const widthDraw = width / data.length;
        const max = this.audioProcessor.maxValue * 0.8;
        const ctx = this.ctx;
        ctx.fillStyle = color;
        const lastPos = {
            x: 0,
            y: half,
        };
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            const drawHeight = half * (value / max);
            ctx.beginPath();
            const x = i * widthDraw;
            const y = half - drawHeight;

            ctx.moveTo(lastPos.x, lastPos.y);
            ctx.lineTo(x, y);

            lastPos.x = x;
            lastPos.y = y;
            ctx.stroke();
            //this.ctx.fillRect(i * widthDraw, height - drawHeight, widthDraw, drawHeight);
        }
    }

    get audioProcessor() {
        return this.props.audioSystem.audioProcessor;
    }
}

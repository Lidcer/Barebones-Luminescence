import { AudioAnalyser } from "../../../shared/audioAnalyser";
import { FixAverage } from "../../../shared/Arrays";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { BaseCanvas } from "../CanvasBase/CanvasBase";

interface AVLProps {
    height: number;
    width: number;
    audioSystem: AudioLightSystem;
    audioAnalyser: AudioAnalyser;
}

interface AVLState {
    forceDrawEveryThing: boolean;
    drawFps: boolean;
}

export class AudioVisualizerLine extends BaseCanvas<AVLProps, AVLState> {
    private readonly MAX_DRAW_TIME = 500;
    private frame: number;
    private last = performance.now();
    private framesDrawn = 0;
    private fps = 0;
    private maxDraw = -1;
    private lowFPSCount = 0;
    private bufferLen = 0;
    private MAX_AVG = 100;

    private avg = {
        hillCount: new FixAverage(this.MAX_AVG),
        totalXDistance: new FixAverage(this.MAX_AVG),
        totalYDistance: new FixAverage(this.MAX_AVG),
        avgXDistance: new FixAverage(this.MAX_AVG),
        avgYDistance: new FixAverage(this.MAX_AVG),
    };

    constructor(props: AVLProps) {
        super(props);
        this.state = {
            forceDrawEveryThing: false,
            drawFps: true,
        };
    }

    componentDidMount() {
        this.frame = requestAnimationFrame(this.draw);
    }
    componentWillUnmount() {
        cancelAnimationFrame(this.frame);
    }

    filterData(array: Int8Array, samples: number) {
        const blockSize = Math.floor(array.length / samples); // the number of samples in each subdivision
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i; // the location of the first sample in the block
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum = sum + Math.abs(array[blockStart + j]); // find the sum of all the samples in the block
            }
            filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
        }
        return filteredData;
    }

    draw = () => {
        const audioProcessor = this.props.audioSystem.audioProcessor;
        const now = performance.now();
        if (now - this.last - 1000) {
            this.fps = Math.round((this.framesDrawn * 1000) / (now - this.last));
            this.framesDrawn = 0;
            this.last = now;
            if (!this.state.forceDrawEveryThing && this.fps < 15) {
                this.lowFPSCount++;
                if (this.lowFPSCount > 5) {
                    this.lowFPSCount = 0;
                    if (this.maxDraw === -1) {
                        this.maxDraw = Math.round(audioProcessor.mergedBuffer.length * 0.7);
                    } else {
                        this.maxDraw = Math.round(this.maxDraw * 0.7);
                    }
                }
            } else {
                this.lowFPSCount = 0;
            }
        }

        if (audioProcessor.mergedBuffer.length !== this.bufferLen) {
            this.maxDraw = -1;
            this.lowFPSCount = 0;
            this.bufferLen = audioProcessor.mergedBuffer.length;
        }

        this.clear();

        this.ctx.fillStyle = "#FFFFFF10";
        const { width, height } = this.canvasBounds;
        this.ctx.fillRect(0, 0, width, height);

        //draw middle line
        const half = height * 0.5;
        this.ctx.strokeStyle = "#00000064";
        this.ctx.moveTo(0, half);
        this.ctx.lineTo(width, half);
        this.ctx.stroke();

        this.drawBuffer(audioProcessor.leftBuffer, "blue");
        this.drawBuffer(audioProcessor.rightBuffer, "orange");
        this.drawBuffer(audioProcessor.mergedBuffer, "#000000FF");
        //this.drawBuffer(audioProcessor.rgbBuffer, 'red');
        this.ctx.fillStyle = "#FFFFFFFF";
        this.ctx.font = "12px serif";
        this.ctx.fillText(`FPS:   ${this.fps}`, 10, 20);
        const hills = this.props.audioAnalyser.getHills();

        this.avg.avgXDistance.push(hills.hillCount);
        this.avg.totalXDistance.push(hills.totalXDistance);
        this.avg.totalYDistance.push(hills.totalYDistance);
        this.avg.avgXDistance.push(hills.avgXDistance);
        this.avg.avgYDistance.push(hills.avgYDistance);

        this.ctx.fillText(`Hills: ${Math.round(this.avg.avgXDistance.getAvg())}`, 10, 32);
        this.ctx.fillText(`XDist: ${Math.round(this.avg.totalXDistance.getAvg())}`, 10, 44);
        this.ctx.fillText(`YDist: ${Math.round(this.avg.totalYDistance.getAvg())}`, 10, 56);
        this.ctx.fillText(`XAvg: ${Math.round(this.avg.avgXDistance.getAvg())}`, 10, 68);
        this.ctx.fillText(`YAvg: ${Math.round(this.avg.avgYDistance.getAvg())}`, 10, 80);
        this.framesDrawn++;
        this.frame = requestAnimationFrame(this.draw);
    };

    drawBuffer(data: ArrayLike<number>, color: string) {
        const { height, width } = this.canvasBounds;
        const half = height * 0.5;
        const drawingLen = this.maxDraw === -1 ? data.length : this.maxDraw;
        const len = this.state.forceDrawEveryThing ? data.length : drawingLen;

        const widthDraw = width / len;
        const max = this.audioProcessor.maxValue * 0.8;
        const ctx = this.ctx;
        ctx.strokeStyle = color;
        const lastPos = {
            x: 0,
            y: half,
        };
        for (let i = 0; i < len; i++) {
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

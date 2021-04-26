import { AudioLightSystem } from "../../Utils/AudioSystem";
import { AudioAnalyser } from "../../../shared/audioAnalyser";
import { BaseCanvas } from "../CanvasBase/CanvasBase";

interface AVHProps {
    height: number;
    width: number;
    audioSystem: AudioLightSystem;
    audioAnalyser: AudioAnalyser;
}

interface AVHState {}

export class AudioVisualizerHills extends BaseCanvas<AVHProps, AVHState> {
    private frame: number;

    constructor(props: AVHProps) {
        super(props);
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
        this.clear();
        const audioProcessor = this.props.audioSystem.audioProcessor;

        //this.drawBuffer(audioProcessor.leftBuffer, 'blue');
        //this.drawBuffer(audioProcessor.rightBuffer, 'orange');
        this.drawBuffer(audioProcessor.mergedBuffer, "#000000a1");
        //this.drawBuffer(audioProcessor.rgbBuffer, '#000000a1');

        this.frame = requestAnimationFrame(this.draw);
    };

    drawBuffer(data: ArrayLike<number>, color: string) {
        const { height, width } = this.canvasBounds;
        const widthDraw = width / data.length;
        const max = this.audioProcessor.maxValue * 0.8;
        this.ctx.fillStyle = color;
        for (let i = 0; i < data.length; i++) {
            const value = Math.abs(data[i]);
            const drawHeight = height * (value / max);
            this.ctx.fillRect(i * widthDraw, height - drawHeight, widthDraw, drawHeight);
        }
    }

    get audioProcessor() {
        return this.props.audioSystem.audioProcessor;
    }
}

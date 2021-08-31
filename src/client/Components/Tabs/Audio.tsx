import React from "react";
import styled from "styled-components";
import {
    ActiveDevice,
    ControllerMode,
    RtAudioDeviceInf,
    AudioDeviceUpdate,
    AudioUpdateInternalProcessing,
    AudioApiUpdate,
} from "../../../shared/interfaces";
import { Logger } from "../../../shared/logger";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { AudioVisualizerLine } from "../AudioVisualizer/AudioLine";
import { AudioAnalyser } from "../../../shared/audioAnalyser";
import ReactLoading from "react-loading";
import { CheckBox } from "../CheckBox/Checkbox";
const Div = styled.div`
    width: 100%;
    padding: 4px;
    margin: 10px;
    border: 1px solid white;
    span {
        display: block;
    }

    li {
        margin-left: 50px;
        font-size: 10px;
    }
`;

const Tab = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
`;

const MaxDiv = styled.div`
    height: 100%;
    width: 100%;
    overflow: auto;
    display: flex;
    flex-direction: row;
`;
const Button = styled.button`
    padding: 5px;
    margin: 5px;
    background-color: black;
    color: white;
    border: none;
    outline: none;
    :hover {
        background-color: rgba(16, 16, 16);
    }
`;

interface Selected extends RtAudioDeviceInf {
    id: number;
    frameSize: number;
    updating: boolean;
}

interface AudioTabProps {
    als: AudioLightSystem;
}

interface AudioTabState {
    width: number;
    connected: boolean | null;
    deviceInfo: ActiveDevice | undefined;
    allDevices: RtAudioDeviceInf[] | undefined;
    change: Selected;
    mode: ControllerMode;
    onDeviceProcessing: boolean | undefined;
    apis: [string, number][];
}
export class AudioTab extends React.Component<AudioTabProps, AudioTabState> {
    private destroyed = false;
    private audioAnalyser: AudioAnalyser;

    constructor(props: AudioTabProps) {
        super(props);
        this.state = {
            width: window.innerWidth,
            connected: null,
            deviceInfo: undefined,
            allDevices: undefined,
            change: undefined,
            mode: props.als.lightSocket.mode,
            apis: [],
            onDeviceProcessing: false,
        };
    }

    async componentDidMount() {
        this.audioAnalyser = new AudioAnalyser(this.props.als.audioProcessor);
        window.addEventListener("resize", this.resize);
        this.socket.on("mode-update", this.onMode);
        this.socket.clientSocket.on("audio-server-connected", this.fetchInfo);
        this.socket.clientSocket.on("audio-server-disconnected", this.audioDisconnect);
        if (this.socket.connected) {
            this.fetchInfo();
        }
        (async () => {
            try {
                this.updateDevices();

                this.props.als.lightSocket.emitPromiseIfPossible<boolean, [boolean]>("pcm-report", true);
            } catch (error) {
                Logger.debug("Socket error pcm-report", error);
            }
        })();
    }

    componentWillUnmount() {
        this.destroyed = true;
        window.removeEventListener("resize", this.resize);
        this.props.als.lightSocket.off("mode-update", this.onMode);
        this.props.als.lightSocket.clientSocket.off("audio-server-connected", this.fetchInfo);
        this.props.als.lightSocket.clientSocket.off("audio-server-disconnected", this.audioDisconnect);

        (async () => {
            try {
                this.props.als.lightSocket.emitPromiseIfPossible<boolean, [boolean]>("pcm-report", false);
            } catch (error) {
                Logger.debug("Socket error pcm-report", error);
            }
        })();
    }
    onMode = (mode: ControllerMode) => {
        this.setState({ mode });
    };

    updateDevices = async () => {
        const result = await this.props.als.lightSocket.emitPromiseIfPossible<boolean, []>("is-audio-server-connected");
        if (this.destroyed) {
            return;
        }
        this.setState({ connected: result });
        if (result) {
            const deviceInfo = await this.props.als.lightSocket.emitPromiseIfPossible<ActiveDevice, []>(
                "active-device",
            );
            if (this.destroyed) {
                return;
            }
            this.setState({ deviceInfo });
            const allDevices = await this.props.als.lightSocket.emitPromiseIfPossible<RtAudioDeviceInf[], []>(
                "all-devices",
            );
            if (this.destroyed) {
                return;
            }
            this.setState({ allDevices });
        }
    };
    audioDisconnect = () => {
        this.setState({ connected: false, deviceInfo: undefined });
    };
    fetchInfo = async () => {
        this.setState({ connected: true });
        const ls = this.props.als.lightSocket;
        const deviceInfo = await ls.emitPromiseIfPossible<ActiveDevice, []>("active-device");
        const onDeviceProcessing = await ls.emitPromiseIfPossible<boolean, []>("is-internal-audio-processing");
        const apis = await ls.emitPromiseIfPossible<{ [key: string]: number }, []>("audio-apis");
        if (this.destroyed) {
            return;
        }

        const values = Object.entries(apis);

        this.setState({ deviceInfo, onDeviceProcessing, apis: values });
        this.updateDevices();
    };
    resize = () => {
        this.setState({ width: window.innerWidth });
    };
    updateDevice = async () => {
        const c = { ...this.state.change };
        c.updating = true;
        this.setState({ change: c });

        const deviceUpdate: AudioDeviceUpdate = {
            type: "audio-device-update",
            data: {
                frameSize: c.frameSize,
                id: c.id,
                name: c.name,
                sampleRate: c.preferredSampleRate,
            },
        };
        try {
            await this.props.als.lightSocket.emitPromiseIfPossible("audio-settings-update", deviceUpdate);
            this.setState({ change: undefined });
            this.fetchInfo();
        } catch (error) {
            alert("Something went wrong");
            console.error(error);
            const c = { ...this.state.change };
            c.updating = false;
            this.setState({ change: c });
        }
    };
    get socket() {
        return this.props.als.lightSocket;
    }

    get activeDevice() {
        if (!this.state.deviceInfo) {
            return <ReactLoading className='m-2' type={"bars"} color={"#ffffff"} height={50} width={50} />;
        }
        const s = this.state;
        const change =
            s.allDevices && !s.change && this ? (
                <Button
                    onClick={() => {
                        const device = this.state.allDevices.find(d => d.name === this.state.deviceInfo.device.name);
                        const id = this.state.allDevices.indexOf(device);
                        this.setState({
                            change: { ...device, id, frameSize: s.deviceInfo.frameSize, updating: false },
                        });
                    }}
                >
                    Change
                </Button>
            ) : null;
        const updateInterProcessing =
            s.allDevices && !s.change && s.onDeviceProcessing !== undefined && this ? (
                <Button
                    style={{ backgroundColor: this.state.onDeviceProcessing ? "green" : "gray" }}
                    onClick={async () => {
                        if (this.socket.connected) {
                            const b = this.state.onDeviceProcessing;
                            this.setState({ onDeviceProcessing: undefined });
                            try {
                                const result = await this.socket.emitPromiseIfPossible<
                                    boolean,
                                    [AudioUpdateInternalProcessing]
                                >("audio-settings-update", {
                                    type: "audi-internal-processing",
                                    data: !b,
                                });
                                if (!this.destroyed) {
                                    this.setState({ onDeviceProcessing: result });
                                }
                            } catch (error) {
                                console.error(error);
                                if (!this.destroyed) {
                                    this.setState({ onDeviceProcessing: b });
                                }
                            }
                        }
                    }}
                >
                    on device processing
                </Button>
            ) : null;

        const d = this.state.deviceInfo.device;
        const e = this.state.deviceInfo;
        return (
            <Div>
                <span>
                    Computer name: <b>{e.computerName}</b>
                </span>
                <span>
                    name: <b>{d.name}</b>
                </span>
                <span>
                    inputChannels: <b>{d.inputChannels}</b>
                </span>
                <span>
                    duplexChannels: <b>{d.duplexChannels}</b>
                </span>
                <span>
                    isDefaultInput: <b>{d.isDefaultInput ? "True" : "False"}</b>
                </span>
                <span>
                    isDefaultOutput: <b>{d.isDefaultOutput ? "True" : "False"}</b>
                </span>
                <span>
                    nativeFormats: <b>{d.nativeFormats}</b>
                </span>
                <span>
                    outputChannels: <b>{d.outputChannels}</b>
                </span>
                <span>
                    preferredSampleRate: <b>{d.preferredSampleRate}</b>
                </span>
                <span>
                    sampleRates:{" "}
                    <ul>
                        {d.sampleRates.map((e, i) => (
                            <li key={i}>
                                <b>{e}</b>
                            </li>
                        ))}
                    </ul>
                </span>
                <br />
                <span>
                    frameSize: <b>{e.frameSize}</b>
                </span>
                <span>
                    samplingRate: <b>{e.samplingRate}</b>
                </span>
                {change} {updateInterProcessing}
            </Div>
        );
    }

    get changeDevice() {
        if (!this.state.change) {
            return null;
        }
        const s = this.state;

        const device = (ev: React.ChangeEvent<HTMLSelectElement>) => {
            const int = parseInt(ev.target.value);
            const device = this.state.allDevices[int];
            const id = this.state.allDevices.indexOf(device);
            this.setState({ change: { ...device, id, frameSize: s.deviceInfo.frameSize, updating: false } });
        };

        const d = this.state.change;
        const deviceDropDown = (
            <select name='devices' id='devices' onChange={device} value={d.id}>
                {this.state.allDevices.map((e, i) => (
                    <option key={i} value={i}>
                        {e.name}
                    </option>
                ))}
            </select>
        );

        const sampleRate = (ev: React.ChangeEvent<HTMLSelectElement>) => {
            const int = parseInt(ev.target.value);
            const device = d.sampleRates[int];
            const update = { ...d };
            update.preferredSampleRate = device;
            this.setState({ change: { ...update } });
        };
        const sampleDropDown = (
            <select name='SampleRate' onChange={sampleRate} id='sampleRate'>
                {this.state.change.sampleRates.map((e, i) => (
                    <option key={i} value={i}>
                        {e}
                    </option>
                ))}
            </select>
        );

        const updateFrameSize = (e: React.ChangeEvent<HTMLInputElement>) => {
            let value = parseInt(e.target.value.replace(/\D/g, ""));
            if (isNaN(value)) {
                value = 920;
            }
            const change = { ...this.state.change };
            change.frameSize = value;
            this.setState({ change });
        };

        const buttons = d.updating ? (
            <ReactLoading className='m-2' type={"bars"} color={"#ffffff"} height={50} width={50} />
        ) : (
            <div>
                <Button onClick={() => this.setState({ change: undefined })}>Cancel</Button>
                <Button onClick={this.updateDevice}>update</Button>
            </div>
        );

        return (
            <Div>
                <div>
                    APIs
                    {this.state.apis.map((a, i) => {
                        return (
                            <Button
                                key={i}
                                onClick={async () => {
                                    try {
                                        await this.socket.emitPromiseIfPossible<boolean, [AudioApiUpdate]>(
                                            "audio-settings-update",
                                            {
                                                type: "audio-api-update",
                                                data: a[1],
                                            },
                                        );
                                        if (!this.destroyed) {
                                            this.fetchInfo();
                                        }
                                    } catch (error) {
                                        console.error(error);
                                    }
                                }}
                            >
                                {a[0]}
                            </Button>
                        );
                    })}
                </div>

                <span>name: {deviceDropDown}</span>
                <span>Sample rate: {sampleDropDown}</span>
                <span>
                    Frame size: <input type='text' onChange={updateFrameSize} value={d.frameSize} />
                </span>
                <br />
                {buttons}
            </Div>
        );
    }

    onModeUpdate = (mode: ControllerMode) => {
        this.setState({ mode });
    };

    changeMode = (mode: ControllerMode, on: boolean) => {
        this.props.als.lightSocket.emitPromiseIfPossible("mode-set", mode);
    };

    render() {
        if (this.state.connected === null) {
            return <ReactLoading className='m-2' type={"bars"} color={"#ffffff"} height={50} width={50} />;
        }

        if (!this.state.connected) {
            return <h1>Audio is not connected!</h1>;
        }

        return (
            <Tab>
                <CheckBox
                    text='Audio'
                    enabled={this.state.mode === "AudioRaw" || this.state.mode === "Audio"}
                    onChange={on => {
                        this.changeMode(this.state.onDeviceProcessing ? "Audio" : "AudioRaw", on);
                    }}
                />
                <MaxDiv>
                    {this.activeDevice}
                    {this.changeDevice}
                </MaxDiv>
                <AudioVisualizerLine
                    audioAnalyser={this.audioAnalyser}
                    audioSystem={this.props.als}
                    height={250}
                    width={this.state.width}
                />
            </Tab>
        );
    }
}

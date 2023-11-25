import React from "react";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { BrowserStorage } from "../../Utils/BrowserStorage";
import { Colour, ColourPicker } from "../ColourPicker/ColourPicker";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import styled from "styled-components";
import { isVertical } from "../../Utils/Utils";
import { CheckBox } from "../CheckBox/Checkbox";
import { ControllerMode } from "../../../shared/interfaces";
import ReactTooltip from "react-tooltip";
import { BinaryBuffer } from "../../../shared/messages/BinaryBuffer";
import { ServerMessagesRaw } from "../../../shared/Messages";
import { quickBuffer } from "../../../shared/utils";

const Div = styled.div`
    margin: 10px;
`;

const CheckBoxDiv = styled.div`
    display: inline-block;
`;
const CheckBoxFlex = styled.div`
    display: flex;
`;

const Warper = styled.div`
    overflow: auto;
`;

interface ManualTabProps {
    als: AudioLightSystem;
    palette: PreGenerateColourPickerPalette;
}

interface ManualTabState {
    colourHex: string;
    vertical: boolean;
    mode: ControllerMode;
}
export class ManualTab extends React.Component<ManualTabProps, ManualTabState> {
    private readonly DEFAULT_COLOR_HEX = "FF0000";
    private readonly BROWSER_KEY = "last-colour";

    constructor(props: ManualTabProps) {
        super(props);
        this.state = {
            colourHex: BrowserStorage.getString(this.BROWSER_KEY) || this.DEFAULT_COLOR_HEX,
            vertical: isVertical(),
            mode: props.als.lightSocket.mode,
        };
    }

    componentDidMount() {
        window.addEventListener("resize", this.resize);
        this.props.als.lightSocket.on("mode-update", this.onModeUpdate);
    }
    componentWillUnmount() {
        window.removeEventListener("resize", this.resize);
        this.props.als.lightSocket.off("mode-update", this.onModeUpdate);
    }
    onModeUpdate = (mode: ControllerMode) => {
        this.setState({ mode });
        this.forceUpdate();
    };

    changeMode = (mode: ControllerMode, on: boolean) => {
        this.props.als.lightSocket.emitIfPossible(
            ServerMessagesRaw.ModeSet,
            quickBuffer(on ? mode : ControllerMode.AutoPilot),
        );
    };

    resize = () => {
        this.setState({ vertical: isVertical() });
    };

    onChange = (colour: Colour) => {
        BrowserStorage.setString(this.BROWSER_KEY, colour.hex);
        const ls = this.props.als.lightSocket;
        if (ls.connected) {
            ls.setColor(colour.rgb.r, colour.rgb.g, colour.rgb.b);
        }
    };

    render() {
        return (
            <Warper>
                <ReactTooltip place='top' type='info' effect='solid' />

                <CheckBoxFlex>
                    <CheckBoxDiv data-tip='LEDs will keep its state as long as this page is open then it will fall back to autopilot'>
                        <CheckBox
                            text='Manual'
                            enabled={this.state.mode === ControllerMode.Manual}
                            onChange={on => {
                                this.changeMode(ControllerMode.Manual, on);
                            }}
                        />
                    </CheckBoxDiv>
                    <CheckBoxDiv data-tip='LEDs will keep its state even when this page is closed. Can still be overwritten by door switch'>
                        <CheckBox
                            text='Manual Force'
                            enabled={this.state.mode === ControllerMode.ManualForce}
                            onChange={on => {
                                this.changeMode(ControllerMode.ManualForce, on);
                            }}
                        />
                    </CheckBoxDiv>
                    <CheckBoxDiv data-tip="LEDs will keep its state no matter what. Even door switch can't overwrite this">
                        <CheckBox
                            text='Manual Locked'
                            enabled={this.state.mode === ControllerMode.ManualLocked}
                            onChange={on => {
                                this.changeMode(ControllerMode.ManualLocked, on);
                            }}
                        />
                    </CheckBoxDiv>
                </CheckBoxFlex>

                <Div style={{ textAlign: this.state.vertical ? "center" : "left" }}>
                    <ColourPicker
                        palette={this.props.palette}
                        onChange={this.onChange}
                        lifeUpdate={true}
                        colour={this.state.colourHex}
                    />
                </Div>
            </Warper>
        );
    }
}

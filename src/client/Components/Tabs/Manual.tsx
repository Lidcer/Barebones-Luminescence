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
            mode: props.als.mode,
        };
    }

    componentDidMount() {
        window.addEventListener("resize", this.resize);
        this.props.als.on("mode-update", this.onModeUpdate);
    }
    componentWillUnmount() {
        window.removeEventListener("resize", this.resize);
        this.props.als.off("mode-update", this.onModeUpdate);
    }

    onModeUpdate = (mode: ControllerMode) => {
        this.setState({ mode });
    };

    changeMode = (mode: ControllerMode, on: boolean) => {
        if (on) {
            this.props.als.lightSocket.emitPromiseIfPossible("mode-set", mode);
        } else {
            this.props.als.lightSocket.emitPromiseIfPossible("mode-set", "AutoPilot");
        }
    };

    resize = () => {
        this.setState({ vertical: isVertical() });
    };

    onChange = (colour: Colour) => {
        BrowserStorage.setString(this.BROWSER_KEY, colour.hex);
        const ls = this.props.als.lightSocket;
        if (ls.authenticated) {
            const { r: red, g: green, b: blue } = colour.rgb;
            ls.clientSocket.emit("rgb-set", red, green, blue);
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
                            enabled={this.state.mode === "Manual"}
                            onChange={on => {
                                this.changeMode("Manual", on);
                            }}
                        />
                    </CheckBoxDiv>
                    <CheckBoxDiv data-tip='LEDs will keep its state even when this page is closed. Can still be overwritten by door switch'>
                        <CheckBox
                            text='Manual Force'
                            enabled={this.state.mode === "ManualForce"}
                            onChange={on => {
                                this.changeMode("ManualForce", on);
                            }}
                        />
                    </CheckBoxDiv>
                    <CheckBoxDiv data-tip="LEDs will keep its state no matter what. Even door switch can't overwrite this">
                        <CheckBox
                            text='Manual Locked'
                            enabled={this.state.mode === "ManualLocked"}
                            onChange={on => {
                                this.changeMode("ManualLocked", on);
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

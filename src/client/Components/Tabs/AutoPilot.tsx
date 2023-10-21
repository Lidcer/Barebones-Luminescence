import React from "react";
import styled from "styled-components";
import { ControllerMode } from "../../../shared/interfaces";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { CheckBox } from "../CheckBox/Checkbox";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { PatternBuilder } from "../CustomTab/PatternBuilder";
import { ScheduleBuilder } from "../CustomTab/ScheduleBuilder";
import { DoorSensor } from "../CustomTab/DoorSensor";
import { ServerMessagesRaw } from "../../../shared/Messages";
import { quickBuffer } from "../../../shared/utils";

const Warper = styled.div`
    overflow: auto;
`;

const Div = styled.div`
    width: calc(100% - 10px);
    margin: 5px;
    display: flex;
`;

const DivTab = styled.div`
    width: calc(100% - 10px);
    margin: 5px;
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    justify-content: center;

    button {
        padding: 5px;
        font-size: 20pt;
    }
`;

export const Button = styled.button`
    user-select: none;
    background-color: rgb(42, 42, 42);
    color: white;
    font-size: 20px;
    padding: 2px;
    margin: 2px;
    border: none;
    outline: none;
    transition: background-color 0.25s, color 0.25s;
    :hover {
        background-color: rgb(52, 52, 52);
    }
`;

export const ButtonActive = styled.button`
    user-select: none;
    font-size: 20px;
    padding: 2px;
    margin: 2px;
    border: none;
    outline: none;
    color: rgb(0, 0, 0);
    background-color: rgb(255, 255, 255);
    transition: background-color 0.25s, color 0.25s;
    :hover {
        background-color: rgb(52, 52, 52);
    }
`;

enum TabState {
    Schedule = 1,
    Pattern,
    Door,
}
interface AutoPilotProps {
    als: AudioLightSystem;
    palette: PreGenerateColourPickerPalette;
}

interface AutoPilotState {
    tabState: TabState;
    mode: ControllerMode;
}

export class AutoPilotTab extends React.Component<AutoPilotProps, AutoPilotState> {
    constructor(props: AutoPilotProps) {
        super(props);
        this.state = {
            tabState: TabState.Schedule,
            mode: props.als.lightSocket.mode,
        };
    }

    componentDidMount() {
        this.props.als.lightSocket.on("mode-update", this.onModeUpdate);
    }
    componentWillUnmount() {
        this.props.als.lightSocket.off("mode-update", this.onModeUpdate);
    }

    onModeUpdate = (mode: ControllerMode) => {
        this.setState({ mode });
    };

    changeMode = (mode: ControllerMode, on: boolean) => {
        this.props.als.lightSocket.emitPromiseIfPossible(
            ServerMessagesRaw.ModeSet,
            quickBuffer(on ? mode : ControllerMode.Manual),
        );
    };

    renderTabs() {
        switch (this.state.tabState) {
            case TabState.Door:
                return <DoorSensor als={this.props.als} />;

            case TabState.Pattern:
                return <PatternBuilder palette={this.props.palette} als={this.props.als} />;

            case TabState.Schedule:
                return <ScheduleBuilder palette={this.props.palette} als={this.props.als} />;

            default:
                break;
        }
    }

    renderButton(state: TabState, name: string) {
        const active = this.state.tabState === state;
        const Btn = active ? ButtonActive : Button;
        return <Btn onClick={() => this.setState({ tabState: state })}>{name}</Btn>;
    }

    render() {
        return (
            <Warper>
                <CheckBox
                    text='Auto Pilot'
                    enabled={this.state.mode === ControllerMode.AutoPilot}
                    onChange={on => {
                        this.changeMode(ControllerMode.AutoPilot, on);
                    }}
                />
                <DivTab>
                    {this.renderButton(TabState.Pattern, "Pattern Builder")}
                    {this.renderButton(TabState.Schedule, "Schedule Builder")}
                    {this.props.als.lightSocket.doorSensorConnected ? (
                        <>{this.renderButton(TabState.Door, "Door Sensor")}</>
                    ) : null}
                </DivTab>

                <Div>{this.renderTabs()}</Div>
            </Warper>
        );
    }
}

import React from "react";
import styled from "styled-components";
import { AudioLightSystem } from "../../Utils/AudioSystem";

const Div = styled.div`
    width: calc(100% - 10px);
    background-color: rgb(0, 0, 0);
    padding: 5px;
    margin: 5px 0 0 0;
    border-top: 5px solid rgb(32, 32, 32);
    border-bottom: 5px solid rgb(32, 32, 32);
`;

const Button = styled.button`
    display: inline;
    background-color: transparent;
    color: white;
    border: none;
    padding: 10px 20px;
    margin: 2px;
    outline: none;
    transition: background-color 0.15s;
    :hover {
        background-color: rgba(64, 64, 64, 0.5);
    }
    :disabled {
        background-color: rgba(64, 64, 64, 1);
    }
`;
export type Tabs = "Manual" | "Audio" | "AutoPilot" | "Device" | "MagicHome" | "Camera";

interface NavigationBarProps {
    als: AudioLightSystem;
    tab: Tabs;
    onChange: (tab: Tabs) => void;
}

interface NavigationBarState {}

export class NavigationBar extends React.Component<NavigationBarProps, NavigationBarState> {
    isDisabled = (tab: Tabs) => {
        return this.props.tab === tab;
    };
    onClick = (tab: Tabs) => {
        this.props.onChange(tab);
    };

    render() {
        return (
            <Div>
                <Button onClick={() => this.onClick("Manual")} disabled={this.isDisabled("Manual")}>
                    Manual
                </Button>
                <Button onClick={() => this.onClick("Audio")} disabled={this.isDisabled("Audio")}>
                    Audio
                </Button>
                <Button onClick={() => this.onClick("AutoPilot")} disabled={this.isDisabled("AutoPilot")}>
                    AutoPilot
                </Button>
                <Button onClick={() => this.onClick("Device")} disabled={this.isDisabled("Device")}>
                    Device
                </Button>
                {this.props.als.lightSocket.isMagicHome ? (
                    <Button onClick={() => this.onClick("MagicHome")} disabled={this.isDisabled("MagicHome")}>
                        MagicHome
                    </Button>
                ) : null}
                {this.props.als.lightSocket.hasActiveCamera ? (
                    <Button onClick={() => this.onClick("Camera")} disabled={this.isDisabled("Camera")}>
                        Camera
                    </Button>
                ) : null}
            </Div>
        );
    }
}

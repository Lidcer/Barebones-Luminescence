import React from "react";
import styled from "styled-components";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { Tabs } from "../NavigationBar/NavigationBar";
import { AudioTab } from "./Audio";
import { AutoPilotTab as AutoPilotTab } from "./AutoPilot";
import { DeviceTab } from "./Device";
import { MagicTab } from "./MagicHome";
import { ManualTab } from "./Manual";
interface TabsProps {
    tab: Tabs;
    als: AudioLightSystem;
    palette: PreGenerateColourPickerPalette;
}

interface TabsState {}

export class Tab extends React.Component<TabsProps, TabsState> {
    render() {
        const tab = this.props.tab;
        switch (tab) {
            case "Device":
                return <DeviceTab als={this.props.als} />;
            case "AutoPilot":
                return <AutoPilotTab als={this.props.als} palette={this.props.palette} />;
            case "Audio":
                return <AudioTab als={this.props.als} />;
            case "MagicHome":
                return <MagicTab als={this.props.als} />;
            default:
                return <ManualTab als={this.props.als} palette={this.props.palette} />;
        }
    }
}

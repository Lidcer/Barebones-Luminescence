import React from "react";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { BrowserStorage } from "../../Utils/BrowserStorage";
import { Colour, ColourPicker } from "../ColourPicker/ColourPicker";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import styled from "styled-components";
import { isVertical } from "../../Utils/Utils";
import { CheckBox } from "../CheckBox/Checkbox";
import { ControllerMode } from "../../../shared/interfaces";

const Div = styled.div`
  margin: 10px;
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

  constructor(props) {
    super(props);
    this.state = {
      colourHex: BrowserStorage.getString(this.BROWSER_KEY) || this.DEFAULT_COLOR_HEX,
      vertical: isVertical(),
      mode: "Manual",
    };
  }

  componentDidMount() {
    window.addEventListener("resize", this.resize);
    this.props.als.lightSocket.clientSocket.on("mode-update", this.onModeUpdate);

  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.resize);
    this.props.als.lightSocket.clientSocket.off("mode-update", this.onModeUpdate);
  }

  onModeUpdate = (mode: ControllerMode) => {
    this.setState({mode});
  }

  changeMode = (mode: ControllerMode, on: boolean) => {
    if (on) {
      this.props.als.lightSocket.emitPromiseIfPossible("mode-set", mode);
    } else {
      this.props.als.lightSocket.emitPromiseIfPossible("mode-set", "AutoPilot");

    }
  }

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
      <>
        <CheckBox text="Manual" enabled={this.state.mode === "Manual"} onChange={(on) => { this.changeMode('Manual', on)}}  />
        <CheckBox text="Manual Force" enabled={this.state.mode === "ManualForce"} onChange={(on) => { this.changeMode('ManualForce', on)}}  />
        <CheckBox text="Manual Locked" enabled={this.state.mode === "ManualLocked"} onChange={(on) => { this.changeMode('ManualLocked', on)}}  />

        <Div style={{ textAlign: this.state.vertical ? "center" : "left" }}>
          <ColourPicker
            palette={this.props.palette}
            onChange={this.onChange}
            lifeUpdate={true}
            colour={this.state.colourHex}
          />
        </Div>
      </>
    );
  }
}

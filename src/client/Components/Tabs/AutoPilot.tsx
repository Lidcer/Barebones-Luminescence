import React from "react";
import styled from "styled-components";
import { ControllerMode } from "../../../shared/interfaces";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { CheckBox } from "../CheckBox/Checkbox";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { PatternBuilder } from "../CustomTab/PatternBuilder";
import { ScheduleBuilder } from "../CustomTab/ScheduleBuilder";
import { DoorSensor } from "../CustomTab/DoorSensor";

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
  border-radius: 4px;
  border: none;
  outline: none;
  transition: background-color 0.25s, color 0.25s;
  :hover {
    background-color: rgb(52, 52, 52);
  }
  :disabled {
    color: rgb(128, 128, 128);
    background-color: rgb(16, 16, 16);
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
      mode: props.als.mode,
    };
  }

  componentDidMount() {
    this.props.als.on("mode-update", this.onModeUpdate);
  }
  componentWillUnmount() {
    this.props.als.off("mode-update", this.onModeUpdate);
  }

  onModeUpdate = (mode: ControllerMode) => {
    this.setState({mode});
  }

  changeMode = (mode:ControllerMode, on: boolean) => {
    this.props.als.lightSocket.emitPromiseIfPossible('mode-set', mode);
  }

  renderTabs () {

    switch (this.state.tabState) {
      case TabState.Door:
          return <DoorSensor  als={this.props.als} />

      case TabState.Pattern:
        return <PatternBuilder palette={this.props.palette} als={this.props.als} />
        
      case TabState.Schedule:
        return <ScheduleBuilder palette={this.props.palette} als={this.props.als} />

    
      default:
        break;
    }

  }

  render() {
    return (
      <Warper>
        <CheckBox text="Auto Pilot" enabled={this.state.mode === "AutoPilot"} onChange={(on) => { this.changeMode("AutoPilot", on)}}  />
        <DivTab>
          <Button onClick={() => this.setState({ tabState: TabState.Pattern })} disabled={this.state.tabState === TabState.Pattern}>
            Schedule builder
          </Button>
          <Button onClick={() => this.setState({ tabState: TabState.Schedule })} disabled={this.state.tabState === TabState.Schedule}>
            Pattern builder
          </Button>
          {this.props.als.lightSocket.doorSensorConnected ? <>
            <Button onClick={() => this.setState({ tabState: TabState.Door })} disabled={this.state.tabState === TabState.Door}>
              Door sensor
          </Button>
          </> : null}

        </DivTab>


        <Div>
          {this.renderTabs()}
        </Div>
      </Warper>
    );
  }
}

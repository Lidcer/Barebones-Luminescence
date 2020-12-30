import React from "react";
import styled from "styled-components";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { PatternBuilder } from "../CustomTab/PatternBuilder";
import { ScheduleBuilder } from "../CustomTab/ScheduleBuilder";

const Div = styled.div`
  width: 100%;
  display: flex;
`;

const Button = styled.button`
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
interface AutoPilotProps {
  als: AudioLightSystem;
  palette: PreGenerateColourPickerPalette;
}

interface AutoPilotState {
  showPatternBuilder: boolean;
}

export class AutoPilotTab extends React.Component<AutoPilotProps, AutoPilotState> {
  constructor(props: AutoPilotProps) {
    super(props);
    this.state = {
      showPatternBuilder: false,
    };
  }

  render() {
    return (
      <>
        <Button onClick={() => this.setState({ showPatternBuilder: false })} disabled={!this.state.showPatternBuilder}>
          Schedule builder
        </Button>
        <Button onClick={() => this.setState({ showPatternBuilder: true })} disabled={this.state.showPatternBuilder}>
          Pattern builder
        </Button>

        <Div>
          {this.state.showPatternBuilder ? (
            <PatternBuilder palette={this.props.palette} als={this.props.als} />
          ) : (
            <ScheduleBuilder palette={this.props.palette} als={this.props.als} />
          )}
        </Div>
      </>
    );
  }
}

import React from "react";
import { hex2rgb } from "../../../shared/colour";
import { SCHEDULE_TYPE } from "../../../shared/constants";
import { DayDescription, HourDescriptor, LedPattern, RGB, ScheduleType } from "../../../shared/interfaces";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { ColourSetter, OnChangeEventType } from "../ColourSetter/ColourSetter";
import { PatternPreview } from "./PatternPreview";
import { TimePicker } from "./../DatePicker/TimePicker";
import { parseTime, TimeParser, TIME_SEPARATOR, TIME_SPLITTER } from "../../../shared/Scheduler";
import styled from "styled-components";

const Div = styled.div`
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

interface ScheduleItemProps {
  als: AudioLightSystem;
  palette: PreGenerateColourPickerPalette;
  descriptor: HourDescriptor;
  hour: string;

  onDataChange: (type: ScheduleType, data: HourDescriptor["data"]) => void;
  onTypeChange: (type: ScheduleType) => void;
  onTimeChange: (oldTime: string, newTime: string) => void;
  onRemove: () => void;
}

interface ScheduleItemState {}

const map = new Map<DayDescription, TimeParser[]>();
export class ScheduleHourDescriptor extends React.Component<ScheduleItemProps, ScheduleItemState> {
  constructor(props: ScheduleItemProps) {
    super(props);
    this.state = {};
  }
  componentDidUpdate() {}
  componentDidMount() {}
  componentWillUnmount() {}

  get descriptor() {
    if (this.props.descriptor.type === "RGB") {
      const onChange = (event: OnChangeEventType, colour: string) => {
        if (event === "change") {
          this.props.onDataChange(this.props.descriptor.type, hex2rgb(colour));
        }
      };
      return (
        <ColourSetter
          mode={"set"}
          colourRGB={this.props.descriptor.data as RGB}
          palette={this.props.palette}
          onChange={onChange}
        />
      );
    } else if (this.props.descriptor.type === "Pattern") {
      const onChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
        const newPattern = ev.target.value;
        const pattern = this.props.als.patternService.patterns.find(p => p.name === newPattern);
        if (pattern) {
          this.props.onDataChange(this.props.descriptor.type, pattern);
        }
      };

      const ledPattern = this.props.descriptor.data as LedPattern;
      return (
        <div>
          <select name='pattern-select' value={ledPattern.name} onChange={onChange}>
            {this.props.als.patternService.patterns.map((m, i) => {
              return (
                <option key={i} value={m.name}>
                  {m.name}
                </option>
              );
            })}
          </select>
          <PatternPreview ledPattern={ledPattern} width={20} height={20} />
        </div>
      );
    }
    return <div>Unknown</div>;
  }

  get typeSelector() {
    const onChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
      this.props.onTypeChange(ev.target.value as ScheduleType);
    };

    return (
      <select name='typeSelect' value={this.props.descriptor.type} onChange={onChange}>
        {SCHEDULE_TYPE.map((m, i) => {
          return (
            <option key={i} value={m}>
              {m}
            </option>
          );
        })}
      </select>
    );
  }

  get TimePickers() {
    const onChange = (type: "start" | "end", d: "hour" | "minute" | "second", number: number) => {
      const n = number.toString();
      let index = 0;
      switch (d) {
        case "minute":
          index = 1;
          break;
        case "second":
          index = 2;
          break;
      }

      const data = this.props.hour.split(TIME_SEPARATOR);
      const sTime = data[0].split(TIME_SPLITTER);
      const eTime = data[1].split(TIME_SPLITTER);
      if (type === "start") {
        sTime[index] = n;
      } else {
        eTime[index] = n;
      }
      const timeString = `${sTime.join(TIME_SPLITTER)}${TIME_SEPARATOR}${eTime.join(TIME_SPLITTER)}`;
      this.props.onTimeChange(this.props.hour, timeString);
    };
    const e = parseTime(this.props.hour);
    return (
      <>
        Start:
        <TimePicker
          hours={e.sTime[0]}
          minutes={e.sTime[1]}
          seconds={e.sTime[2]}
          onHourChange={h => onChange("start", "hour", h)}
          onMinuteChange={m => onChange("start", "minute", m)}
          onSecondChange={s => onChange("start", "second", s)}
        />
        End:
        <TimePicker
          hours={e.eTime[0]}
          minutes={e.eTime[1]}
          seconds={e.eTime[2]}
          onHourChange={h => onChange("end", "hour", h)}
          onMinuteChange={m => onChange("end", "minute", m)}
          onSecondChange={s => onChange("end", "second", s)}
        />
      </>
    );
  }

  render() {
    return (
      <Div>
        {this.TimePickers}
        {this.typeSelector}
        {this.descriptor}
        <Button onClick={() => this.props.onRemove()}>Delete</Button>
      </Div>
    );
  }
}

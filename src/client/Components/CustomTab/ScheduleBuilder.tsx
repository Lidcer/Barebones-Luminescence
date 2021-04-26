import React from "react";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import {
  Scheduler,
  TimeParser,
} from "../../../shared/Scheduler";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { rgb2hex } from "../../../shared/colour";
import { DayDescription, DayNames } from "../../../shared/interfaces";
import { Logger } from "../../../shared/logger";
import styled from "styled-components";
import { DAY_NAMES } from "../../../shared/constants";
import { DateAndTimePricker } from "../DatePicker/DateAndTimePicker";
import { DayScheduleBuilder } from "../DayScheduleBuilder/DayScheduleBuilder";
import { Button } from "../../styles";
import DatePicker from "react-date-picker";
import ReactTooltip from "react-tooltip";
import { getDayString } from "../../../shared/utils";


const DayButton = styled.button`
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
const Space = styled.div`
  width: 20px;
  display: inline-block;
`;

const Inline = styled.div`
  display: inline-block;
`

const CustomDate = styled.div`
  position: absolute;
`;

interface ScheduleTabProps {
  als: AudioLightSystem;
  palette: PreGenerateColourPickerPalette;
} //DAY_NAMES

interface ScheduleTabState {
  selected: DayNames | "Custom";
  customSelected: string;
  customDate?: Date;
  addNewCustom?: Date;
  saved: boolean;
}
export const cacheMap = new Map<DayDescription, TimeParser[]>();
export class ScheduleBuilder extends React.Component<ScheduleTabProps, ScheduleTabState> {
  private canvasRef = React.createRef<HTMLCanvasElement>();
  private scheduler: Scheduler;
  private canvasHeight = 50;
  private canvasWidth = 50;
  private ctx: CanvasRenderingContext2D;
  private frame: number;

  constructor(props: ScheduleTabProps) {
    super(props);
    this.state = {
      selected: "Monday",
      customSelected: "",
      saved: true,
    };
  }

  async componentDidMount() {
    try {
      await this.s.fetchSchedule();
    } catch (error) {
      Logger.debug("ScheduleBuilder", error);
    }
    const description = this.s.getFullSchedule();
    this.scheduler = new Scheduler(description);
    this.s.on("update", this.onScheduleUpdate);
    this.s.on("on-save-change", this.onSaveStateChange);

    this.ctx = this.canvas.getContext("2d");
    this.frame = requestAnimationFrame(this.draw);

      this.setState({saved: this.s.updated})
    Logger.debug("Schedule builder", description);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.frame);
    this.s.off("update", this.onScheduleUpdate);
    this.s.off("on-save-change", this.onSaveStateChange);
    this.scheduler.destroy();
  }

  onSaveStateChange = (saved: boolean) => {
    this.setState({saved});
  }

  onSave = async () => {
    const description = this.props.als.scheduleService.getFullSchedule();
    this.s.setDescription(description);
    try {
      await this.s.sendSchedule();
    } catch (error) {
      Logger.debug("Schedule Builder", error);
    }
  };
  onScheduleUpdate = () => {
    const s = this.props.als.scheduleService.getFullSchedule();
    this.scheduler.loadSchedule(s);
  };
  draw = () => {
    const { width, height } = this.canvas.getBoundingClientRect();
    const { r, g, b } = this.scheduler.state;
    this.ctx.fillStyle = rgb2hex(r, g, b);
    this.ctx.fillRect(0, 0, width, height);
    this.frame = requestAnimationFrame(this.draw);
  };
  get canvas() {
    return this.canvasRef.current;
  }

  get days() {
    const description = this.props.als.scheduleService.getFullSchedule();
    if (!description) {
      return <span>Loading....</span>;
    }
    const onSelect = (selected: ScheduleTabState["selected"]) => {
      this.setState({ selected });
    };

    return (
      <div>
        {DAY_NAMES.map((m, i) => {
          return (
            <DayButton key={i} onClick={() => onSelect(m as DayNames)} disabled={this.state.selected === m}>
              {m}
            </DayButton>
          );
        })}
        <DayButton onClick={() => onSelect("Custom")} disabled={this.state.selected === "Custom"}>
          Custom
        </DayButton>
      </div>
    );
  }
  private get daySchedule() {
    const description = this.s.getFullSchedule();
    const selected = this.state.selected;
    const custom = this.state.customSelected;
    if (selected === "Custom") {
      return description.custom[custom];
    }
    return description[selected];
  }

  onAddCustomDate = () => {
    this.setState({addNewCustom: new Date})
  }

  renderNewCustomDatePicker() {
    if (!this.state.addNewCustom) {
      return <DayButton onClick={this.onAddCustomDate}>Add date</DayButton>;
    }

    return <>
    <DatePicker className="date-picker" value={this.state.addNewCustom} onChange={(date: Date) => this.setState({addNewCustom: date})} />
    <Button onClick={() => {
          const state = {...this.state};
          const dayString = getDayString(state.addNewCustom);
          const description = this.s.getFullSchedule();
          if(description.custom[dayString]) {
            this.props.als.raiseNotification("This day already exist!");
            return;
          }

          description.custom[dayString] = {}
          this.s.setDescription(description);
          this.setState({addNewCustom: undefined});
    }}>Add date</Button>
  <Button onClick={() => {
        this.setState({addNewCustom: undefined});
  }}>Dismiss add</Button>

    </>

  }

  renderDaySchedule() {
    const selected = this.state.selected;
    const custom = this.state.customSelected;

    if (selected === "Custom") {
      const description = this.s.getFullSchedule();
      const times = Object.keys(description.custom);
      times.sort((a,b) => new Date(a) > new Date(b) ? 1 : -1);

      const dayDescription = custom ? this.daySchedule : null
      return <>
        {times.map((t, i) => {
          const m = new Date(t);
          const check = new Date();
          check.setDate(check.getDate() - 1);

          const expired = m < check;
          return <Inline key={i}>
          <DayButton 
            data-tip={expired ? "This date already happened" : ""}
            className={ expired ? "warning-button" : ""}
            onClick={() => this.setState({customSelected: t, addNewCustom: undefined})}
            disabled={this.state.customSelected === t}>{m.toLocaleDateString()}
          </DayButton>
          <ReactTooltip place="top" type="info" effect="solid"/>
          </Inline>
        })}
          <Space />
          { this.state.customSelected ? <DayButton onClick={() => {
            const description = this.s.getFullSchedule();
            delete description.custom[this.state.customSelected] 
            this.s.setDescription(description);
            this.setState({ customSelected: undefined});
        }}>Remove ({this.state.customSelected})</DayButton> : null  }  

        {this.renderNewCustomDatePicker()}

          {dayDescription ? <DayScheduleBuilder dayDescription={this.daySchedule} als={this.props.als} palette={this.props.palette} onChange={this.onDescriptionChange} /> : null}
      </>
    }
    return <DayScheduleBuilder dayDescription={this.daySchedule} als={this.props.als} palette={this.props.palette} onChange={this.onDescriptionChange} />
  }

  private get s() {
    return this.props.als.scheduleService;
  }
  setCustomDate = () => {
    this.setState({ customDate: this.state.customDate ? undefined : this.scheduler.getDate() });
  };
  get customDatePicker() {
    if (!this.state.customDate) {
      return null;
    }
    const e = (date: Date) => {
      this.scheduler.getDate = () => {
        return date;
      };
      this.setState({ customDate: date });
    };

    return (
      <CustomDate>
        <DateAndTimePricker onDateChange={e} date={this.state.customDate} />
      </CustomDate>
    );
  }

  onDescriptionChange = (dayDescription: DayDescription) => {
    const description = this.s.getFullSchedule();
    const selected = this.state.selected;
    const custom = this.state.customSelected;
    if (selected === "Custom") {
       description.custom[custom] = dayDescription;
    } else {
      description[selected] = dayDescription;
    }
    this.s.setDescription(description);
    this.forceUpdate();
  }

  render() {
    return (
      <div>
        <h1>Schedule builder</h1>
        <canvas ref={this.canvasRef} width={this.canvasWidth} height={this.canvasHeight}></canvas>
        {this.customDatePicker}
        <Button onClick={this.setCustomDate}>{this.state.customDate ? "Hide" : "Set custom date"}</Button>
        <Button className={this.state.saved ? "" : "warning-button"} onClick={this.onSave}>Save</Button> {this.state.saved ? null : "You have unsaved schedule" }
        {this.days}
        {this.renderDaySchedule()}
      </div>
    );
  }
}

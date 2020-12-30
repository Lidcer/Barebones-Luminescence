import React from "react";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import {
  dayDescriptionToArray,
  getDayString,
  Scheduler,
  SortedDayDescription,
  TimeParser,
} from "../../../shared/Scheduler";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { rgb2hex } from "../../../shared/colour";
import { DayDescription, DayNames, HourDescriptor, RGB, SchedulerDescription } from "../../../shared/interfaces";
import { Logger } from "../../../shared/logger";
import styled from "styled-components";
import { ScheduleHourDescriptor } from "./ScheduleItem";
import { random } from "lodash";
import { DAY_NAMES } from "../../../shared/constants";
import { DatePicker } from "../DatePicker/DatePicker";
import { DateAndTimePricker } from "../DatePicker/DateAndTimePicker";

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
  description?: SchedulerDescription;
  customDate?: Date;
  addNewCustom?: Date;
}
export const cacheMap = new Map<DayDescription, TimeParser[]>();
export class ScheduleBuilder extends React.Component<ScheduleTabProps, ScheduleTabState> {
  private canvasRef = React.createRef<HTMLCanvasElement>();
  private scheduler: Scheduler;
  private canvasHeight = 50;
  private canvasWidth = 50;
  private ctx: CanvasRenderingContext2D;
  private frame: number;
  private sorted: SortedDayDescription[] = [];

  constructor(props: ScheduleTabProps) {
    super(props);
    this.state = {
      selected: "Custom",
      customSelected: "",
    };
  }

  async componentDidMount() {
    try {
      await this.props.als.scheduleService.fetchSchedule();
    } catch (error) {
      Logger.debug("ScheduleBuilder", error);
    }
    const description = this.props.als.scheduleService.getFullSchedule();
    this.scheduler = new Scheduler(description);
    this.props.als.scheduleService.on("update", this.onScheduleUpdate);

    this.ctx = this.canvas.getContext("2d");
    this.frame = requestAnimationFrame(this.draw);
    this.setState({ description });
    Logger.debug("Schedule builder", description);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.frame);
    this.props.als.scheduleService.off("update", this.onScheduleUpdate);
    this.scheduler.destroy();
  }
  onSave = async () => {
    this.s.setPattern(this.state.description);
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
  getRandomTime() {
    const r = random;
    return `${r(0, 23)}:${r(10, 59)}:${r(10, 59)}-${r(0, 23)}:${r(10, 59)}:${r(10, 59)}`;
  }

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
    if (!this.state.description) {
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
  renderDescription(desc: DayDescription) {
    const len = Object.keys(desc).length;
    if (this.sorted.length !== len) {
      this.sorted = dayDescriptionToArray(desc);
    } else if (this.state.selected === "Custom") {
      this.sorted = dayDescriptionToArray(desc);
    }

    const onColourChange = (key: string, type: HourDescriptor["type"], data: HourDescriptor["data"]) => {
      const description = { ...this.state.description };
      if (this.state.selected === "Custom") {
        description.custom[this.state.customSelected][key].data = data;
        description.custom[this.state.customSelected][key].type = type;
      } else {
        description[this.state.selected][key].data = data;
        description[this.state.selected][key].type = type;
      }
      this.setState({ description });
    };
    const onTypeChange = (key: string, type: HourDescriptor["type"]) => {
      if (this.state.selected === "Custom") {
        if (this.state.description.custom[this.state.customSelected][key].type === type) {
          return;
        }
      } else {
        if (this.state.description[this.state.selected][key].type === type) {
          return;
        }
      }

      const description = { ...this.state.description };
      if (this.state.selected === "Custom") {
        description.custom[this.state.customSelected][key].type = type;
      } else {
        description[this.state.selected][key].type = type;
      }

      if (type === "Pattern") {
        let pattern = this.props.als.patternService.patterns[0];
        if (!pattern) {
          pattern = this.props.als.patternService.newPattern();
          this.props.als.patternService.setPattern(pattern);
          this.props.als.patternService.sendPatterns().catch(err => Logger.debug("Schedule Builder", err));
        }
        if (this.state.selected === "Custom") {
          description.custom[this.state.customSelected][key].data = pattern;
        } else {
          description[this.state.selected][key].data = pattern;
        }
      } else if (type === "RGB") {
        const rgb: RGB = { r: random(0, 255), g: random(0, 255), b: random(0, 255) };
        if (this.state.selected === "Custom") {
          description.custom[this.state.customSelected][key].data = rgb;
        } else {
          description[this.state.selected][key].data = rgb;
        }
      } else {
        Logger.debug("Pattern Builder", `Unknown value ${type}`);
      }
      this.setState({ description });
    };
    const onTimeChange = (key: string, newTime: string) => {
      const description = { ...this.state.description };
      if (this.state.selected === "Custom") {
        const backup = description.custom[this.state.customSelected][key];
        delete description.custom[this.state.customSelected][key];
        description.custom[this.state.customSelected][newTime] = backup;
        this.sorted = dayDescriptionToArray(description.custom[this.state.customSelected]);
      } else {
        const backup = description[this.state.selected][key];
        delete description[this.state.selected][key];
        description[this.state.selected][newTime] = backup;
        this.sorted = dayDescriptionToArray(description[this.state.selected]);
      }
      this.setState({ description });
    };

    const onRemove = (key: string) => {
      const description = { ...this.state.description };
      if (this.state.selected === "Custom") {
        delete description.custom[this.state.customSelected][key];
        this.sorted = dayDescriptionToArray(description.custom[this.state.customSelected]);
      } else {
        delete description[this.state.selected][key];
        this.sorted = dayDescriptionToArray(description[this.state.selected]);
      }
      this.setState({ description });
    };

    const onAdd = () => {
      const description = { ...this.state.description };
      const key = this.getRandomTime();
      let des: HourDescriptor;
      if (this.state.selected === "Custom") {
        description.custom[this.state.customSelected][key] = {} as any;
        des = description.custom[this.state.customSelected][key] as HourDescriptor;
      } else {
        description[this.state.selected][key] = {} as any;
        des = description[this.state.selected][key] as HourDescriptor;
      }

      des.type = "RGB";
      des.data = { r: random(0, 255), g: random(0, 255), b: random(0, 255) };
      this.setState({ description });
    };
    return (
      <>
        {this.sorted.map((obj, i) => {
          const k = Object.keys(obj)[0];
          return (
            <ScheduleHourDescriptor
              key={i}
              als={this.props.als}
              palette={this.props.palette}
              descriptor={desc[k]}
              hour={k}
              onTimeChange={(_oldTime, newTime) => onTimeChange(k, newTime)}
              onDataChange={(type, data) => onColourChange(k, type, data)}
              onTypeChange={type => onTypeChange(k, type)}
              onRemove={() => onRemove(k)}
            />
          );
        })}
        <Button onClick={onAdd}>Add</Button>
      </>
    );
  }

  get daySchedule() {
    if (this.state.selected === "Custom") {
    } else {
      const desc = this.state.description[this.state.selected];
      return this.renderDescription(desc);
    }

    if (!this.state.description) {
      return null;
    }

    const onToggle = () => {
      const addNewCustom = this.state.addNewCustom ? undefined : new Date();
      this.setState({ addNewCustom });
    };

    const c = this.state.addNewCustom;
    const Dtn = c ? (
      <>
        <DatePicker
          date={{ day: c.getDate(), month: c.getMonth(), year: c.getFullYear() }}
          onChange={(day, month, year) => {
            this.state.addNewCustom.setMonth(month);
            this.state.addNewCustom.setDate(day);
            this.state.addNewCustom.setFullYear(year);
          }}
        />
        <Button
          onClick={() => {
            const description = { ...this.state.description };
            const index = getDayString(this.state.addNewCustom);
            description.custom[index] = {};
            const time = this.getRandomTime();
            description.custom[index][time] = {
              type: "RGB",
              data: { r: random(0, 255), g: random(0, 255), b: random(0, 255) },
            };
            this.setState({ addNewCustom: undefined, description, customSelected: time });
          }}
        >
          Confirm
        </Button>
      </>
    ) : null;
    const Btn = <Button onClick={onToggle}>{this.state.addNewCustom ? "Delete" : "Add"}</Button>;

    const ccc = this.state.description.custom;
    const keys = Object.keys(this.state.description.custom);

    return (
      <span>
        {keys.map((m, i) => {
          return (
            <Button
              key={i}
              onClick={e => this.setState({ customSelected: m })}
              disabled={this.state.customSelected === m}
            >
              {m}
            </Button>
          );
        })}
        {Dtn}
        {Btn}
        {this.state.customSelected && ccc[this.state.customSelected]
          ? this.renderDescription(ccc[this.state.customSelected])
          : null}
      </span>
    );
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
      console.log(date);
      this.setState({ customDate: date });
    };

    return (
      <CustomDate>
        <DateAndTimePricker onDateChange={e} date={this.state.customDate} />
      </CustomDate>
    );
  }

  render() {
    return (
      <div>
        <h1>Schedule builder</h1>
        <canvas ref={this.canvasRef} width={this.canvasWidth} height={this.canvasHeight}></canvas>
        {this.customDatePicker}
        <Button onClick={this.setCustomDate}>{this.state.customDate ? "Hide" : "Set custom date"}</Button>
        <Button onClick={this.onSave}>Save</Button>
        {this.days}
        {this.daySchedule}
      </div>
    );
  }
}

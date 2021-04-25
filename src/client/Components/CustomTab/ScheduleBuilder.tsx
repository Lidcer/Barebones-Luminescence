import React from "react";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import {
  getDayString,
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
  // renderDescription(desc: DayDescription) {
  //   const onColourChange = (key: string, type: HourDescriptor["type"], data: HourDescriptor["data"]) => {
  //     const description = this.props.als.scheduleService.getFullSchedule()
  //     if (this.state.selected === "Custom") {
  //       description.custom[this.state.customSelected][key].data = data;
  //       description.custom[this.state.customSelected][key].type = type;
  //     } else {
  //       description[this.state.selected][key].data = data;
  //       description[this.state.selected][key].type = type;
  //     }
  //   };
  //   const onTypeChange = (key: string, type: HourDescriptor["type"]) => {
  //     if (this.state.selected === "Custom") {
  //       const description = this.props.als.scheduleService.getFullSchedule()
  //       if (description.custom[this.state.customSelected][key].type === type) {
  //         return;
  //       }
  //     } else {
  //       const description = this.props.als.scheduleService.getFullSchedule()
  //       if (description[this.state.selected][key].type === type) {
  //         return;
  //       }
  //     }

  //     const description = this.props.als.scheduleService.getFullSchedule()
  //     if (this.state.selected === "Custom") {
  //       description.custom[this.state.customSelected][key].type = type;
  //     } else {
  //       description[this.state.selected][key].type = type;
  //     }

  //     if (type === "Pattern") {
  //       let pattern = this.props.als.patternService.patterns[0];
  //       if (!pattern) {
  //         pattern = this.props.als.patternService.newPattern();
  //         this.props.als.patternService.setPattern(pattern);
  //         this.props.als.patternService.sendPatterns().catch(err => Logger.debug("Schedule Builder", err));
  //       }
  //       if (this.state.selected === "Custom") {
  //         description.custom[this.state.customSelected][key].data = pattern;
  //       } else {
  //         description[this.state.selected][key].data = pattern;
  //       }
  //     } else if (type === "RGB") {
  //       const rgb: RGB = { r: random(0, 255), g: random(0, 255), b: random(0, 255) };
  //       if (this.state.selected === "Custom") {
  //         description.custom[this.state.customSelected][key].data = rgb;
  //       } else {
  //         description[this.state.selected][key].data = rgb;
  //       }
  //     } else {
  //       Logger.debug("Pattern Builder", `Unknown value ${type}`);
  //     }
  //     this.forceUpdate();
  //   };
  //   const onTimeChange = (key: string, newTime: string) => {
  //     const description = this.props.als.scheduleService.getFullSchedule()
  //     if (this.state.selected === "Custom") {
  //       const backup = description.custom[this.state.customSelected][key];
  //       delete description.custom[this.state.customSelected][key];
  //       description.custom[this.state.customSelected][newTime] = backup;
  //     } else {
  //       const backup = description[this.state.selected][key];
  //       delete description[this.state.selected][key];
  //       description[this.state.selected][newTime] = backup;
  //     }
  //     this.sort();
  //   };

  //   const onRemove = (key: string) => {
  //     const description = this.props.als.scheduleService.getFullSchedule()
  //     if (this.state.selected === "Custom") {
  //       delete description.custom[this.state.customSelected][key];
  //     } else {
  //       delete description[this.state.selected][key];
  //     }
  //   };

  //   const onAdd = () => {

  //     const description = this.props.als.scheduleService.getFullSchedule()
  //     const key = this.getRandomTime();
  //     let des: HourDescriptor;
  //     if (this.state.selected === "Custom") {
  //       description.custom[this.state.customSelected][key] = {} as any;
  //       des = description.custom[this.state.customSelected][key] as HourDescriptor;
  //     } else {
  //       description[this.state.selected][key] = {} as any;
  //       des = description[this.state.selected][key] as HourDescriptor;
  //     }

  //     des.type = "RGB";
  //     des.data = { r: random(0, 255), g: random(0, 255), b: random(0, 255) };
  //     this.props.als.scheduleService.setPattern(description);

  //     this.sortForce();
  //   };
  //   return (
  //     <>
  //       {this.state.dayTimes.map((obj, i) => {
  //         const k = Object.keys(obj)[0];
  //         return (
  //           <ScheduleHourDescriptor
  //             key={i}
  //             als={this.props.als}
  //             palette={this.props.palette}
  //             descriptor={desc[k]}
  //             time={k}
  //             onTimeChange={(_oldTime, newTime) => onTimeChange(k, newTime)}
  //             onDataChange={(type, data) => onColourChange(k, type, data)}
  //             onTypeChange={type => onTypeChange(k, type)}
  //             onRemove={() => onRemove(k)}
  //           />
  //         );
  //       })}
  //       <Button onClick={onAdd}>Add</Button>
  //     </>
  //   );
  // }

  // get daySchedule() {
  //   const description = this.props.als.scheduleService.getFullSchedule();
  //   if (this.state.selected === "Custom") {
  //   } else {
  //     const desc = description[this.state.selected];
  //     return this.renderDescription(desc);
  //   }

  //   if (!description) {
  //     return null;
  //   }

  //   const onToggle = () => {
  //     const addNewCustom = this.state.addNewCustom ? undefined : new Date();
  //     this.setState({ addNewCustom });
  //   };

  //   const c = this.state.addNewCustom;
  //   const Dtn = c ? (
  //     <>
  //       <DatePicker
  //         date={{ day: c.getDate(), month: c.getMonth(), year: c.getFullYear() }}
  //         onChange={(day, month, year) => {
  //           this.state.addNewCustom.setMonth(month);
  //           this.state.addNewCustom.setDate(day);
  //           this.state.addNewCustom.setFullYear(year);
  //         }}
  //       />
  //       <Button
  //         onClick={() => {
  //           const description = this.props.als.scheduleService.getFullSchedule();
  //           const index = getDayString(this.state.addNewCustom);
  //           description.custom[index] = {};
  //           const time = this.getRandomTime();
  //           description.custom[index][time] = {
  //             type: "RGB",
  //             data: { r: random(0, 255), g: random(0, 255), b: random(0, 255) },
  //           };
  //           this.setState({ addNewCustom: undefined, customSelected: time });
  //         }}
  //       >
  //         Confirm
  //       </Button>
  //     </>
  //   ) : null;
  //   const Btn = <Button onClick={onToggle}>{this.state.addNewCustom ? "Delete" : "Add"}</Button>;

  //   const ccc = description.custom;
  //   const keys = Object.keys(description.custom);

  //   return (
  //     <span>
  //       {keys.map((m, i) => {
  //         return (
  //           <Button
  //             key={i}
  //             onClick={e => this.setState({ customSelected: m })}
  //             disabled={this.state.customSelected === m}
  //           >
  //             {m}
  //           </Button>
  //         );
  //       })}
  //       {Dtn}
  //       {Btn}
  //       {this.state.customSelected && ccc[this.state.customSelected]
  //         ? this.renderDescription(ccc[this.state.customSelected])
  //         : null}
  //     </span>
  //   );
  // }

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
      const dayDescription = custom ? this.daySchedule : null
      return <>
        {times.map((t, i) => {
          return <DayButton key={i} onClick={() => this.setState({customSelected: t, addNewCustom: undefined})} disabled={this.state.customSelected === t}>{t}</DayButton>
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

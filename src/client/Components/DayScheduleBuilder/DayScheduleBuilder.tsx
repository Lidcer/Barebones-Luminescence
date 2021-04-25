import { debounce, random } from "lodash";
import React from "react";
import { SECOND } from "../../../shared/constants";
import { DayDescription, HourDescriptor, LedPattern, RGB, ScheduleType } from "../../../shared/interfaces";
import { removeFromArray } from "../../../shared/utils";
import { Button } from "../../styles";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { ScheduleHourDescriptor } from "../CustomTab/ScheduleItem";

interface HourDate {
    time: string;
    data: HourDescriptor
  }


interface Props {
    dayDescription: DayDescription;
    als: AudioLightSystem;
    palette: PreGenerateColourPickerPalette;
    onChange: (dayDescription: DayDescription) => void; 
}

interface State {
    daySchedule: HourDate[];
    canPaste: boolean;
}

let copiedData: HourDate[] = [];

export class DayScheduleBuilder extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            daySchedule: [],
            canPaste: !!copiedData.length,
        }
    }

    componentDidMount() {
        this.pasteDaySchedule();
    }

    componentWillUnmount() {

    }

    componentDidUpdate(props: Props) {
        if (props.dayDescription !== this.props.dayDescription) {
            this.pasteDaySchedule();
        }
    }

    private emitChange(state?: State) {
        state = state || this.state;
        const dayDescription: DayDescription = {}

        for (const timeItem of state.daySchedule) {
            dayDescription[timeItem.time] = timeItem.data;
        }
        this.props.onChange(dayDescription);
    }

    debounceSortAndCorrect = debounce(() => {
        const state = {...this.state};
        this.sort(state);
        this.correct(state);
        this.emitChange(state);
    }, SECOND)

    private pasteDaySchedule = () => {
        const dayDescription = this.props.dayDescription;

        const entries = Object.entries(dayDescription || {});
        const daySchedule: HourDate[] = [];
        for (const [key, value] of entries) {
            daySchedule.push({
                time: key,
                data: value
            })
        }

        const state = {...this.state};
        state.daySchedule = daySchedule;
        this.sort(state);
        this.correct(state);
        this.setState(state);
    }

    private updateCanCopy() {
        this.setState({canPaste: !!copiedData.length})
    }

    private correct = (state?: State, update = true) => {
        state = state || {...this.state};
        const daySchedule = [...state.daySchedule];
        for (let i = 0; i < daySchedule.length; i++) {
            const next = daySchedule[i + 1];
            if(next) {
                const current = daySchedule[i];
                const timeNow = current.time;
                const timeNext = next.time;

                const timeNowSplit = timeNow.split("-");
                const timeNowStart = timeNext.split("-")[0];
                const dateA = new Date(`December 1, 2000 ${timeNowSplit[1]}`);
                const dateB = new Date(`December 1, 2000 ${timeNowStart}`);
                if (dateA > dateB) {
                    daySchedule[i].time = `${timeNowSplit[0]}-${timeNowStart}`;
                }
            }
        }
        state.daySchedule = daySchedule;
        if (update) {
            this.setState(state);
        }
    }
    private sort = (state?: State, update = true) => {
        state = state || {...this.state};
        const daySchedule = [...state.daySchedule];
        daySchedule.sort((a, b) => {
          const timeA = a.time.split("-");
          const timeB = b.time.split("-");
          const dateA = new Date(`December 1, 2000 ${timeA[0]}`);
          const dateB = new Date(`December 1, 2000 ${timeB[0]}`);
          return dateA > dateB ? 1 : -1;
        });
        state.daySchedule = daySchedule;
        if (update) {
            this.setState(state);
        }
    }
    
    private getRandomTime() {
        const r = random;
        return `${r(0, 23)}:${r(10, 59)}:${r(10, 59)}-${r(0, 23)}:${r(10, 59)}:${r(10, 59)}`;
      }
    private onAdd = () => {
       const state = {...this.state};
       state.daySchedule.push({
           time: this.getRandomTime(),
           data: {
               type: "RGB",
               data: { r: random(0, 255), g: random(0, 255), b: random(0, 255) },
           }
       })
       this.sort(state, false);
       this.correct(state, false);
       this.setState(state);
       this.emitChange(state);
    }
    private onTimeChange(hourDate: HourDate, time: string) {
        const state = {...this.state};
        const index = state.daySchedule.indexOf(hourDate);
        if (index === -1) return;
        state.daySchedule[index].time = time;
        this.setState(state);
        this.debounceSortAndCorrect();
    }
    private onColourChange(hourDate: HourDate, type: ScheduleType, data: LedPattern | RGB) {
        const state = {...this.state};
        const index = state.daySchedule.indexOf(hourDate);
        if (index === -1) return;
        state.daySchedule[index].data = { type, data };
        this.setState(state);
        this.emitChange(state);
    }
    private onTypeChange(hourDate: HourDate, type: ScheduleType) {
        const state = {...this.state};
        const index = state.daySchedule.indexOf(hourDate);
        if (index === -1) return;
        state.daySchedule[index].data.type = type;
        this.setState(state);
        this.emitChange(state);
    }
    private onRemove(hourDate: HourDate) {
        const state = {...this.state};
        const index = state.daySchedule.indexOf(hourDate);
        if (index === -1) return;
        removeFromArray(state.daySchedule, hourDate);
        this.sort(state);
        this.correct(state);
        this.setState(state);
        this.emitChange(state);
    }

    onCopy = () => {
        copiedData = this.state.daySchedule;
        this.updateCanCopy();
    }
    onPaste = () => {
        const state = {...this.state};
        state.daySchedule = copiedData;
        this.setState(state);
        this.emitChange(state);
    }

    get schedule() {
        return this.state.daySchedule.map((s, i) => {
            return <ScheduleHourDescriptor
              key={i}
              als={this.props.als}
              palette={this.props.palette}
              descriptor={s.data}
              time={s.time}
              onTimeChange={(_oldTime, newTime) => this.onTimeChange(s, newTime)}
              onDataChange={(type, data) => this.onColourChange(s, type, data)}
              onTypeChange={type => this.onTypeChange(s, type)}
              onRemove={() => this.onRemove(s)}
            />
        })
    }

    render() {
        return <div>
            {this.schedule}
            <Button onClick={this.onAdd} >Add</Button>
            { this.state.daySchedule.length ? <Button onClick={this.onCopy} >Copy</Button> : null }
            { this.state.canPaste ? <Button onClick={this.onPaste}> Paste </Button> : null}
        </div>
    }


}
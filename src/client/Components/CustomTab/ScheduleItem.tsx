import React from "react";
import { hex2rgb } from "../../../shared/colour";
import { SCHEDULE_TYPE } from "../../../shared/constants";
import { DayDescription, HourDescriptor, LedPattern, RGB, ScheduleType } from "../../../shared/interfaces";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { ColourSetter, OnChangeEventType } from "../ColourSetter/ColourSetter";
import { PatternPreview } from "./PatternPreview";
import { parseTime, TimeParser, TIME_SEPARATOR, TIME_SPLITTER } from "../../../shared/Scheduler";
import styled from "styled-components";
import TimePicker, { TimePickerValue } from "react-time-picker";

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
    time: string;

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

    get timePickers() {
        const onChange = (time: TimePickerValue, start: boolean) => {
            const split = this.props.time.split("-");
            const newTime = start ? `${time}-${split[1]}` : `${split[0]}-${time}`;
            this.props.onTimeChange(this.props.time, newTime);
        };
        const split = this.props.time.split("-");

        return (
            <>
                <span>Start:</span>
                <TimePicker
                    className='time-picker'
                    value={split[0]}
                    onChange={ev => onChange(ev, true)}
                    maxDetail='second'
                    disableClock={true}
                    clearIcon={null}
                />
                <span>End:</span>
                <TimePicker
                    className='time-picker'
                    value={split[1]}
                    onChange={ev => onChange(ev, false)}
                    maxDetail='second'
                    disableClock={true}
                    clearIcon={null}
                />
            </>
        );
    }

    render() {
        return (
            <Div>
                {this.timePickers}
                {this.typeSelector}
                {this.descriptor}
                <Button onClick={() => this.props.onRemove()}>Delete</Button>
            </Div>
        );
    }
}

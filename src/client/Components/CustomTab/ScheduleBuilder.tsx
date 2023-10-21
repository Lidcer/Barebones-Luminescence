import React from "react";
import { PreGenerateColourPickerPalette } from "../ColourPicker/ColourPickerDataImages";
import { Scheduler, TimeParser } from "../../../shared/Scheduler";
import { AudioLightSystem } from "../../Utils/AudioSystem";
import { rgb2hex } from "../../../shared/colour";
import { DayDescription, DayNames } from "../../../shared/interfaces";
import { Logger } from "../../../shared/logger";
import styled from "styled-components";
import { DAY_NAMES, SECOND } from "../../../shared/constants";
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

const InlineBlock = styled.div`
    display: inline-block;
`;

const Flex = styled.div`
    display: flex;
`;

const FlexColumn = styled.div`
    display: flex;
    flex-direction: column;
`;

const DateInput = styled.input`
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
`;

const Margin = styled.div`
    margin: 2px;
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
    time?: string;
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
    private last = Date.now();
    private time = 0;

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

        this.setState({ saved: this.s.updated });
        Logger.debug("Schedule builder", description);
    }
    componentWillUnmount() {
        cancelAnimationFrame(this.frame);
        this.s.off("update", this.onScheduleUpdate);
        this.s.off("on-save-change", this.onSaveStateChange);
        if (this.scheduler) {
            this.scheduler.destroy();
        }
    }

    onSaveStateChange = (saved: boolean) => {
        this.setState({ saved });
    };

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
        const nowMs = Date.now();
        const ms = nowMs - this.last;
        this.last = nowMs;
        this.time += ms;
        if (this.time > SECOND && this.state.customDate) {
            const then = this.state.customDate;
            then.setSeconds(new Date().getSeconds());
            const time = then.getTime() + this.time;
            const clone = new Date(time);
            this.setState({ time: clone.toLocaleString(), customDate: clone });
            this.time = 0;
        }
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
        this.setState({ addNewCustom: new Date() });
    };
    toDateString(date: Date) {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");

        return `${year}-${month}-${day}`;
    }
    renderNewCustomDatePicker() {
        if (!this.state.addNewCustom) {
            return <DayButton onClick={this.onAddCustomDate}>Add date</DayButton>;
        }

        return (
            <>
                <DateInput
                    type='date'
                    value={this.state.addNewCustom ? this.toDateString(this.state.addNewCustom) : undefined}
                    onChange={ev => {
                        const value = (ev.target as HTMLInputElement).value;
                        if (value) {
                            console.log(value);
                            this.setState({ addNewCustom: new Date(value) });
                        } else {
                            this.setState({ addNewCustom: undefined });
                        }
                    }}
                />
                {/* <DatePicker
                    className='date-picker'
                    value={this.state.addNewCustom}
                    onChange={(date: Date) => this.setState({ addNewCustom: date })}
                /> */}
                <Button
                    onClick={() => {
                        const state = { ...this.state };
                        const dayString = getDayString(state.addNewCustom);
                        const description = this.s.getFullSchedule();
                        if (description.custom[dayString]) {
                            this.props.als.raiseNotification("This day already exist!");
                            return;
                        }

                        description.custom[dayString] = {};
                        this.s.setDescription(description);
                        this.setState({ addNewCustom: undefined });
                    }}
                >
                    Add date
                </Button>
                <Button
                    onClick={() => {
                        this.setState({ addNewCustom: undefined });
                    }}
                >
                    Dismiss add
                </Button>
            </>
        );
    }

    renderDaySchedule() {
        const selected = this.state.selected;
        const custom = this.state.customSelected;

        if (selected === "Custom") {
            const description = this.s.getFullSchedule();
            const times = Object.keys(description.custom);
            times.sort((a, b) => (new Date(a) > new Date(b) ? 1 : -1));

            const dayDescription = custom ? this.daySchedule : null;
            return (
                <>
                    {times.map((t, i) => {
                        const m = new Date(t);
                        const check = new Date();
                        check.setDate(check.getDate() - 1);

                        const expired = m < check;
                        return (
                            <Inline key={i}>
                                <DayButton
                                    data-tip={expired ? "This date already happened" : ""}
                                    className={expired ? "warning-button" : ""}
                                    onClick={() => this.setState({ customSelected: t, addNewCustom: undefined })}
                                    disabled={this.state.customSelected === t}
                                >
                                    {m.toLocaleDateString()}
                                </DayButton>
                                <ReactTooltip place='top' type='info' effect='solid' />
                            </Inline>
                        );
                    })}
                    <Space />
                    {this.state.customSelected ? (
                        <DayButton
                            onClick={() => {
                                const description = this.s.getFullSchedule();
                                delete description.custom[this.state.customSelected];
                                this.s.setDescription(description);
                                this.setState({ customSelected: undefined });
                            }}
                        >
                            Remove ({this.state.customSelected})
                        </DayButton>
                    ) : null}

                    {this.renderNewCustomDatePicker()}

                    {dayDescription ? (
                        <DayScheduleBuilder
                            dayDescription={this.daySchedule}
                            als={this.props.als}
                            palette={this.props.palette}
                            onChange={this.onDescriptionChange}
                        />
                    ) : null}
                </>
            );
        }
        return (
            <DayScheduleBuilder
                dayDescription={this.daySchedule}
                als={this.props.als}
                palette={this.props.palette}
                onChange={this.onDescriptionChange}
            />
        );
    }

    private get s() {
        return this.props.als.scheduleService;
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
    };

    displayTime() {
        if (this.state.customDate && this.state.time) {
            return <Margin>{this.state.time}</Margin>;
        }
        return null;
    }

    render() {
        return (
            <div>
                <h1>Schedule builder</h1>
                <Flex>
                    <canvas ref={this.canvasRef} width={this.canvasWidth} height={this.canvasHeight}></canvas>
                    <InlineBlock>
                        <Flex>
                            <FlexColumn>
                                {this.displayTime()}
                                <DateInput
                                    type='datetime-local'
                                    onChange={data => {
                                        const value = (data.nativeEvent.target as HTMLInputElement).value;
                                        if (value) {
                                            const date = new Date(value);
                                            this.setState({ customDate: date });
                                        } else {
                                            this.setState({ customDate: undefined });
                                        }
                                    }}
                                />
                            </FlexColumn>
                            <Button className={this.state.saved ? "" : "warning-button"} onClick={this.onSave}>
                                Save
                            </Button>
                            {this.state.saved ? null : "You have unsaved schedule"}
                        </Flex>
                    </InlineBlock>
                </Flex>
                {this.days}
                {this.renderDaySchedule()}
            </div>
        );
    }
}

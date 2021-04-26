import React from "react";
import styled from "styled-components";
import { BaseDay, DatePicker } from "./DatePicker";
import { TimePicker } from "./TimePicker";

const Div = styled.div`
    background-color: rgb(42, 42, 42);
    display: inline-block;
    padding: 2px;
    margin: 2px;
    border-radius: 2px;
`;

interface DateAndTimePrickerProps {
    date?: Date;
    onDateChange: (data: Date) => void;
}

interface DateAndTimePrickerState {
    seconds: number;
    minutes: number;
    hours: number;
    day: number;
    month: number;
    year: number;
}

export class DateAndTimePricker extends React.Component<DateAndTimePrickerProps, DateAndTimePrickerState> {
    private date = new Date();
    constructor(props: DateAndTimePrickerProps) {
        super(props);
        const date = new Date();
        this.state = {
            seconds: 0,
            minutes: 0,
            hours: 0,
            day: 0,
            month: 0,
            year: 0,
        };
    }

    componentDidMount() {
        this.date = this.props.date;
        this.updateState(this.date);
    }

    onSomethingChange = () => {
        setTimeout(() => {
            this.updateDate(this.state);
            this.props.onDateChange(this.date);
        });
    };

    onDateChange = (day: number, month: number, year: number, _date: string) => {
        this.date.setMonth(month - 1);
        this.date.setFullYear(year);
        this.date.setDate(day);
        this.updateState(this.date);
        this.onSomethingChange();
    };
    onHourChange = (hours: number) => {
        this.setState({ hours });
        this.onSomethingChange();
    };
    onMinuteChange = (minutes: number) => {
        this.setState({ minutes });
        this.onSomethingChange();
    };
    onSecondsChange = (seconds: number) => {
        this.setState({ seconds });
        this.onSomethingChange();
    };

    get dateTruncated(): BaseDay {
        const d = this.date;
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        return { day, month, year };
    }

    updateState(date: Date) {
        const seconds = date.getSeconds();
        const minutes = date.getMinutes();
        const hours = date.getHours();
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        this.setState({ seconds, minutes, hours, day, month, year });
    }
    updateDate(date: DateAndTimePrickerState) {
        const { seconds, minutes, hours, day, month, year } = date;
        this.date.setSeconds(seconds);
        this.date.setMinutes(minutes);
        this.date.setHours(hours);
        this.date.setDate(day);
        this.date.setMonth(month);
        this.date.setFullYear(year);
    }
    render() {
        return (
            <Div>
                <TimePicker
                    hours={this.state.hours}
                    minutes={this.state.minutes}
                    seconds={this.state.seconds}
                    onHourChange={this.onHourChange}
                    onMinuteChange={this.onMinuteChange}
                    onSecondChange={this.onSecondsChange}
                />
                <DatePicker date={this.dateTruncated} onChange={this.onDateChange} />
            </Div>
        );
    }
}

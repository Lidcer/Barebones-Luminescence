import React from "react";
import styled from "styled-components";
import { AudioLightSystem } from "../../Utils/AudioSystem";

const Input = styled.input`
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

interface State {
    hours: number;
    minutes: number;
    seconds: number;
}

interface Props {
    time: string;
    onChange: (time: string) => void;
}

export class TimePickerSecond extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hours: 0,
            minutes: 0,
            seconds: 0,
        };
    }

    componentDidMount() {
        this.parseTime();
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
        if (prevProps.time !== this.props.time) {
            this.parseTime();
        }
    }
    parseTime() {
        const [hours, minutes, seconds] = this.props.time.split(":").map(e => parseInt(e, 10));
        this.setState({
            hours,
            minutes,
            seconds,
        });
    }

    update(state: State) {
        const str = `${state.hours.toString().padStart(2, "0")}:${state.minutes
            .toString()
            .padStart(2, "0")}:${state.seconds.toString().padStart(2, "0")}`;
        this.props.onChange(str);
    }

    render() {
        return (
            <div>
                <Input
                    type='number'
                    id='hours'
                    name='hours'
                    min='0'
                    max='23'
                    value={this.state.hours}
                    onChange={event => {
                        const value = parseInt(event.target.value, 10) || 0;
                        this.setState({ hours: value });
                        this.update({ ...this.state, hours: value });
                    }}
                />
                <Input
                    type='number'
                    id='minutes'
                    name='minutes'
                    min='0'
                    max='59'
                    value={this.state.minutes}
                    onChange={event => {
                        const value = parseInt(event.target.value, 10) || 0;
                        this.setState({ minutes: value });
                        this.update({ ...this.state, minutes: value });
                    }}
                />
                <Input
                    type='number'
                    id='seconds'
                    name='seconds'
                    min='0'
                    max='59'
                    value={this.state.seconds}
                    onChange={event => {
                        const value = parseInt(event.target.value, 10) || 0;
                        this.setState({ seconds: value });
                        this.update({ ...this.state, seconds: value });
                    }}
                />
            </div>
        );
    }
}

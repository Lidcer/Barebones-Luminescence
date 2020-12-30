import React from "react";
import { toInt } from "../../../shared/utils";
import styled from "styled-components";
import { clamp } from "lodash";

const Div = styled.div`
  width: 150px;
  align-items: center;
  text-align: center;
  background-color: transparent;
`;

const Time = styled.div`
  display: inline;
`;
const SelectableInput = styled.div`
  &::hover {
    border: 1px solid green;
  }
`;
const Input = styled.input`
  outline: none;
  display: inline;
  width: 30px;
  font-size: 20px;
  padding: 2px;
  margin: 2px;
  color: white;
  background: transparent;
  border: none;
`;

interface TimePickerState {
  editingMinutes: boolean;
  editingHours: boolean;
  editingSeconds: boolean;
  render: boolean;
}

interface TimePickerProps {
  hours: number;
  minutes: number;
  seconds: number;
  onHourChange: (hours: number) => void;
  onMinuteChange: (minute: number) => void;
  onSecondChange: (second: number) => void;
}

export class TimePicker extends React.Component<TimePickerProps, TimePickerState> {
  private readonly BORDER_SIZE = 2;
  private destroyed = false;
  private borderStyle: React.CSSProperties = { border: `${this.BORDER_SIZE}px solid white` };
  private clickOnDiv = false;
  private ref = React.createRef<HTMLDivElement>();
  private updated: number;
  private lastChangeTime = "";
  constructor(props: TimePickerProps) {
    super(props);
    const hours = toInt(props.hours);
    const minutes = toInt(props.minutes);
    const seconds = toInt(props.seconds);
    const editingHours = false;
    const editingMinutes = false;
    const editingSeconds = false;
    const render = true;
    this.lastChangeTime = `${this.displayNumber(hours)}:${this.displayNumber(minutes)}:${this.displayNumber(seconds)}`;
    this.state = { editingHours, editingMinutes, editingSeconds, render };
  }
  componentDidMount() {
    window.addEventListener("mouseup", this.onBlur);
    window.addEventListener("touchend", this.onBlur);
    window.addEventListener("mousedown", this.onFocus);
    window.addEventListener("touchstart", this.onFocus);
  }
  componentWillUnmount() {
    this.destroyed = true;
    window.removeEventListener("mouseup", this.onBlur);
    window.removeEventListener("touchend", this.onBlur);
    window.removeEventListener("mousedown", this.onFocus);
    window.removeEventListener("touchstart", this.onFocus);
  }
  onFocus = (ev: MouseEvent | MouseEvent) => {
    if (this.ref.current && this.ref.current.contains(ev.target as HTMLDivElement)) {
      this.clickOnDiv = true;
    }
  };
  onBlur = (ev?: MouseEvent | TouchEvent | boolean) => {
    const force = typeof ev === "boolean" ? ev : false;
    if (this.destroyed || this.clickOnDiv) {
      this.clickOnDiv = false;
      return;
    }
    this.setState({ editingHours: false, editingMinutes: false, editingSeconds: false, render: false });
    requestAnimationFrame(() => {
      if (this.destroyed) {
        return;
      }
      this.setState({ render: true });
      let can = false;
      if (ev instanceof MouseEvent || ev instanceof TouchEvent) {
        can = !(ev.target instanceof HTMLInputElement);
      }
    });
  };

  toNumber = (value: any, min: number, max: number) => {
    value = value.toString().replace(/\D/g, "");
    return clamp(toInt(value), min, max);
  };
  displayNumber(number: number | string) {
    number = typeof number === "number" ? Math.round(number).toString() : number;
    return number.length === 1 ? `0${number}` : number;
  }

  getInputStyle = (active: boolean): React.CSSProperties => {
    const style: React.CSSProperties = { border: `${this.BORDER_SIZE}px solid transparent` };
    if (active) {
      style.border = this.borderStyle.border;
    }
    return style;
  };

  get secondsInput() {
    const editingSeconds = this.state.editingSeconds;
    return (
      <Input
        style={this.getInputStyle(editingSeconds)}
        onClick={() => this.setState({ editingSeconds: true })}
        value={editingSeconds ? this.props.seconds : this.displayNumber(this.props.seconds)}
        onKeyDown={ev => ev.key.toLowerCase() === "enter" && this.onBlur(true)}
        onChange={ev => this.props.onSecondChange(this.toNumber(ev.target.value, 0, 59))}
      />
    );
  }
  get minuteInput() {
    const editingMinutes = this.state.editingMinutes;
    return (
      <Input
        style={this.getInputStyle(editingMinutes)}
        onClick={() => this.setState({ editingMinutes: true })}
        value={editingMinutes ? this.props.minutes : this.displayNumber(this.props.minutes)}
        onKeyDown={ev => ev.key.toLowerCase() === "enter" && this.onBlur(true)}
        onChange={ev => this.props.onMinuteChange(this.toNumber(ev.target.value, 0, 59))}
      />
    );
  }
  get hourInput() {
    const editingHours = this.state.editingHours;
    return (
      <Input
        style={this.getInputStyle(editingHours)}
        onClick={() => this.setState({ editingHours: true })}
        value={editingHours ? this.props.hours : this.displayNumber(this.props.hours)}
        onKeyDown={ev => ev.key.toLowerCase() === "enter" && this.onBlur()}
        onChange={ev => this.props.onHourChange(this.toNumber(ev.target.value, 0, 23))}
      />
    );
  }

  render() {
    const render = this.state.render ? (
      <div>
        {this.hourInput}:{this.minuteInput}:{this.secondsInput}
      </div>
    ) : null;
    return <Div ref={this.ref}>{render}</Div>;
  }
}

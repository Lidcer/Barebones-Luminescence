import React from "react";
import { toInt } from "../../../shared/utils";
import styled from "styled-components";
import { chunk, clamp } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

const Div = styled.div`
  width: 200px;
  align-items: center;
  text-align: center;
  background-color: transparent;
  td {
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: 2px;
    button {
      color: white;
      transition: color 0.25s;
    }
  }
`;
const Caption = styled.div`
  width: 90%;
  padding: 2px 0 0 10px;
  display: flex;
`;
const ArrowButtons = styled.div`
  margin-left: auto;
  button {
    background-color: transparent;
    color: gray;
    outline: none;
    border: none;
    margin: 2px;
    transition: color 0.25;
    :hover {
      color: white;
    }
  }
`;
const Time = styled.div`
  display: inline;
`;
const Button = styled.button`
  cursor: pointer;
  background-color: transparent;
  border: none;
  outline: none;
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

export interface BaseDay {
  day: number;
  month: number;
  year: number;
}

interface Day extends BaseDay {
  dayName: DayNames;
}

interface DatePickerState extends Day {
  render: boolean;
}

interface DatePickerProps {
  onChange: (day: number, month: number, year: number, date: string) => void;
  date: BaseDay;
}
type DayNames = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
interface CalendarDay extends Day {
  active: boolean;
}

export class DatePicker extends React.Component<DatePickerProps, DatePickerState> {
  private readonly DAYS: DayNames[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  private readonly MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  private ref = React.createRef<HTMLDivElement>();
  private invalidDate = new Date("").toString();
  private readonly BORDER_SIZE = 2;
  private destroyed = false;

  constructor(props: DatePickerProps) {
    super(props);
    const date = new Date();
    const render = true;
    const day = props.date.day || date.getDate();
    const dayName = this.DAYS[date.getDay()];
    const month = props.date.month || date.getMonth() + 1;
    const year = props.date.year || date.getFullYear();
    this.state = { render, dayName, day, month, year };
  }

  componentDidMount() {}
  componentWillUnmount() {
    this.destroyed = true;
  }
  getMonthDays(month: number, year: number) {
    const days: DayNames[] = [];
    const MAX_DAYs = 31;
    const monthNumber = new Date(`${month}-15-${year}`).getMonth();
    for (let i = 1; i <= MAX_DAYs; i++) {
      const date = new Date(`${month}-${i}-${year}`);
      if (this.invalidDate === date.toString() || date.getMonth() !== monthNumber) {
        break;
      }
      days.push(this.DAYS[date.getDay()]);
    }
    return days;
  }

  getMonthTable(month: number, year: number) {
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const days = this.getMonthDays(month, year);
    let daysIndex = 0;
    const iterations = daysOrder.length * 6;
    const grid: CalendarDay[] = [];
    let start: number = -1;
    let end: number = -1;
    for (let i = 0; i < iterations; i++) {
      const day = daysOrder[i % daysOrder.length];
      if (day === days[daysIndex]) {
        const index = daysIndex + 1;
        const obj: CalendarDay = { active: true, day: index, dayName: day, month, year };

        if (daysIndex === 0) {
          start = i;
        }
        grid.push(obj);
        end = i;
        daysIndex++;
      } else {
        grid.push({ active: false, day: -1, month, year, dayName: "Monday" });
      }
    }

    let monthDiff = month - 1;
    let yearDiff = year;
    if (monthDiff === 0) {
      monthDiff = 12;
      yearDiff -= 1;
    }
    const preDays = this.getMonthDays(monthDiff, yearDiff);
    start--;
    for (let i = preDays.length; i > 0; i--) {
      if (grid[start]) {
        grid[start].day = i;
        grid[start].month = monthDiff;
        grid[start].year = yearDiff;
        const d = new Date(`${monthDiff}-${i}-${yearDiff}`);
        grid[start].dayName = this.DAYS[d.getDay()];
        start--;
      } else {
        break;
      }
    }
    monthDiff = month + 1;
    yearDiff = year;
    if (monthDiff === 13) {
      monthDiff = 1;
      yearDiff += 1;
    }
    end++;
    let count = 1;
    for (let i = end; i < grid.length; i++) {
      grid[i].day = count;
      grid[i].month = monthDiff;
      grid[i].year = yearDiff;
      const d = new Date(`${monthDiff}-${count}-${yearDiff}`);
      grid[i].dayName = this.DAYS[d.getDay()];
      count++;
    }
    return grid;
  }
  calendarDayToDate(calendarDay: CalendarDay) {
    const { month, day, year } = calendarDay;
    return new Date(`${month}-${day}-${year}`);
  }

  onDateClick(calendarDay: CalendarDay) {
    const { month, year, day } = calendarDay;
    this.props.onChange(day, month, year, `${month}-${day}-${year}`);
    this.setState({ month, year, day });
  }

  getRD(week: CalendarDay[]) {
    return week.map((e, j) => {
      const style: React.CSSProperties = {};
      const styleButton: React.CSSProperties = {};
      if (e.day === this.state.day && e.month === this.state.month) {
        style.border = "1px solid white";
      }
      if (!e.active) {
        styleButton.color = "#7f7f7f";
      }

      return (
        <td key={j} style={style}>
          <Button style={styleButton} onClick={() => this.onDateClick(e)}>
            {e.day}
          </Button>
        </td>
      );
    });
  }

  getTR(calendarDays: CalendarDay[][]) {
    return calendarDays.map((week, i) => {
      return <tr key={i}>{this.getRD(week)}</tr>;
    });
  }
  correctDate(day: number, month: number, year: number) {
    if (month === 13) {
      month = 1;
      year++;
    }
    if (month === 0) {
      month = 12;
      year--;
    }
    const isDayValid = (d: Date) => {
      return !(this.invalidDate === d.toString() || (month === 2 && (d.getMonth() === 0 || d.getMonth() === 2)));
    };
    const date = new Date(`${month}-${day}-${year}`);
    if (!isDayValid(date)) {
      day = 29;
      const date = new Date(`${month}-${day}-${year}`);
      if (!isDayValid(date)) {
        day = 28;
      }
    }
    return { month, year, day };
  }

  changeMonth(incitementDiscernment: number) {
    const { month, year, day } = this.state;
    let m = month;
    if (incitementDiscernment === 1) {
      m++;
    } else if (incitementDiscernment === -1) {
      m--;
    }
    const date = this.correctDate(day, m, year);

    this.setState({ month: date.month, year: date.year, day: date.day });
  }

  getFontAwesomeArrows(icon: IconProp, onClick: (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) {
    return (
      <button onClick={onClick}>
        <FontAwesomeIcon icon={icon} />
      </button>
    );
  }

  get renderTable() {
    const date = chunk(this.getMonthTable(this.state.month, this.state.year), this.DAYS.length);
    return (
      <div>
        <Caption>
          <span>
            {this.state.year} {this.MONTHS[this.state.month - 1]}
          </span>
          <ArrowButtons>
            {this.getFontAwesomeArrows(faArrowUp, () => this.changeMonth(-1))}
            {this.getFontAwesomeArrows(faArrowDown, () => this.changeMonth(1))}
          </ArrowButtons>
        </Caption>
        <table>
          <thead>
            <tr>
              <th>Mo</th>
              <th>Tu</th>
              <th>We</th>
              <th>Th</th>
              <th>Fr</th>
              <th>Sa</th>
              <th>Su</th>
            </tr>
          </thead>
          <tbody>{this.getTR(date)}</tbody>
        </table>
      </div>
    );
  }

  render() {
    return <Div ref={this.ref}>{this.renderTable}</Div>;
  }
}

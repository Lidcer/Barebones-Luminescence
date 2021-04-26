import { Logger } from "./logger";
import { PatternAnimator } from "./PatternAnimator";
import { cloneDeep, getDayString, toInt } from "./utils";
import {
    DayDescription,
    DayDescriptionVague,
    DayNames,
    LedPattern,
    LightMode,
    RGB,
    SchedulerDescription,
    SchedulerDescriptionVague,
} from "../shared/interfaces";

export interface TimeParser {
    stringTime: string;
    start: number[];
    end: number[];
}
export interface TimeParse {
    sTime: number[];
    eTime: number[];
}

export interface SortedDayDescription {
    [key: string]: DayDescription;
}

// 00-00
export class Scheduler {
    private readonly DAYS: DayNames[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    private frame: NodeJS.Timeout;
    private schedulerDescription: SchedulerDescription;
    private patternAnimator = new PatternAnimator();
    private map = new Map<DayDescription, TimeParser[]>();
    private RGB: RGB = { r: 0, b: 0, g: 0 };

    constructor(schedulerDescription: SchedulerDescription) {
        this.loadSchedule(schedulerDescription);
        this.tick();
    }

    loadSchedule(schedulerDescription: SchedulerDescription) {
        this.map.clear();
        this.schedulerDescription = cloneDeep(schedulerDescription);
    }
    getDate() {
        return new Date();
    }
    destroy = () => {
        if (this.frame) {
            clearTimeout(this.frame);
        }
    };
    get state() {
        return this.RGB;
    }
    private getDay = (date: Date) => {
        return this.DAYS[date.getDay()];
    };
    private parseDay(date: Date) {
        const custom = this.schedulerDescription.custom;
        const dateString = getDayString(date);
        const customValue = custom[dateString];
        if (customValue) {
            return customValue;
        } else {
            const day = this.getDay(date);
            const description = this.schedulerDescription[day];
            return description;
        }
    }
    private getMockDate(hours: number, minutes: number, seconds: number) {
        const someDate = new Date(0);
        someDate.setHours(hours);
        someDate.setMinutes(minutes);
        someDate.setSeconds(seconds);
        return someDate;
    }
    private setLed(date: Date, times: TimeParser[], dayDescription: DayDescription) {
        const someDate = this.getMockDate(date.getHours(), date.getMinutes(), date.getSeconds());
        const range = times.filter(o => {
            const start = this.getMockDate(o.start[0], o.start[1], o.start[2]);
            const end = this.getMockDate(o.end[0], o.end[1], o.end[2]);
            return someDate >= start && someDate <= end;
        });
        const value = range[0];
        if (value) {
            const description = dayDescription[value.stringTime];
            if (description.type === "Pattern") {
                const data = description.data as LedPattern;
                if (!this.patternAnimator.isPatternActive(data)) {
                    this.patternAnimator.loadPattern(data);
                }
                this.patternAnimator.draw();
                this.RGB.r = this.patternAnimator.state.r;
                this.RGB.g = this.patternAnimator.state.g;
                this.RGB.b = this.patternAnimator.state.b;
            } else {
                const data = description.data as RGB;
                this.RGB.r = data.r;
                this.RGB.g = data.g;
                this.RGB.b = data.b;
            }
        } else {
            this.RGB.r = 0;
            this.RGB.g = 0;
            this.RGB.b = 0;
        }
    }
    private tick = () => {
        const date = this.getDate();
        const description = this.parseDay(date);
        const pt = parseTimes(description, this.map);
        this.setLed(date, pt, description);
        this.frame = setTimeout(this.tick, 1);
    };
}

export function parseDayDescriptionVague(description: DayDescriptionVague, patterns: LedPattern[]) {
    const entires = Object.entries(description);
    const dayDescription: Partial<DayDescription> = {};
    for (const [value, data] of entires) {
        if (data.type === "Pattern") {
            const patternName = data.data;
            const pattern = patterns.find(e => e.name === patternName);
            if (pattern) {
                dayDescription[value] = {
                    type: data.type,
                    data: pattern,
                };
            } else {
                Logger.debug("Pattern parser", `Pattern name "${patternName}" not found`);
            }
        } else if (data.type === "RGB") {
            dayDescription[value] = {
                type: data.type,
                data: data.data as RGB,
            };
        } else {
            Logger.debug("Pattern parser", `Unknown type "${data.type}"`);
        }
    }
    return dayDescription as DayDescription;
}
export function convertDayDescriptionToVague(description: DayDescription) {
    const entires = Object.entries(description);
    const dayDescription: Partial<DayDescriptionVague> = {};
    for (const [value, data] of entires) {
        if (data.type === "Pattern") {
            const patternName = data.data as LedPattern;
            dayDescription[value] = {
                type: data.type,
                data: patternName.name,
            };
        } else if (data.type === "RGB") {
            dayDescription[value] = {
                type: data.type,
                data: data.data as RGB,
            };
        } else {
            Logger.debug("Pattern parser", `Unknown type "${data.type}"`);
        }
    }
    return dayDescription as DayDescriptionVague;
}

export function convertSchedulerDescription(schedulerDescription: SchedulerDescriptionVague, patterns: LedPattern[]) {
    const entires = Object.entries(schedulerDescription);
    const schedulerDescriptionFull: Partial<SchedulerDescription> = {};
    for (const [value, descriptor] of entires) {
        if (value === "mode") {
            schedulerDescriptionFull[value] = descriptor as LightMode;
        } else if (value === "custom") {
            const ent = Object.entries(descriptor);
            schedulerDescriptionFull[value] = {};
            for (const [time, des] of ent) {
                schedulerDescriptionFull[value][time] = parseDayDescriptionVague(des, patterns);
            }
        } else {
            schedulerDescriptionFull[value] = parseDayDescriptionVague(descriptor as DayDescriptionVague, patterns);
        }
    }
    return schedulerDescriptionFull as SchedulerDescription;
}
export function convertSchedulerDescriptionVague(schedulerDescription: SchedulerDescription) {
    const entires = Object.entries(schedulerDescription);
    const schedulerDescriptionFull: Partial<SchedulerDescriptionVague> = {};
    for (const [value, descriptor] of entires) {
        if (value === "mode") {
            schedulerDescriptionFull[value] = descriptor as LightMode;
        } else if (value === "custom") {
            const ent = Object.entries(descriptor);
            schedulerDescriptionFull[value] = {};
            for (const [time, des] of ent) {
                schedulerDescriptionFull[value][time] = convertDayDescriptionToVague(des);
            }
        } else {
            schedulerDescriptionFull[value] = convertDayDescriptionToVague(descriptor as DayDescription);
        }
    }
    return schedulerDescriptionFull as SchedulerDescriptionVague;
}

export function parseTimes(dayDescription: DayDescription, map: Map<DayDescription, TimeParser[]>) {
    const value = map.get(dayDescription);
    if (value) {
        return value;
    }

    const times = Object.keys(dayDescription);
    const parsedTimes: TimeParser[] = [];

    for (let i = 0; i < times.length; i++) {
        const value = parseTime(times[i]);
        if (!value) {
            Logger.debug("Scheduler", `Invalid time ${times[i]}`);
            break;
        }
        parsedTimes.push({
            stringTime: times[i],
            start: value.sTime,
            end: value.eTime,
        });
    }
    parsedTimes.sort((a, b) => {
        const hour = a.start[0] < b.start[0] ? -1 : 1;
        const minute = a.start[1] < b.start[1] ? -1 : 1;
        const second = a.start[2] < b.start[2] ? -1 : 1;
        return hour + minute + second > 0 ? -1 : 1;
    });
    map.set(dayDescription, parsedTimes);
    Logger.debug("Scheduler", "ParsedTimes", parsedTimes);
    return parsedTimes;
}

export const TIME_SPLITTER = ":";
export const TIME_SEPARATOR = "-";
export function parseTime(value: string): TimeParse {
    const startEnd = value.split(TIME_SEPARATOR);
    if (startEnd.length !== 2) {
        Logger.debug("Scheduler", `Invalid time ${value}`);
        return null;
    }
    const sTime = startEnd[0].split(TIME_SPLITTER).map(e => toInt(e));
    const eTime = startEnd[1].split(TIME_SPLITTER).map(e => toInt(e));

    for (const t of [sTime, sTime]) {
        for (let i = 0; i < t.length; i++) {
            if (t[i] < 0 || (i === 0 && t[i] > 24) || t[i] > 60) {
                return null;
            }
        }
    }
    return { sTime, eTime };
}

export function dayDescriptionToArray(dayDescription: DayDescription) {
    const keys = Object.keys(dayDescription);
    const keysParsed: TimeParser[] = [];
    for (const key of keys) {
        const value = parseTime(key);
        if (value) {
            keysParsed.push({
                stringTime: key,
                end: value.eTime,
                start: value.sTime,
            });
        }
    }

    keysParsed.sort((a, b) => {
        let result = a.start[0] - b.start[0];
        if (result > 0) {
            const result2 = Math.abs(a.start[1] + b.start[1]);
            result += Math.abs(a.start[1] + b.start[1]);
            if (result2 < 0) {
                result += Math.abs(a.start[2] + b.start[2]);
            }
        }
        return result;
    });
    const descArray: SortedDayDescription[] = [];
    for (const key of keysParsed) {
        const obj = {};
        obj[key.stringTime] = dayDescription[key.stringTime];
        descArray.push(obj);
    }
    return descArray;
}

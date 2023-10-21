import { ClientType, LightMode, ScheduleType } from "./interfaces";
import { randomString } from "./utils";

export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const WEEK = DAY * 7;
export const MONTH = Math.floor(DAY * 30.42);
export const YEAR = Math.floor(DAY * 365.25);
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const MODES: LightMode[] = ["fade", "instant"];
export const SCHEDULE_TYPE: ScheduleType[] = ["Pattern", "RGB"];
export const userClients: ClientType[] = ["browser-client", "android-app", "android-app-background"];

export const SUNRISE_SUNSET_API = "https://api.sunrise-sunset.org/json";

export const HASH = randomString(16);

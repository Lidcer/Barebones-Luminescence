import { StringNullableChain } from "lodash";
import * as os from "os";
export type ControllerMode =
    | "Manual"
    | "ManualForce"
    | "ManualLocked"
    | "AutoPilot"
    | "Pattern"
    | "Audio"
    | "AudioRaw"
    | "Door";

export type DayNames = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type LightMode = "instant" | "fade";
export type ScheduleType = "Pattern" | "RGB";

export type ClientType = "audio-server" | "browser-client" | "android-app" | "android-app-background" | "unknown";

export interface SocketAuth {
    password: string;
    clientType: ClientType;
}

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface HSV {
    h: number;
    s: number;
    v: number;
}

export interface ServerInfo {
    memoryUsage: NodeJS.MemoryUsage;
    version: string;
    arch: string;
    cpuUsage: NodeJS.CpuUsage;
    cpuUsageHistory: number[];
    temperature: number[];
    uptime: number;
    os: {
        cpus: os.CpuInfo[];
        userInfo: os.UserInfo<string>;
        platform: string;
        release: string;
        totalmem: number;
        uptime: number;
    };
}

export interface RtAudioDeviceInf {
    name: string;
    duplexChannels: number;
    inputChannels: number;
    isDefaultInput: boolean;
    isDefaultOutput: boolean;
    nativeFormats: number;
    outputChannels: number;
    preferredSampleRate: number;
    sampleRates: number[];
}

export interface ActiveDevice {
    computerName: string;
    device: RtAudioDeviceInf;
    samplingRate: number;
    frameSize: number;
}

export interface AudioDeviceUpdate {
    type: "audio-device-update";
    data: {
        name: string;
        id: number;
        frameSize: number;
        sampleRate: number;
    };
}

export interface AudioApiUpdate {
    type: "audio-api-update";
    data: number;
}

export interface AudioUpdateInternalProcessing {
    type: "audi-internal-processing";
    data: boolean;
}

export type AudioUpdate = AudioDeviceUpdate | AudioApiUpdate | AudioUpdateInternalProcessing;

export interface LedPatternItem {
    rgb: RGB;
    mode: LightMode;
    delay: number;
}

export interface LedPattern {
    ledPattern: LedPatternItem[];
    name: string;
}
export interface LedPatternObject {
    [name: string]: LedPatternItem[];
}

export interface Log {
    type: "log" | "info" | "error" | "fatal";
    title: string;
    description?: string;
}

export interface DayDescription {
    // 00:00:00-00:00:00   hour-month-second
    [hourMonthSecondSplitterHourMonthSecond: string]: HourDescriptor;
}
export interface DayDescriptionVague {
    // 00:00:00-00:00:00   hour-month-second
    [hourMonthSecondSplitterHourMonthSecond: string]: HourDescriptorVague;
}

export interface HourDescriptor {
    type: ScheduleType;
    data: LedPattern | RGB;
}
export interface HourDescriptorVague {
    type: ScheduleType;
    data: string | RGB;
}

export type SchedulerDescriptionVague = {
    [key in DayNames]: DayDescriptionVague;
} & {
    custom: {
        [monthDayYear: string]: DayDescriptionVague; // 00-00-0000 | month-day-year
    };
    mode: LightMode;
};

export type SchedulerDescription = {
    [key in DayNames]: DayDescription;
} & {
    custom: {
        [monthDayYear: string]: DayDescription; // 00-00-0000 | month-day-year
    };
    mode: LightMode;
};

export interface ServerSettings {
    magicHome: {
        ips: string[];
        blockedIp: string[];
    };
    schedule: SchedulerDescriptionVague;
    controllerMode: ControllerMode;
    patterns: LedPattern[];
}
export interface FetchableServerConfig {
    doorSensor: boolean;
    magicController: boolean;
    version: string;
    mode: ControllerMode;
}

export interface LoginData {
    status: "ok" | "failed";
    message?: string;
}

export type DoorLog = { [dateString: string]: number };

export interface SunSetApi {
    sunrise: string;
    sunset: string;
    solar_noon: string;
    day_length: string;
    civil_twilight_begin: string;
    civil_twilight_end: string;
    nautical_twilight_begin: string;
    nautical_twilight_end: string;
    astronomical_twilight_begin: string;
    astronomical_twilight_end: string;
}

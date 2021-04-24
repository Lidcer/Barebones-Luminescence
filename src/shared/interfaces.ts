import * as os from "os";
export type ControllerMode = "Manual" | "ManualForce" | "ManualLocked" | "AutoPilot" | "Pattern" | "Audio" | "AudioRaw" | "Door";
export type DayNames = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type LightMode = "instant" | "fade";
export type ScheduleType = "Pattern" | "RGB";

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

export interface DeviceUpdate {
  name: string;
  id: number;
  frameSize: number;
  sampleRate: number;
}

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

export interface SocketLog {
  type: "log" | "info" | "error" | "fatal";
  name: string;
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

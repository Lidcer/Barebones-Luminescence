export enum ServerMessagesRaw {
    RGBSet,
    RGBGet,
    ModeSet,
    ModeGet,
    Settings,
    Config,
    DoorLog,
    DoorClear,
    CamGet,
    CamTake,
    DeviceInfo,

    AudioGetDevices,
    AudioPcm,
    AudioPcmReport,
    AudioActiveDevice,
    AudioAllDevices,
    AudioSettingsUpdate,
    AudioIsServerConnected,
    AudioIsInternalAudioProcessing,
    AudioApis,

    PatternGet,
    PatternSet,
    ScheduleGet,
    ScheduleSet,
}

export enum ClientMessagesRaw {
    Login,
    RGBUpdate,
    ModeUpdate,
    DoorOpen,
    DoorImageAvailable,
    SocketLog,
    SettingsUpdate,

    PCM,

    AudioGetDevices,
    AudioActiveDevice,
    AudioAllDevices,
    AudioApis,
    AudioSettingsUpdate,
    AudioIsInternalAudioProcessing,
    AudioServerConnected,
    AudioServerDisconnected,

    PatternUpdate,
    ScheduleUpdate,
}

export enum SpecialEvents {
    Connect = 251,
    Disconnect = 252,
    PromiseError = 253,
    PromiseResolve = 254,
    Promise = 255,
}

export const ClientMessages = {
    ...ClientMessagesRaw,
    ...SpecialEvents,
};

export const ServerMessages = {
    ...ServerMessagesRaw,
    ...SpecialEvents,
};

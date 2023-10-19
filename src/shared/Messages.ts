export enum ServerMessagesRaw {
    Login,

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

    AudioIsAudioServerConnected,
    AudioGetDevices,
    AudioPcm,
    AudioPcmReport,
    AudioActiveDevice,
    AudioAllDevices,
    AudioAudioSettingsUpdate,
    AudioIsInternalAudioProcessing,
    AudioApis,
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



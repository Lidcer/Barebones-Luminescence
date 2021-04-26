declare const Logger: {
    debug(message: string, ...optionalParams: any[]): void;
    log(message: string, ...optionalParams: any[]): void;
    info(message: string, ...optionalParams: any[]): void;
    warn(message: string, ...optionalParams: any[]): void;
    error(message: string, ...optionalParams: any[]): void;
    fatal(message: string, ...optionalParams: any[]): void;
};

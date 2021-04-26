import moment from "moment";
import chalk from "chalk";
const { white, yellow, red } = chalk;

type LogTypes = "debug" | "log" | "info" | "warn" | "error" | "fatal";
type NextFunction = (type: LogTypes, value: string, ...args: any[]) => void;
let nextFunction: NextFunction | undefined;

export class Logger {
    private static getTime() {
        const date = moment.utc().toDate();
        const text = moment(date).format("MMMM Do YYYY, HH:mm:ss");
        return text;
    }

    static debug(message: string, ...optionalParams: any[]) {
        if (!DEV) return;
        const text = this.getTime();
        const args = [yellow(`${text}`), white("[debug]"), message, ...optionalParams].filter(a => a);
        if (nextFunction) {
            nextFunction.apply(null, ["debug", message, ...optionalParams]);
        }
        console.debug.apply(null, args);
    }

    static log(message: string, ...optionalParams: any[]) {
        if (!DEV) return;
        const text = this.getTime();
        const args = [yellow(`${text}`), white("[log]"), message, ...optionalParams].filter(a => a);
        if (nextFunction) {
            nextFunction.apply(null, ["log", message, ...optionalParams]);
        }
        console.log.apply(null, args);
    }

    static info(message: string, ...optionalParams: any[]) {
        const text = this.getTime();
        const args = [yellow(`${text}`), yellow("[INFO]"), message, ...optionalParams].filter(a => a);
        if (nextFunction) {
            nextFunction.apply(null, ["info", message, ...optionalParams]);
        }
        console.info.apply(null, args);
    }

    static warn(message: string, ...optionalParams: any[]) {
        const text = this.getTime();
        const args = [yellow(`${text}`), red("[WARN]"), message, ...optionalParams].filter(a => a);
        if (nextFunction) {
            nextFunction.apply(null, ["warn", message, ...optionalParams]);
        }
        console.warn.apply(null, args);
    }

    static error(message: string, ...optionalParams: any[]) {
        const text = this.getTime();
        const args = [yellow(`${text}`), red("[ERROR]"), message, ...optionalParams].filter(a => a);
        if (nextFunction) {
            nextFunction.apply(null, ["error", message, ...optionalParams]);
        }
        console.error.apply(null, [...args, new Error().stack]);
    }

    static fatal(message: string, ...optionalParams: any[]) {
        const text = this.getTime();
        const args = [yellow(`${text}`), red("[FATAL]"), message, ...optionalParams].filter(a => a);
        if (nextFunction) {
            nextFunction.apply(null, ["fatal", message, ...optionalParams]);
        }
        console.error.apply(null, [...args, new Error().stack]);
    }

    static setNext(next: NextFunction) {
        nextFunction = next;
    }
}

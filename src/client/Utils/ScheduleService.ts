import { EventEmitter, Listener } from "events";
import { SchedulerDescription, SchedulerDescriptionVague } from "../../shared/interfaces";
import { Logger } from "../../shared/logger";
import { convertSchedulerDescription, convertSchedulerDescriptionVague } from "../../shared/Scheduler";
import { PatternService } from "./Patterns";
import { LightSocket } from "./Socket";
import { ServerMessagesRaw } from "../../shared/Messages";
import { quickBuffer } from "../../shared/utils";

export class ScheduleService {
    private schedulerDescription: SchedulerDescriptionVague = {
        Friday: {},
        Monday: {},
        Saturday: {},
        Sunday: {},
        Thursday: {},
        Tuesday: {},
        Wednesday: {},
        custom: {},
        mode: "fade",
    };
    private fetched = false;
    private eventEmitter = new EventEmitter();
    private _updated = true;

    constructor(private lightSocket: LightSocket, private patternService: PatternService) {
        //lightSocket.clientSocket.on("schedule-update", this.scheduleUpdate);
    }
    async fetchSchedule(force = false) {
        if (this.fetched && !force) {
            return this.schedulerDescription;
        }
        try {
            await this.patternService.fetchPattern();
            const result = await this.lightSocket.emitPromiseIfPossible(ServerMessagesRaw.ScheduleGet);
            this.schedulerDescription = JSON.parse(result.getUtf8String());
        } catch (error) {
            DEV && Logger.debug("Fetch Schedule", error);
        }
        return this.schedulerDescription;
    }

    on(type: "on-save-change", listener: (save: boolean) => void): void;
    on(type: "update", listener: (patterns: SchedulerDescriptionVague) => void): void;
    on(type: string, listener: Listener) {
        return this.eventEmitter.on(type, listener);
    }
    off(type: "on-save-change", listener: (save: boolean) => void): void;
    off(type: "update", listener: (patterns: SchedulerDescriptionVague) => void): void;
    off(type: string, listener: Listener) {
        return this.eventEmitter.off(type, listener);
    }
    scheduleUpdate = async (schedulerDescription: SchedulerDescriptionVague) => {
        this.schedulerDescription = schedulerDescription;
        this.eventEmitter.emit("update", this.schedulerDescription);
        this.setUpdate(true);
    };
    get description() {
        return this.schedulerDescription;
    }
    async sendSchedule() {
        console.log(this.schedulerDescription);
        await this.lightSocket.emitPromiseIfPossible(
            ServerMessagesRaw.ScheduleSet,
            quickBuffer(this.schedulerDescription),
        );
        this.setUpdate(true);
    }
    getFullSchedule() {
        return convertSchedulerDescription(this.schedulerDescription, this.patternService.patterns);
    }
    getPattern(name: string) {
        return this.patternService.patterns.find(e => e.name === name);
    }
    setDescriptionVague(description: SchedulerDescriptionVague) {
        this.schedulerDescription = description;
        this.setUpdate(false);
    }
    setDescription(description: SchedulerDescription) {
        this.schedulerDescription = convertSchedulerDescriptionVague(description);
        this.setUpdate(false);
    }
    destroy() {
        //this.lightSocket.clientSocket.off("schedule-update", this.scheduleUpdate);
    }
    get updated() {
        return this._updated;
    }
    private setUpdate(value: boolean) {
        if (value !== this._updated) {
            this._updated = value;
            this.eventEmitter.emit("on-save-change", this._updated);
        }
    }
}

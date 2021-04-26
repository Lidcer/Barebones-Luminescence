import { LedPattern, SchedulerDescriptionVague } from "../../../shared/interfaces";
import { convertSchedulerDescription, Scheduler } from "../../../shared/Scheduler";
import { saveSettings, settings } from "../main/storage";
import { WebSocket } from "../socket/Websocket";

export class AutoPilot {
    private _patterns: LedPattern[] = [];
    private _scheduler: Scheduler;
    constructor(websocket: WebSocket) {
        const s = convertSchedulerDescription(settings.schedule, settings.patterns);
        this._patterns = settings.patterns;
        this._scheduler = new Scheduler(s);

        websocket.onPromise("patterns-get", async client => {
            client.validateAuthentication();
            return this.patterns;
        });
        websocket.onPromise<void, [LedPattern[]]>("patterns-set", async (client, patterns) => {
            client.validateAuthentication();
            if (Array.isArray(patterns)) {
                this._patterns = patterns.filter(
                    o => Array.isArray(o.ledPattern) && typeof o.name === "string" && o.name,
                );
                settings.patterns = this._patterns;
                await saveSettings();
                websocket.broadcast("patterns-update", this._patterns);
            } else {
                throw new Error("Pattern are not in array");
            }
        });
        websocket.onPromise<SchedulerDescriptionVague, []>("schedule-get", async client => {
            client.validateAuthentication();
            return settings.schedule;
        });
        websocket.onPromise<SchedulerDescriptionVague, [SchedulerDescriptionVague]>(
            "schedule-set",
            async (client, schedule) => {
                client.validateAuthentication();
                const s = convertSchedulerDescription(schedule, settings.patterns);
                this._scheduler.loadSchedule(s);
                settings.schedule = schedule;
                await saveSettings();
                websocket.broadcast("schedule-update", settings.schedule);
                websocket.broadcastLog("info", "Schedule has been changed");
                return settings.schedule;
            },
        );
    }

    updateScheduler() {
        const s = convertSchedulerDescription(settings.schedule, settings.patterns);
        this._scheduler = new Scheduler(s);
    }

    get patterns() {
        return this._patterns;
    }

    set pattern(_patterns: LedPattern[]) {}

    get scheduler() {
        return this._scheduler;
    }
}

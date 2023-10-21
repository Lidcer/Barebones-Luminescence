import { LedPattern } from "../../../shared/interfaces";
import { ClientMessagesRaw, ServerMessagesRaw } from "../../../shared/Messages";
import { BinaryBuffer, utf8StringLen } from "../../../shared/messages/BinaryBuffer";
import { convertSchedulerDescription, Scheduler } from "../../../shared/Scheduler";
import { quickBuffer } from "../../../shared/utils";
import { saveSettings, settings } from "../main/storage";
import { WebSocket } from "../socket/Websocket";

export class AutoPilot {
    private _patterns: LedPattern[] = [];
    private _scheduler: Scheduler;
    constructor(websocket: WebSocket) {
        const s = convertSchedulerDescription(settings.schedule, settings.patterns);
        this._patterns = settings.patterns;
        this._scheduler = new Scheduler(s);

        websocket.onPromise(ServerMessagesRaw.PatternGet, async (_, client) => {
            client.validateAuthentication();
            return quickBuffer(this.patterns);
        });
        websocket.onPromise(ServerMessagesRaw.PatternSet, async (buffer, client) => {
            client.validateAuthentication();
            const patterns = JSON.parse(buffer.getUtf8String());
            if (Array.isArray(patterns)) {
                this._patterns = patterns.filter(
                    o => Array.isArray(o.ledPattern) && typeof o.name === "string" && o.name,
                );
                settings.patterns = this._patterns;
                await saveSettings(true);
                const json = JSON.stringify(this._patterns);
                const retrieveBuffer = new BinaryBuffer(utf8StringLen(json)).setUtf8String(json).getBuffer();
                websocket.broadcast(ClientMessagesRaw.PatternUpdate, retrieveBuffer);
                return retrieveBuffer;
            } else {
                throw new Error("Pattern are not in array");
            }
        });
        websocket.onPromise(ServerMessagesRaw.ScheduleGet, async (_, client) => {
            client.validateAuthentication();
            const json = JSON.stringify(settings.schedule);
            return new BinaryBuffer(utf8StringLen(json)).setUtf8String(json).getBuffer();
        });
        websocket.onPromise(ServerMessagesRaw.ScheduleSet, async (buffer, client) => {
            const raw = buffer.getUtf8String();
            const schedule = JSON.parse(raw);
            client.validateAuthentication();
            const s = convertSchedulerDescription(schedule, settings.patterns);
            this._scheduler.loadSchedule(s);
            settings.schedule = schedule;
            await saveSettings(true);

            const json = JSON.stringify(settings.schedule);
            const retrieveBuffer = new BinaryBuffer(utf8StringLen(json)).setUtf8String(json).getBuffer();
            websocket.broadcast(ClientMessagesRaw.ScheduleUpdate, retrieveBuffer);
            websocket.broadcastLog("info", "Schedule has been changed");
            return retrieveBuffer;
        });
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

import { EventEmitter } from "events";
import { SchedulerDescription, SchedulerDescriptionVague } from "../../shared/interfaces";
import { Logger } from "../../shared/logger";
import { convertSchedulerDescription, convertSchedulerDescriptionVague } from "../../shared/Scheduler";
import { PatternService } from "./Patterns";
import { LightSocket } from "./Socket";

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

  constructor(private lightSocket: LightSocket, private patternService: PatternService) {
    lightSocket.clientSocket.on("schedule-update", this.patternUpdate);
  }
  async fetchSchedule(force = false) {
    if (this.fetched && !force) {
      return this.schedulerDescription;
    }
    try {
      await this.patternService.fetchPattern();
      const result = await this.lightSocket.emitPromiseIfPossible<SchedulerDescriptionVague, []>("schedule-get");
      this.schedulerDescription = result;
    } catch (error) {
      DEV && Logger.debug("Fetch Schedule", error);
    }
    return this.schedulerDescription;
  }

  on(type: "update", listener: (patterns: SchedulerDescriptionVague) => void): void;
  on(type: string, listener: (patterns: SchedulerDescriptionVague) => void) {
    return this.eventEmitter.on(type, listener);
  }
  off(type: "update", listener: (patterns: SchedulerDescriptionVague) => void): void;
  off(type: string, listener: (patterns: SchedulerDescriptionVague) => void) {
    return this.eventEmitter.off(type, listener);
  }
  patternUpdate = (schedulerDescription: SchedulerDescriptionVague) => {
    this.schedulerDescription = schedulerDescription;
    this.eventEmitter.emit("update", this.schedulerDescription);
  };
  get description() {
    return this.schedulerDescription;
  }
  async sendSchedule() {
    await this.lightSocket.emitPromiseIfPossible<void, [SchedulerDescriptionVague]>(
      "schedule-set",
      this.schedulerDescription,
    );
  }
  getFullSchedule() {
    return convertSchedulerDescription(this.schedulerDescription, this.patternService.patterns);
  }
  getPattern(name: string) {
    return this.patternService.patterns.find(e => e.name === name);
  }
  setPatternVague(description: SchedulerDescriptionVague) {
    this.schedulerDescription = description;
  }
  setPattern(description: SchedulerDescription) {
    this.schedulerDescription = convertSchedulerDescriptionVague(description);
  }
  destroy() {
    this.lightSocket.clientSocket.off("schedule-update", this.patternUpdate);
  }
}

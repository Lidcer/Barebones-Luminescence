import { LedPattern, LedPatternItem, RGB } from "./interfaces";
import { cloneDeep } from "../shared/utils";

export class PatternAnimator {
    private frame: NodeJS.Timeout | undefined;
    private patternReference: LedPattern = {
        ledPattern: [],
        name: "empty pattern",
    };
    private pattern: LedPattern = cloneDeep(this.patternReference);
    private patternIndex = 0;
    private time = 0;
    private patternTime = 0;
    private _state: RGB = { b: 0, g: 0, r: 0 };

    loadPattern(ledPattern: LedPattern) {
        this.patternReference = ledPattern;
        this.pattern = cloneDeep(ledPattern);
        this.reset();
    }
    reset() {
        this.time = 0;
        this.patternIndex = 0;
        this.patternTime = 0;
    }

    start() {
        if (this.frame === undefined) {
            this.frame = setInterval(this.draw, 1);
        }
    }
    stop() {
        if (this.frame !== undefined) {
            clearInterval(this.frame);
            this.frame = undefined;
        }
    }
    destroy() {
        this.stop();
    }
    isPatternActive(ledPattern: LedPattern) {
        return this.patternReference === ledPattern;
    }

    draw = () => {
        const pat = this.pattern.ledPattern;
        if (pat.length > 1) {
            this.time++;
            this.patternTime++;
            const currentPattern = pat[this.patternIndex];
            const targetPattern = pat[(this.patternIndex + 1) % pat.length];
            if (this.time >= targetPattern.delay) {
                this.patternIndex = (this.patternIndex + 1) % pat.length;
                this._state.r = targetPattern.rgb.r;
                this._state.g = targetPattern.rgb.g;
                this._state.b = targetPattern.rgb.b;
                this.time = 0;
                if (this.patternIndex === 0) {
                    this.patternTime = 0;
                }
            } else if (targetPattern.mode === "fade") {
                const percent = this.time / (targetPattern.delay + 1);

                this._state.r = this.calc(percent, currentPattern.rgb.r, targetPattern.rgb.r);
                this._state.g = this.calc(percent, currentPattern.rgb.g, targetPattern.rgb.g);
                this._state.b = this.calc(percent, currentPattern.rgb.b, targetPattern.rgb.b);
            }
        } else if (pat.length === 1) {
            this._state.r = pat[0].rgb.r;
            this._state.g = pat[0].rgb.g;
            this._state.b = pat[0].rgb.b;
        }
    };
    get state() {
        return this._state;
    }
    get totalTime() {
        let count = 0;
        for (let i = 0; i < this.pattern.ledPattern.length; i++) {
            count += this.pattern.ledPattern[i].delay;
        }
        return count;
    }
    get patternExecutionTime() {
        return this.patternTime;
    }
    get index() {
        return this.patternIndex;
    }
    get frames() {
        return this.pattern.ledPattern.length;
    }
    get indexTime() {
        return this.time;
    }
    get nextIndexTime() {
        const pat = this.pattern.ledPattern;
        return pat[(this.patternIndex + 1) % pat.length].delay;
    }
    private correctNumber(number: number) {
        return isNaN(number) || number === Infinity ? 0 : number;
    }
    private calc(percent: number, current: number, target: number) {
        const max = target - current;
        const value = this.correctNumber(current + max * percent);
        return Math.round(value);
    }
}

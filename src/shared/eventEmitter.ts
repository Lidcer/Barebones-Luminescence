export type Emitter = (...args: any[]) => void;

export class EventEmitter {
    private map = new Map<any, Emitter[]>();

    on(key: any, handler: Emitter) {
        const data = this.map.get(key) || [];
        if (data.indexOf(handler) === -1) {
            data.push(handler);
        }
        this.map.set(key, data);
    }
    off(key: any, handler: Emitter) {
        const data = this.map.get(key) || [];
        const index = data.indexOf(handler);
        if (index !== -1) {
            data.splice(index, 1);
        }
        if (!data.length) {
            this.map.delete(key);
        }
    }
    emit(key: any, ...args: any[]) {
        const data = this.map.get(key);
        let count = 0;
        if (data) {
            for (const fn of data) {
                fn(...args);
                count++;
            }
        }
        return count;
    }
}

export class EventEmitterSingle {
    private map = new Map<any, Emitter>();

    on(key: any, handler: Emitter) {
        if (this.map.has(key)) {
            throw new Error(`Event ${key} already registered`);
        }
        this.map.set(key, handler);
    }
    off(key: any) {
        this.map.delete(key);
    }
    emit(key: any, ...args: any): any {
        const data = this.map.get(key);
        if (data) {
            return data(...args);
        }
        throw new Error(`Single function ${key} not registered`);
    }
}

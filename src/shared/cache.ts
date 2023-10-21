export class Cache<K = any, V = any> {
    private map = new Map<K, V>();
    private timeout = new Map<K, Timer>();
    constructor(private lifetime: number) {}

    get(value: K) {
        return this.map.get(value);
    }

    set(key: K, value: V) {
        this.map.set(key, value);
        this.clearTimeoutForKey(key);
        this.timeout.set(
            key,
            setTimeout(() => {
                this.timeout.delete(key);
                this.map.delete(key);
            }, this.lifetime),
        );
    }

    delete(key: K) {
        this.clearTimeoutForKey(key);
        this.map.delete(key);
    }

    private clearTimeoutForKey(key: K) {
        const timeout = this.timeout.get(key);
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}

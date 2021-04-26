export class BrowserStorage {
    static getString(key: string): string | null {
        return localStorage.getItem(key);
    }
    static setString(key: string, value: string): string {
        localStorage.setItem(key, value);
        return value;
    }
    static getNumber(key: string): number | null {
        const result = localStorage.getItem(key);
        if (!result) return null;
        const num = parseFloat(result);
        if (isNaN(num)) return null;
        return num;
    }
    static setNumber(key: string, value: number): number {
        localStorage.setItem(key, value.toString());
        return value;
    }
    static getBoolean(key: string): boolean | null {
        const result = localStorage.getItem(key);
        if (result && result === "true") return true;
        return false;
    }
    static setBoolean(key: string, value: boolean): boolean {
        if (value) {
            localStorage.setItem(key, "true");
        } else {
            localStorage.setItem(key, "false");
        }
        return value;
    }
    static removeItem(key: string) {
        localStorage.removeItem(key);
    }
}

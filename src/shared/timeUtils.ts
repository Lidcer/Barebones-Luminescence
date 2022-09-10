import { DAY } from "./constants";

export function dateMerger(time: string, advanceDay = false) {
    const date = new Date();
    if (advanceDay) {
        date.setTime(date.getTime() + DAY);
    }
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return new Date(`${month}-${day}-${year} ${time}`);
}

export function isPastMidnight(date: Date) {
    const hours = date.getHours();
    return hours > 0 && hours < 12;
}

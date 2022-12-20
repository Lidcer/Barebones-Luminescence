import axios, { AxiosResponse } from "axios";
import { noop } from "lodash";
import { DAY, MINUTE, SUNRISE_SUNSET_API } from "../../../shared/constants";
import { SunSetApi } from "../../../shared/interfaces";
let sunSetData: SunSetApi;
const pollSunsetSunRise = async () => {
    const res = await axios.get<any, AxiosResponse<{ results: SunSetApi; status: string }>>(SUNRISE_SUNSET_API);
    if (
        typeof res.data === "object" &&
        !Array.isArray(res.data) &&
        res.data.status === "OK" &&
        typeof res.data.results === "object" &&
        !Array.isArray(res.data.results)
    ) {
        const validators = [
            "sunrise",
            "sunset",
            "solar_noon",
            "day_length",
            "civil_twilight_begin",
            "civil_twilight_end",
            "nautical_twilight_begin",
            "nautical_twilight_end",
            "astronomical_twilight_begin",
            "astronomical_twilight_end",
        ];
        for (const validater of validators) {
            if (typeof res.data.results[validater] !== "string") {
                Logger.error(`API validation error ${validater} was not found`, res.data);
            }
        }
        sunSetData = res.data.results;
        Logger.info(`Sunrise ${sunSetData.sunrise} | Sunset ${sunSetData.sunset}`);
    } else {
        Logger.error(`API did not receive object from server`);
    }
};
setInterval(pollSunsetSunRise, DAY);
setTimeout(pollSunsetSunRise, MINUTE * 10);
pollSunsetSunRise().catch(noop);

export function getSunsetSunriseData() {
    return sunSetData;
}

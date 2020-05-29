import data from "./Data";
import OHLC from "./OHLC";
import { getStartTime, Time, addTime } from "./Time";

class Wrangler {
    constructor() {
        // Add object with symbols as key, and last tick time or index as value in order to optimise (if its index, when getting rid of ticks, you will have to update the index)
    }

    process(symbol: string): void {
        this.processOHLC(symbol, 1, Time.MINUTE, "BID");
        if (symbol === "EURUSDp") console.log(data.ohlc[symbol]);
    }

    /**
     * Amount and measurement params make up the interval
     */
    processOHLC(symbol: string, amount: number, measurement: Time, using: "BID" | "ASK" | "BOTH"): OHLC[] {
        if (!data.ohlc[symbol]) data.ohlc[symbol] = {};
        const interval = `${amount} ${measurement}`;
        const ticks = data.ticks[symbol];

        let startTime = getStartTime(ticks[0].time, amount, measurement); // Bar start time
        let current = 0;
        while (startTime < ticks[ticks.length - 1].time) {
            const nextTime = addTime(startTime, amount, measurement);
            let nextIndex = ticks.findIndex((val) => val.time > nextTime);
            if (nextIndex === -1) nextIndex = ticks.length - 1;

            let high = ticks[current].bid;
            let low = ticks[current].bid;
            for (let i = current; i < nextIndex; i++) {
                if (high < ticks[i].bid) high = ticks[i].bid;
                if (low > ticks[i].bid) low = ticks[i].bid;
            }
            const open = ticks[current].bid;
            const close = ticks[nextIndex - 1].bid;
            const volume = nextIndex - current;

            data.ohlc[symbol][interval].push({
                time: startTime, open, high, low, close, volume,
            });

            current = nextIndex;
            startTime = nextTime;
        }
    }
}

export default Wrangler;

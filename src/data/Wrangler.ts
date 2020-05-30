import { isNullOrUndefined } from "util";
import data from "./Data";
import OHLC from "./OHLC";
import { getStartTime, Time, addTime } from "./Time";


type Interval = {
    amount: number;
    measurement: Time;
}

class Wrangler {
    /**Last Tick indexes */
    lastIndexes: Record<string, Record<string, number>>; // Example: {EURUSDp: {"1 MINUTE": 9, "4 HOUR": 103}}

    constructor() {
        this.lastIndexes = {};
    }

    process(symbol: string, intervals: Interval[]): void {
        for (const { amount, measurement } of intervals) {
            this.processOHLC(symbol, amount, measurement, "BID");
        }
    }

    /** Amount and measurement params make up the interval */
    processOHLC(symbol: string, amount: number, measurement: Time, using: "BID" | "ASK" | "BOTH"): void {
        const interval = `${amount} ${measurement}`;
        const ticks = data.ticks[symbol];

        if (!data.ohlc[symbol]) data.ohlc[symbol] = { [interval]: [] };
        const currentOHLC = data.ohlc[symbol][interval];

        let startTime = this.getStartBarTime(symbol, amount, measurement);
        let current = 0;
        if (this.lastIndexes[symbol] && this.lastIndexes[symbol][interval]) {
            current = this.lastIndexes[symbol][interval];
        }
        while (startTime < ticks[ticks.length - 1].time) {
            const nextTime = addTime(startTime, amount, measurement);
            let nextIndex = ticks.findIndex((val) => val.time > nextTime);
            if (nextIndex === -1) nextIndex = ticks.length;

            let high = ticks[current].bid;
            let low = ticks[current].bid;
            for (let i = current; i < nextIndex; i++) {
                if (high < ticks[i].bid) high = ticks[i].bid;
                if (low > ticks[i].bid) low = ticks[i].bid;
            }
            const lastOHLC = currentOHLC[currentOHLC.length - 1] || undefined;
            let open = ticks[current].bid;
            let volume = nextIndex - current;
            if (lastOHLC && startTime === lastOHLC.time) {
                open = lastOHLC.open;
                volume += lastOHLC.volume;
                if (high < lastOHLC.high) high = lastOHLC.high;
                if (low > lastOHLC.low) low = lastOHLC.low;
            }
            const close = ticks[nextIndex - 1].bid;


            const ohlcLen = data.ohlc[symbol][interval].length;
            if (ohlcLen >= 1 && data.ohlc[symbol][interval][ohlcLen - 1].time === startTime) { // Change last if still in last bar
                data.ohlc[symbol][interval][ohlcLen - 1] = {
                    time: startTime, open, high, low, close, volume,
                };
            } else { // Else it is a new bar
                data.ohlc[symbol][interval].push({
                    time: startTime, open, high, low, close, volume,
                });
            }

            current = nextIndex;
            startTime = nextTime;
        }

        if (!this.lastIndexes[symbol]) this.lastIndexes[symbol] = { [interval]: undefined };
        this.lastIndexes[symbol][interval] = ticks.length - 1;
    }


    getStartBarTime(symbol, amount, measurement): Date {
        const interval = `${amount} ${measurement}`;
        const ticks = data.ticks[symbol];
        let startTime: Date;
        const now = ticks[ticks.length - 1].time;
        if (data.ohlc[symbol][interval].length > 0) {
            const ohlcLen = data.ohlc[symbol][interval].length;
            const lastBarStart = data.ohlc[symbol][interval][ohlcLen - 1].time;
            const nextBarStart = addTime(lastBarStart, amount, measurement);
            if (now > nextBarStart) {
                startTime = nextBarStart;
            } else {
                startTime = lastBarStart;
            }
        } else { // No previous bar found
            startTime = getStartTime(ticks[0].time, amount, measurement);
        }
        return startTime;
    }
}

export default Wrangler;

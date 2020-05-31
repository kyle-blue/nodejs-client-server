import data from "./Data";
import { getStartTime, Time, addTime } from "./Time";
import CircularArray from "../util/CircularArray";

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
            current = ticks.getIndex(this.lastIndexes[symbol][interval] + 1);
        }
        while (startTime < ticks.lastVal().time) {
            const nextTime = addTime(startTime, amount, measurement);
            let nextIndex = ticks.findIndex((val) => val.time >= nextTime); // Index of first tick of next bar
            if (nextIndex === -1) nextIndex = ticks.getIndex(ticks.last + 1);

            let high = ticks[current].bid;
            let low = ticks[current].bid;
            // eslint-disable-next-line no-loop-func
            ticks.forEach((val, index, arr) => {
                if (arr.getIndex(current + index) === nextIndex) return true; // Break if start of next bar
                if (high < val.bid) high = val.bid;
                if (low > val.bid) low = val.bid;
            });

            const lastOHLC = currentOHLC[currentOHLC.length - 1] || undefined;
            let open = ticks[current].bid;
            let volume = ticks.difference(nextIndex, current);
            if (lastOHLC && startTime === lastOHLC.time) {
                open = lastOHLC.open;
                volume += lastOHLC.volume;
                if (high < lastOHLC.high) high = lastOHLC.high;
                if (low > lastOHLC.low) low = lastOHLC.low;
            }
            const i = ticks.getIndex(nextIndex, -1);
            const close = ticks[i].bid;


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
        this.lastIndexes[symbol][interval] = ticks.last;
    }


    getStartBarTime(symbol, amount, measurement): Date {
        const interval = `${amount} ${measurement}`;
        const ticks = data.ticks[symbol];
        let startTime: Date;
        if (data.ohlc[symbol][interval].length > 0) {
            const now = ticks[ticks.getIndex(this.lastIndexes[symbol][interval] + 1)].time;
            const ohlcLen = data.ohlc[symbol][interval].length;
            const lastBarStart = data.ohlc[symbol][interval][ohlcLen - 1].time;
            const nextBarStart = addTime(lastBarStart, amount, measurement);
            if (now >= nextBarStart) {
                startTime = nextBarStart;
            } else {
                startTime = lastBarStart;
            }
        } else { // No previous bar found
            startTime = getStartTime(ticks.firstVal().time, amount, measurement);
        }
        return startTime;
    }
}

export default Wrangler;

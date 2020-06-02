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

    process(symbol: string, intervals: string[]): void {
        if (!data.ticks[symbol]) return;

        let amounts: number[] = [];
        let measurements: Time[] = [];
        if (intervals) {
            if (intervals[0] === "0") return;
            intervals.forEach((val) => {
                const ret = val.split(" ");
                if (ret.length > 2 || ret.length === 0) return;
                let [amount, measurement] = ret;
                if (Number(amount) === 0) return;
                if (!Object.keys(Time).includes(measurement)) return;
                amounts.push(Number(amount));
                measurements.push(measurement as Time);
            });
        }

        for (let i = 0; i < amounts.length; i++) {
            this.processOHLC(symbol, amounts[i], measurements[i], "BID");
        }
    }

    /** Amount and measurement params make up the interval */
    processOHLC(symbol: string, amount: number, measurement: Time, using: "BID" | "ASK" | "BOTH"): void {
        const interval = `${amount} ${measurement}`;
        const ticks = data.ticks[symbol];

        if (!data.ohlc[symbol]) data.ohlc[symbol] = { [interval]: [] };
        const currentOHLC = data.ohlc[symbol][interval];

        let current = 0;
        let isTicksUpdate = false;
        if (this.lastIndexes[symbol] && this.lastIndexes[symbol][interval]) {
            const index = ticks.getIndex(this.lastIndexes[symbol][interval] + 1);
            if (ticks[index] && ticks[this.lastIndexes[symbol][interval]] <= ticks[index].time) { // Check if this is a tick update or not.
                isTicksUpdate = true;
                current = index;
            } else current = this.lastIndexes[symbol][interval];
        }

        let startTime = this.getStartBarTime(symbol, amount, measurement, current);

        while (startTime < ticks.lastVal().time) {
            const nextTime = addTime(startTime, amount, measurement);
            let nextIndex = ticks.findIndex((val) => val.time >= nextTime); // Index of first tick of next bar
            if (nextIndex === -1) nextIndex = ticks.getIndex(ticks.last + 1);

            let high = ticks[current].bid;
            let low = ticks[current].bid;
            // eslint-disable-next-line no-loop-func
            for (let i = 0; i < ticks.currentLength; i++) {
                const curIndex = ticks.getIndex(current + i);
                if (ticks.difference(nextIndex, curIndex) <= 0) break; // Break if start of next bar

                if (high < ticks[curIndex].bid) high = ticks[curIndex].bid;
                if (low > ticks[curIndex].bid) low = ticks[curIndex].bid;
            }

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


    getStartBarTime(symbol, amount, measurement, current: number): Date {
        const interval = `${amount} ${measurement}`;
        const ticks = data.ticks[symbol];
        let startTime: Date;
        if (data.ohlc[symbol][interval].length > 0) {
            const now = ticks[current].time;
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

import data from "./Data";
import { getStartTime, Time, addTime } from "./Time";
import CircularArray from "../util/CircularArray";
import Tick from "./Tick";

type Interval = {
    amount: number;
    measurement: Time;
}

class Wrangler {
    /**Last Tick indexes */
    lastIndexes: Record<string, Record<string, number>>; // Example: {EURUSDp: {"1 MINUTE": 9, "4 HOUR": 103}}
    current: {
        symbol: string;
        interval: string;
        ticks: CircularArray<Tick>;
        amount: number;
        measurement: Time;
        current: number; // current index
    };


    constructor() {
        this.lastIndexes = {};
        this.current = {}; /** Data regarding the current iteration */
    }


    process(symbol: string, intervals: string[]): void {
        if (!data.ticks[symbol]) return;

        const ret = this.convertIntervals(intervals);
        if (!ret) return;
        let [amounts, measurements] = ret;

        for (let i = 0; i < amounts.length; i++) {
            this.current.interval = intervals[i];
            this.processOHLC(symbol, amounts[i], measurements[i], "BID");
        }
    }


    private convertIntervals(intervals: string[]): [number [], Time[]] | null {
        const amounts = [];
        const measurements = [];
        if (intervals) {
            intervals.forEach((val) => {
                const ret = val.split(" ");
                if (ret.length > 2 || ret.length === 0) return null;
                let [amount, measurement] = ret;
                if (Number(amount) === 0) return null;
                if (!Object.keys(Time).includes(measurement)) return null;
                amounts.push(Number(amount));
                measurements.push(measurement as Time);
            });
        }
        return [amounts, measurements];
    }


    /** Amount and measurement params make up the interval */
    processOHLC(symbol: string, amount: number, measurement: Time, using: "BID" | "ASK" | "BOTH"): void {
        const { interval } = this.current;
        const ticks = data.ticks[symbol];
        this.current = {
            symbol, ticks, amount, measurement, interval, current: undefined,
        };
        if (!data.ohlc[symbol]) data.ohlc[symbol] = { [interval]: [] };

        this.current.current = this.getCurrent();
        let startTime = this.getStartBarTime();

        while (startTime < ticks.lastVal().time) {
            const nextTime = addTime(startTime, amount, measurement);
            const nextIndex = this.getNextIndex(nextTime);
            let [open, high, low, close, volume] = this.getOHLCV(startTime, nextIndex);

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

            this.current.current = nextIndex;
            startTime = nextTime;
        }

        if (!this.lastIndexes[symbol]) this.lastIndexes[symbol] = { [interval]: undefined };
        this.lastIndexes[symbol][interval] = ticks.last;
    }


    getNextIndex(nextTime: Date): number {
        let { ticks } = this.current;
        let nextIndex = ticks.findIndex((val) => val.time >= nextTime); // Index of first tick of next bar
        if (nextIndex === -1) nextIndex = ticks.getIndex(ticks.last + 1);
        return nextIndex;
    }


    getOHLCV(startTime: Date, nextIndex: number): [number, number, number, number, number] {
        let {
            amount, measurement, current, ticks, symbol, interval,
        } = this.current;
        const currentOHLC = data.ohlc[symbol][interval];

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

        return [open, high, low, close, volume];
    }


    getCurrent(): number {
        const { symbol, interval, ticks } = this.current;
        let current = 0;
        if (this.lastIndexes[symbol] && this.lastIndexes[symbol][interval]) {
            const index = ticks.getIndex(this.lastIndexes[symbol][interval] + 1);
            if (ticks[index] && ticks[this.lastIndexes[symbol][interval]] <= ticks[index].time) { // Check if this is a tick update or not.
                current = index;
            } else current = this.lastIndexes[symbol][interval];
        }
        return current;
    }


    getStartBarTime(): Date {
        const {
            interval, ticks, current, symbol, amount, measurement,
        } = this.current;
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

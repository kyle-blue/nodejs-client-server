import data from "./Data";
import { getStartTime, Time, addTime } from "./Time";
import CircularList from "../util/CircularList";
import { TickEnum as Tick } from "./types/Tick";
import CircularFloatArray from "../util/CircularFloatArray";

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
        ticks: CircularFloatArray;
        amount: number;
        measurement: Time;
        current: number; // current index
    };


    constructor() {
        this.lastIndexes = {};
        // @ts-ignore
        this.current = {}; /** Data regarding the current iteration */

        this.wut();
    }
    wut() {
        if (data.ohlc.EURUSD) {
            console.log(data.ohlc.EURUSD);
        }
        setTimeout(this.wut.bind(this), 2000);
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

        while (startTime.getTime() < ticks.lastVal(Tick.TIME)) {
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
        this.lastIndexes[symbol][interval] = ticks.getLast();
    }


    getNextIndex(nextTime: Date): number {
        let { ticks } = this.current;
        let nextIndex = ticks.findIndex((index) => ticks.get(index, Tick.TIME) >= nextTime); // Index of first tick of next bar
        if (nextIndex === -1) nextIndex = ticks.getIndex(ticks.getLast() + 1);
        return nextIndex;
    }


    getOHLCV(startTime: Date, nextIndex: number): [number, number, number, number, number] {
        let {
            amount, measurement, current, ticks, symbol, interval,
        } = this.current;
        const currentOHLC = data.ohlc[symbol][interval];

        let high = ticks.get(current, Tick.BID);
        let low = ticks.get(current, Tick.BID);
        // eslint-disable-next-line no-loop-func
        for (let i = 0, currentLength = ticks.getCurrentLength(); i < currentLength; i++) {
            const curIndex = ticks.getIndex(current + i);
            if (ticks.difference(nextIndex, curIndex) <= 0) break; // Break if start of next bar

            if (high < ticks.get(curIndex, Tick.BID)) high = ticks.get(curIndex, Tick.BID);
            if (low > ticks.get(curIndex, Tick.BID)) low = ticks.get(curIndex, Tick.BID);
        }

        const lastOHLC = currentOHLC[currentOHLC.length - 1] || undefined;
        let open = ticks.get(current, Tick.BID);
        let volume = ticks.difference(nextIndex, current);
        if (lastOHLC && startTime === lastOHLC.time) {
            open = lastOHLC.open;
            volume += lastOHLC.volume;
            if (high < lastOHLC.high) high = lastOHLC.high;
            if (low > lastOHLC.low) low = lastOHLC.low;
        }
        const i = ticks.getIndex(nextIndex, -1);
        const close = ticks.get(i, Tick.BID);

        return [open, high, low, close, volume];
    }


    getCurrent(): number {
        const { symbol, interval, ticks } = this.current;
        let current = 0;
        if (this.lastIndexes[symbol] && this.lastIndexes[symbol][interval]) {
            const index = ticks.getIndex(this.lastIndexes[symbol][interval] + 1);
            if (ticks.get(this.lastIndexes[symbol][interval], Tick.TIME) <= ticks.get(index, Tick.TIME)) { // Check if this is a tick update or not.
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
            const now = ticks.get(current, Tick.TIME);
            const ohlcLen = data.ohlc[symbol][interval].length;
            const lastBarStart = data.ohlc[symbol][interval][ohlcLen - 1].time;
            const nextBarStart = addTime(lastBarStart, amount, measurement);
            if (now >= nextBarStart) {
                startTime = nextBarStart;
            } else {
                startTime = lastBarStart;
            }
        } else { // No previous bar found
            startTime = getStartTime(ticks.firstVal(Tick.TIME), amount, measurement);
        }
        return startTime;
    }
}

export default Wrangler;

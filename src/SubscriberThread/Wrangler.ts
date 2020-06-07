import data from "../IPC/Data";
import { getStartTime, Time, addTime } from "./Time";
import { TickEnum as Tick } from "../IPC/Data/types/Tick";
import { OHLCEnum as OHLC } from "../IPC/Data/types/OHLC";
import CircularFloatArray from "../Util/CircularFloatArray";
import { addNewSharedArray } from "../IPC/SharedArrayFunctions";
import channels from "../IPC/Channels";

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
        ohlc: CircularFloatArray;
    };


    constructor() {
        this.lastIndexes = {};
        // @ts-ignore
        this.current = {}; /** Data regarding the current iteration */

        this.wut();
    }
    wut() {
        if (data.ohlc.EURUSD) {
            if (data.ohlc.EURUSD["1 MINUTE"]) {
                const lVal = data.ohlc.EURUSD["1 MINUTE"].lastVal.bind(data.ohlc.EURUSD["1 MINUTE"]);
                console.log(`Last --- TIME: ${lVal(OHLC.TIME)}, OPEN: ${lVal(OHLC.OPEN)}, HIGH: ${lVal(OHLC.HIGH)}, LOW: ${lVal(OHLC.LOW)}, CLOSE: ${lVal(OHLC.CLOSE)}, VOLUME: ${lVal(OHLC.VOLUME)}, `);
            }
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
                if (ret.length > 2 || ret.length === 0) return;
                let [amount, measurement] = ret;
                if (Number(amount) === 0) return;
                if (!Object.keys(Time).includes(measurement)) return;
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
        if (!data.ohlc[symbol]) data.ohlc[symbol] = {};
        if (!data.ohlc[symbol][interval]) {
            addNewSharedArray({
                type: "OHLC", symbol, interval, channels: channels.getOtherChannels(),
            });
        }
        const ohlc = data.ohlc[symbol][interval];
        this.current = {
            symbol, ticks, amount, measurement, interval, current: undefined, ohlc,
        };

        this.current.current = this.getCurrent();
        let startTime = this.getStartBarTime();
        let startTimeNum = startTime.getTime();

        while (startTime.getTime() < ticks.lastVal(Tick.TIME)) {
            const nextTime = addTime(startTime, amount, measurement);
            const nextIndex = this.getNextIndex(nextTime.getTime());
            let [open, high, low, close, volume] = this.getOHLCV(startTimeNum, nextIndex);

            const ohlcLen = ohlc.getCurrentLength();
            ohlc.lock();
            if (ohlcLen >= 1 && ohlc.lastVal(OHLC.TIME) === startTimeNum) { // Change last if still in last bar
                ohlc.setAll(ohlc.getLast(), startTimeNum, open, high, low, close, volume);
            } else { // Else it is a new bar
                ohlc.push(startTimeNum, open, high, low, close, volume);
            }
            ohlc.unlock();

            this.current.current = nextIndex;
            startTime = nextTime;
            startTimeNum = startTime.getTime();
        }

        if (!this.lastIndexes[symbol]) this.lastIndexes[symbol] = { [interval]: undefined };
        this.lastIndexes[symbol][interval] = ticks.getLast();
    }


    getNextIndex(nextTime: number): number {
        let { ticks } = this.current;
        let nextIndex = ticks.findIndex((index) => ticks.get(index, Tick.TIME) >= nextTime); // Index of first tick of next bar
        if (nextIndex === -1) nextIndex = ticks.getIndex(ticks.getLast() + 1);
        return nextIndex;
    }


    getOHLCV(startTime: number, nextIndex: number): [number, number, number, number, number] {
        let {
            current, ticks, ohlc,
        } = this.current;

        let high = ticks.get(current, Tick.BID);
        let low = ticks.get(current, Tick.BID);
        // eslint-disable-next-line no-loop-func
        for (let i = 0, currentLength = ticks.getCurrentLength(); i < currentLength; i++) {
            const curIndex = ticks.getIndex(current + i);
            if (ticks.difference(nextIndex, curIndex) <= 0) break; // Break if start of next bar

            if (high < ticks.get(curIndex, Tick.BID)) high = ticks.get(curIndex, Tick.BID);
            if (low > ticks.get(curIndex, Tick.BID)) low = ticks.get(curIndex, Tick.BID);
        }

        let open = ticks.get(current, Tick.BID);
        let volume = ticks.difference(nextIndex, current);

        if (ohlc.getCurrentLength() > 0 && startTime === ohlc.lastVal(OHLC.TIME)) {
            open = ohlc.lastVal(OHLC.OPEN);
            volume += ohlc.lastVal(OHLC.VOLUME);
            const lastHigh = ohlc.lastVal(OHLC.HIGH);
            const lastLow = ohlc.lastVal(OHLC.LOW);
            if (high < lastHigh) high = lastHigh;
            if (low > lastLow) low = lastLow;
        }
        const i = ticks.getIndex(nextIndex, -1);
        const close = ticks.get(i, Tick.BID);

        return [open, high, low, close, volume];
    }


    getCurrent(): number {
        const { symbol, interval, ticks } = this.current;
        let current = 0;
        if (this.lastIndexes[symbol] && this.lastIndexes[symbol][interval]) {
            const lastIndex = this.lastIndexes[symbol][interval];
            const index = ticks.getIndex(lastIndex + 1);
            if (ticks.get(lastIndex, Tick.TIME) <= ticks.get(index, Tick.TIME)) { // Check if this is a tick update or not.
                current = index;
            } else current = lastIndex;
        }
        return current;
    }


    getStartBarTime(): Date {
        const {
            interval, ticks, current, symbol, amount, measurement, ohlc,
        } = this.current;
        let startTime: Date;
        if (ohlc.getCurrentLength() > 0) {
            const now = new Date(ticks.get(current, Tick.TIME));
            const lastBarStart = new Date(ohlc.lastVal(OHLC.TIME));
            const nextBarStart = addTime(new Date(lastBarStart), amount, measurement);
            if (now >= nextBarStart) {
                startTime = nextBarStart;
            } else {
                startTime = lastBarStart;
            }
        } else { // No previous bar found
            startTime = getStartTime(new Date(ticks.firstVal(Tick.TIME)), amount, measurement);
        }
        return startTime;
    }
}

export default Wrangler;

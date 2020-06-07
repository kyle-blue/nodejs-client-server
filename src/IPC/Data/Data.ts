// This is a singleton pattern, however, this doesn't work for
// sharing between worker threads. Gonna need messaging.

import CircularFloatArray from "../../Util/CircularFloatArray";

type IntervalName = string;
type SymbolName = string;

/** Shared data */
export class Data {
    ticks: Record<string, CircularFloatArray>;
    ohlc: Record<SymbolName, Record<IntervalName, CircularFloatArray>>; // Example: {EURUSDp: {"1 MINUTE": [{open: 1, high: 10, low: 0, close: 3, volume: 3, time: Date()}] }}
    tickArrSize: number;
    ohlcSize: number;

    constructor(other?: Data) {
        this.ticks = {};
        this.ohlc = {};
        this.tickArrSize = 1000; // Save max 1000 ticks per symbol;
        this.ohlcSize = 10000; // Save max 10000 ohlcs per symbol;
        if (other !== undefined) this.copyFrom(other);
    }


    copyFrom(other: Data): void {
        this.ticks = other.ticks;
        this.ohlc = other.ohlc;
        this.tickArrSize = other.tickArrSize;
        this.ohlcSize = other.ohlcSize;
    }
}

const instance = new Data();
export default instance;

// This is a singleton pattern, however, this doesn't work for
// sharing between worker threads. Gonna need messaging.

import OHLC from "./types/OHLC";
import DataEmitter from "./DataEmitter";
import CircularFloatArray from "../util/CircularFloatArray";

type IntervalName = string;
type SymbolName = string;

/** Shared data */
export class Data {
    ticks: Record<string, CircularFloatArray>;
    ohlc: Record<SymbolName, Record<IntervalName, OHLC[]>>; // Example: {EURUSDp: {"1 MINUTE": [{open: 1, high: 10, low: 0, close: 3, volume: 3, time: Date()}] }}
    tickArrSize: number;
    emitter: DataEmitter;

    constructor(other?: Data) {
        this.ticks = {};
        this.ohlc = {};
        this.tickArrSize = 10; // Save max 1000 ticks per symbol;
        this.emitter = new DataEmitter();
        if (other !== undefined) this.copyFrom(other);
    }


    copyFrom(other: Data): void {
        this.ticks = other.ticks;
        this.ohlc = other.ohlc;
        this.tickArrSize = other.tickArrSize;
    }
}

const instance = new Data();
export default instance;

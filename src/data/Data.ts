// This is a singleton pattern, however, this doesn't work for
// sharing between worker threads. Gonna need messaging.

import Tick from "./Tick";
import OHLC from "./OHLC";
import CircularArray from "../util/CircularArray";

type IntervalName = string;
type SymbolName = string;

class Data {
    ticks: Record<SymbolName, CircularArray<Tick>>;
    ohlc: Record<SymbolName, Record<IntervalName, OHLC[]>>; // Example: {EURUSDp: {"1 MINUTE": [{open: 1, high: 10, low: 0, close: 3, volume: 3, time: Date()}] }}
    tickArrSize: number;

    constructor() {
        if (!Data.instance) {
            Data.instance = this;
        }
        this.ticks = {};
        this.ohlc = {};
        this.tickArrSize = 1000; // Save max 1000 ticks per symbol;
        return Data.instance;
    }

    copyFrom(other: Data) {
        this.ticks = other.ticks;
        this.ohlc = other.ohlc;
        this.tickArrSize = other.tickArrSize;
    }
}


let instance = new Data();
export { Data };
export default instance;

// This is a singleton pattern, however, this doesn't work for
// sharing between worker threads. Gonna need messaging.

import CircularFloatArray from "../../Util/CircularFloatArray";

type IntervalName = string;
type SymbolName = string;
type IndicatorName = string;

/** Shared data */
export class Data {
    ticks: Record<SymbolName, CircularFloatArray>;
    ohlc: Record<SymbolName, Record<IntervalName, CircularFloatArray>>; // Example: {EURUSDp: {"1 MINUTE": [{open: 1, high: 10, low: 0, close: 3, volume: 3, time: Date()}] }}
    tickArrSize: number;
    ohlcSize: number;
    symbolInfo: Record<SymbolName, CircularFloatArray>
    indicators: Record<SymbolName, Record<IntervalName, Record<IndicatorName, CircularFloatArray>>>;


    constructor() {
        this.ticks = {};
        this.ohlc = {};
        this.symbolInfo = {};
        this.indicators = {};
        this.tickArrSize = 1000; // Save max 1000 ticks per symbol;
        this.ohlcSize = 10000; // Save max 10000 ohlcs per symbol;
    }
}

const instance = new Data();
export default instance;

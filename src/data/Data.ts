// This is a singleton pattern, however, this doesn't work for
// sharing between worker threads. Gonna need messaging.

import Tick from "./Tick";
import OHLC from "./OHLC";

class Data {
    ticks: Record<string, Tick[]>;
    ohlc: Record<string, Record<string, OHLC[]>>; // Example: {EURUSDp: {"1 MINUTE": {open: 1, high: 10, low: 0, close: 3, volume: 3, time: Date()}}}
    constructor() {
        if (!Data.instance) {
            Data.instance = this;
        }
        this.ticks = {};
        this.ohlc = {};
        return Data.instance;
    }
}

const instance = new Data();
export { Data };
export default instance;

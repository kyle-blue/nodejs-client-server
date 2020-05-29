// This is a singleton pattern, however, this doesn't work for
// sharing between worker threads. Gonna need messaging.

import Tick from "./Tick";
import OHLC from "./OHLC";

class Data {
    ticks: Record<string, Tick[]>;
    ohlc: Record<string, Record<string, OHLC[]>>; // Example string: "1 MINUTE"
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

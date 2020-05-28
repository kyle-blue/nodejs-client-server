// This is a singleton pattern, however, this doesn't work for
// sharing between worker threads. Gonna need messaging.

class Data {
    ticks: {};
    constructor() {
        if (!Data.instance) {
            Data.instance = this;
        }
        this.ticks = {};
        return Data.instance;
    }
}

const instance = new Data();
export default instance;

import EventEmitter from "events";

type events = "GET" | "RECEIVED";

class DataEmitter extends EventEmitter {
    on: (event: events, listener: (...args: any[]) => void) => this;
    once: (event: events, listener: (...args: any[]) => void) => this
    emit: (event: events, ...args: any[]) => boolean


    async getData(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.emit("GET");
            this.once("RECEIVED", () => {
                resolve();
            });
            setTimeout(reject, 3000, "DataEmitter GET event timed out after 3 seconds");
        });
    }
}

const dataEmitter = new DataEmitter();
export default dataEmitter;

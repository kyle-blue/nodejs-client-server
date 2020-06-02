import EventEmitter from "events";

export type events = "GET" | "RECEIVED";
export type allOptions = getOptions | receiveData
export type getOptions = {
    what: "DATA" | "STRATEGIES";
    symbols?: string[];
    intervals?: string[];
}
export type receiveData = {
    someData?: any;
}

class DataEmitter extends EventEmitter {
    on: (event: events, listener: (options: allOptions) => void) => this;
    once: (event: events, listener: (options: allOptions) => void) => this
    emit: (event: events, options: allOptions) => boolean


    async await(event: events, options: allOptions): Promise<receiveData> {
        return new Promise((resolve, reject) => {
            this.emit(event, options);
            this.once("RECEIVED", (recData: receiveData) => {
                resolve(recData);
            });
            setTimeout(reject, 3000, `DataEmitter ${event} event timed out after 3 seconds`);
        });
    }
}

export default DataEmitter;

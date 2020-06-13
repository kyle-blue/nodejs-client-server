import { MessagePort, Worker } from "worker_threads";


export type MessageType = {
    type: "ADD" | "GET" | "TERMINATE" | "TERMINATED" | "CHANNEL" | "READY";
    what?: "TICK" | "OHLC" | "TRADES" | "STRATEGY INFO" | "SYMBOL INFO" | "ACCOUNT INFO";
    symbol?: string;
    interval? : string;
    /** This will be the buffer when adding a buffer */
    payload?: any;
}

export interface MessagePortType extends MessagePort {
    postMessage: (msg: MessageType, transferList?: Array<ArrayBuffer | MessagePort>) => void;
    on(event: "message", listener: (value: MessageType) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}

export interface WorkerType extends Worker {
    postMessage: (msg: MessageType, transferList?: Array<ArrayBuffer | MessagePort>) => void;
    on(event: "message", listener: (value: MessageType) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}

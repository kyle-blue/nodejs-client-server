/* eslint-disable no-multiple-empty-lines */
import { workerData as wd, parentPort, MessagePort } from "worker_threads";
import { Subscriber as ZmqSubscriber } from "zeromq";
import Socket from "./Socket";
import data from "../data/Data";
import Wrangler from "../data/Wrangler";
import { getOptions } from "../data/DataEmitter";
import { TickEnum as Tick } from "../data/types/Tick";
import CircularFloatArray from "../util/CircularFloatArray";

let stratChannel: MessagePort;
type SymbolInfo = {
    symbol: string;
    bid: number;
    ask: number;
    time: string;
}

type JsonData = {
    type: string;
    symbols: Array<SymbolInfo>;
}

type SymbolName = string;

class Subscriber implements Socket {
    socket: ZmqSubscriber;
    running: boolean;
    isReady: boolean;
    unprocessed: string[];
    isConnected: boolean;
    wrangler: Wrangler;

    constructor(private protocol: string, private ip: string, private port: number) {
        this.initZmqSocket();
        this.isConnected = true;
        this.running = true;
        this.unprocessed = [];
        this.wrangler = new Wrangler();
    }

    private initZmqSocket(): void {
        this.socket = new ZmqSubscriber();
        this.socket.connect(`${this.protocol}://${this.ip}:${this.port}`);
        this.socket.subscribe("");
        this.socket.linger = 0;
        this.socket.receiveTimeout = 0;
        console.log(`Subscriber connected to ${this.protocol}://${this.ip}:${this.port}`);
    }

    stop(): void {
        this.running = false;
    }

    start(): void {
        this.running = true;
        setTimeout(this.eventLoop.bind(this), 0);
    }

    private eventLoop(): void {
        this.getTicks();

        const len = this.unprocessed.length;
        for (let i = 0; i < len; i++) {
            const symbol = this.unprocessed.pop();
            if (data.ohlc[symbol]) {
                const intervals = Object.keys(data.ohlc[symbol]);
                this.wrangler.process(symbol, intervals);
            }
        }
        // if (stratChannel) stratChannel.postMessage(data);
        // parentPort.postMessage(data);
        if (this.running) {
            setTimeout(this.eventLoop.bind(this), 0);
        }
    }

    private getTicks(): void {
        const { ticks } = data;
        this.socket.receive().then((ret) => {
            const retString = ret.toString();
            const json: JsonData = JSON.parse(retString);
            if (json.type === "MARKET_INFO") {
                const { symbols } = json;
                for (const symbol of symbols) {
                    const {
                        symbol: name, bid, ask, time,
                    } = symbol;
                    if (!ticks[name]) {
                        ticks[name] = new CircularFloatArray(data.tickArrSize, Tick.BID, Tick.ASK, Tick.TIME);
                    }
                    ticks[name].push(bid, ask, Date.parse(time));
                    this.unprocessed.push(name);
                }
            }
            this.isReady = true;
        }).catch(() => {});
    }

    disconnect(): void {
        if (this.isConnected) {
            this.socket.disconnect(`${this.protocol}://${this.ip}:${this.port}`);
            this.socket.close();
            this.isConnected = false;
        }
    }
}









let subscriber = new Subscriber(wd.protocol, wd.ip, wd.port);
subscriber.start();


function terminate(): void {
    subscriber.stop();
    setTimeout(() => {
        subscriber.disconnect();
        parentPort.postMessage("TERMINATED");
        process.exit();
    }, 10);
}

/** Calculates intervals on symbols, and after doing so, a msg is posted back to parentPort */
function calcIntervals(symbols: string[], intervals: string[]): void {
    for (const symbol of symbols) {
        for (const interval of intervals) {
            if (!data.ohlc[symbol]) data.ohlc[symbol] = {};
            if (!data.ohlc[symbol][interval]) data.ohlc[symbol][interval] = [];
        }
        subscriber.unprocessed.push(symbol);
    }
}

interface MsgType extends getOptions {type: "GET" | "TERMINATE" | "CHANNEL"; channel: any}
parentPort.on("message", (msg: MsgType) => {
    if (msg.type === "GET") {
        if (msg.symbols && msg.intervals) { // They want data for a specific symbol and interval
            calcIntervals(msg.symbols, msg.intervals);
        } else if (msg.intervals) { // They want data for a specific interval for ALL symbols
            const symbols = Object.keys(this.ticks);
            calcIntervals(symbols, msg.intervals);
        }
    }
    if (msg.type === "CHANNEL") {
        stratChannel = msg.channel;
    }
    if (msg.type === "TERMINATE") terminate();
});
parentPort.on("close", () => terminate()); // This is only for unexpected closes

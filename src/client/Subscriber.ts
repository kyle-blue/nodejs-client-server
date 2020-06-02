import { workerData as wd, parentPort } from "worker_threads";
import { Subscriber as ZmqSubscriber } from "zeromq";
import Socket from "./Socket";
import data from "../data/Data";
import Wrangler from "../data/Wrangler";
import { Time } from "../data/Time";
import CircularArray from "../util/CircularArray";
import { getOptions } from "../data/DataEmitter";


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

class Subscriber implements Socket {
    socket: ZmqSubscriber;
    running: boolean;
    isReady: boolean;
    unprocessed: string[];
    isConnected: boolean;
    wrangler: Wrangler;
    processCycle: number;
    cycleTargets: number[];

    constructor(private protocol: string, private ip: string, private port: number) {
        this.socket = new ZmqSubscriber();
        this.socket.connect(`${protocol}://${ip}:${port}`);
        this.socket.subscribe("");
        this.socket.linger = 0;
        this.socket.receiveTimeout = 0;

        this.isConnected = true;
        this.processCycle = 0;
        this.running = true;
        this.unprocessed = [];
        this.cycleTargets = [];
        this.wrangler = new Wrangler();
        console.log(`Subscriber connected to ${protocol}://${ip}:${port}`);
    }

    stop(): void {
        this.running = false;
    }

    start(): void {
        this.running = true;
        setTimeout(this.eventLoop.bind(this), 0);
    }

    eventLoop(): void {
        this.getTicks();

        const len = this.unprocessed.length;
        for (let i = 0; i < len; i++) {
            const symbol = this.unprocessed.pop();
            if (data.ohlc[symbol]) {
                const intervals = Object.keys(data.ohlc[symbol]);
                this.wrangler.process(symbol, intervals);
            }
            this.processCycle++;
            for (let j = this.cycleTargets.length - 1; j >= 0; j--) {
                if (this.processCycle > this.cycleTargets[j]) {
                    parentPort.postMessage(data);
                    this.cycleTargets.splice(j, 1);
                }
            }
        }

        if (this.running) {
            setTimeout(this.eventLoop.bind(this), 0);
        }
    }

    getTicks(): void {
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
                    if (!ticks[name]) ticks[name] = new CircularArray(data.tickArrSize);
                    ticks[name].push({ bid, ask, time: new Date(time) });
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
        process.exit();
    }, 1);
}

interface MsgType extends getOptions {
    type: "GET" | "TERMINATE";
}
parentPort.on("message", (msg: MsgType) => {
    if (msg.type === "GET" && msg.what === "DATA") {
        if (msg.symbols && msg.intervals) { // They want data for a specific symbol and interval
            for (const symbol of msg.symbols) {
                for (const interval of msg.intervals) {
                    if (!data.ohlc[symbol]) data.ohlc[symbol] = {};
                    if (!data.ohlc[symbol][interval]) data.ohlc[symbol][interval] = [];
                }
                subscriber.unprocessed.push(symbol);
            }
            subscriber.cycleTargets.push(subscriber.unprocessed.length + subscriber.processCycle);
        } else if (msg.intervals) { // They want data for a specific interval for ALL symbols
            const symbols = Object.keys(data.ticks);
            for (const symbol of symbols) {
                for (const interval of msg.intervals) {
                    if (!data.ohlc[symbol]) data.ohlc[symbol] = {};
                    if (!data.ohlc[symbol][interval]) data.ohlc[symbol][interval] = [];
                }
                subscriber.unprocessed.push(symbol);
            }
            subscriber.cycleTargets.push(subscriber.unprocessed.length + subscriber.processCycle);
        } else { // They just want current data
            parentPort.postMessage(data);
        }
    }
    if (msg.type === "TERMINATE") terminate();
});

parentPort.on("close", () => terminate());

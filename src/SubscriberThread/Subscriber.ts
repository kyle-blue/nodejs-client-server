/* eslint-disable no-multiple-empty-lines */
import { workerData as wd, parentPort } from "worker_threads";
import { Subscriber as ZmqSubscriber } from "zeromq";
import Socket from "../Util/Socket";
import data from "../IPC/Data/Data";
import Wrangler from "./Wrangler";
import channels from "../IPC/Channels";
import { addNewSharedArray, onAdd } from "../IPC/SharedArrayFunctions";
import { MessageType } from "../IPC/MessageType";


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

channels.api = parentPort;
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
        if (this.running) setTimeout(this.eventLoop.bind(this), 0);
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
                        addNewSharedArray({
                            type: "TICK", channels: channels.getOtherChannels(), symbol: name,
                        });
                    }
                    ticks[name].lock();
                    ticks[name].push(bid, ask, Date.parse(time));
                    ticks[name].unlock();
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


function terminate(): void {
    subscriber.stop();
    setTimeout(() => {
        subscriber.disconnect();
        channels.api.postMessage({ type: "TERMINATED" });
        process.exit();
    }, 10);
}

function onStratMessage(msg: MessageType): void {
    if (msg.type === "ADD") onAdd(msg);
    if (msg.type === "READY") channels.stratManagerReady = true;
}

channels.api.on("message", (msg) => {
    if (msg.type === "CHANNEL") {
        channels.stratManager = msg.payload;
        channels.stratManager.on("message", onStratMessage);
        subscriber.start(); // Can now start
        channels.setReady();
    }
    if (msg.type === "READY") channels.apiReady = true;
    if (msg.type === "TERMINATE") terminate();
    if (msg.type === "ADD") {
        onAdd(msg);
        // console.log(data);
        subscriber.unprocessed.push(msg.symbol);
    }
});
channels.api.on("close", () => terminate()); // This is only for unexpected closes

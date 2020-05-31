import { workerData as wd, parentPort } from "worker_threads";
import { Subscriber as ZmqSubscriber } from "zeromq";
import Socket from "./Socket";
import data from "../data/Data";
import Wrangler from "../data/Wrangler";
import { Time } from "../data/Time";


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

    constructor(private protocol: string, private ip: string, private port: number) {
        this.socket = new ZmqSubscriber();
        this.socket.connect(`${protocol}://${ip}:${port}`);
        this.socket.subscribe("");
        this.socket.linger = 0;
        this.socket.receiveTimeout = 0;

        this.isConnected = true;
        this.running = true;
        this.unprocessed = [];
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
            this.wrangler.process(this.unprocessed.pop(), [{ amount: 15, measurement: Time.SECOND }]);
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
                    if (!ticks[name]) ticks[name] = [];
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

parentPort.on("message", (msg) => {
    if (msg === "GET") {
        parentPort.postMessage(data);
    }
    if (msg === "TERMINATE") terminate();
});

parentPort.on("close", () => terminate());

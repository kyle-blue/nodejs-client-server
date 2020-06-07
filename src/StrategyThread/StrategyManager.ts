import { workerData, parentPort } from "worker_threads";
import fs from "fs";
import path from "path";
import Strategy from "./strategies/Strategy";
import Requester from "./Requester";
import channels from "../IPC/Channels";
import { onAdd } from "../IPC/SharedArrayFunctions";
import { MessageType } from "../IPC/MessageType";

channels.api = parentPort;
class StrategyManager {
    strategies: Strategy[];
    running: boolean;
    requester: Requester;

    constructor() {
        this.running = false;
        // @ts-ignore
        this.requester = new Requester(...workerData.requesterParams);

        this.strategies = [];
    }

    private async getAllStrategies(): Promise<void> {
        const dir = "./../strategies";
        let files = fs.readdirSync(path.resolve(__dirname, dir)) as string[];
        files = files.filter((val) => val.endsWith(".js") && !val.endsWith("Strategy.js"));
        const allPromises = files.map((file) => import(`./${dir}/${file}`));
        await Promise.all(allPromises).then((modules) => {
            for (const module of modules) {
                const Strat = module.default;
                this.strategies.push(new Strat());
            }
        });
    }

    stop(): void {
        this.running = false;
    }

    async disconnect(): Promise<void> {
        await this.requester.disconnect();
        this.requester.socket.close();
    }

    start(): void {
        this.running = true;
        if (this.strategies.length === 0) {
            this.getAllStrategies().then(() => setTimeout(this.eventLoop.bind(this), 0));
        } else setTimeout(this.eventLoop.bind(this), 0);
    }

    private eventLoop(): void {
        if (this.running) {
            for (const strat of this.strategies) {
                strat.update();
                for (let i = 0; i < strat.pendingTrades.length; i++) this.executeTrade(strat);
            }

            setTimeout(this.eventLoop.bind(this), 0);
        }
    }

    executeTrade(strat: Strategy): void {
        const tradeInfo = strat.pendingTrades.pop();
        this.requester.order(tradeInfo).then(() => {
            strat.openTrades.push({ ...tradeInfo, status: "OPEN" });
        }).catch(() => {
            strat.failedTrades.push({ ...tradeInfo, status: "FAILED" });
        });
    }
}

const stratManager = new StrategyManager();

function terminate(): void {
    stratManager.stop();
    setTimeout(() => {
        stratManager.disconnect()
            .then(() => {
                channels.api.postMessage({ type: "TERMINATED" });
                process.exit();
            });
    }, 10);
}

function onSubMessage(msg: MessageType): void {
    if (msg.type === "ADD") onAdd(msg);
}

channels.api.on("message", (msg) => {
    if (msg.type === "CHANNEL") {
        channels.subscriber = msg.payload;
        channels.subscriber.on("message", onSubMessage);
        stratManager.start();
    }
    if (msg.type === "ADD") onAdd(msg);
    if (msg.type === "TERMINATE") terminate();
});
channels.api.on("close", () => terminate()); // Only for unexpected closes

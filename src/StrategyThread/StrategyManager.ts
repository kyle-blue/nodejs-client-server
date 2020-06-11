import { workerData, parentPort } from "worker_threads";
import fs from "fs";
import path from "path";
import Strategy from "./strategies/Strategy";
import Requester from "./Requester";
import channels from "../IPC/Channels";
import { onAdd } from "../IPC/SharedArrayFunctions";
import { MessageType } from "../IPC/MessageType";
import { TradeInfo, CloseTradeInfo } from "./TradeInfoTypes";

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
        const dir = "./strategies";
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
                for (let i = 0; i < strat.closeTrades.length; i++) this.closeTrade(strat);
            }

            setTimeout(this.eventLoop.bind(this), 0);
        }
    }

    executeTrade(strat: Strategy): void {
        const tradeInfo = strat.pendingTrades.pop();
        this.requester.openTrade(tradeInfo).then((ticketNum: number) => {
            strat.openTrades.push({ ...tradeInfo, ticket: ticketNum, status: "OPEN" });
        }).catch((reason: Error) => {
            strat.failedTrades.push({ ...tradeInfo, status: "FAILED", comment: reason.message });
        });
    }

    closeTrade(strat: Strategy): void {
        const tradeInfo = strat.closeTrades.pop();
        function close(trade: CloseTradeInfo): void {
            this.requester.close(trade).then(() => {
                const index = strat.openTrades.findIndex((val) => val.ticket === trade.ticket);
                strat.openTrades.splice(index, 1);
            }).catch((reason) => {
                console.error(`Could not remove trade with ticketNum: ${ticket} --- Reason: ${reason} --- Retrying...`);
                if (reason !== "TRADE DOES NOT EXIST") setTimeout(close.bind(this), 100);
            });
        }
        close.bind(this)(tradeInfo);
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
    if (msg.type === "READY") channels.subscriberReady = true;
}

channels.api.on("message", (msg) => {
    if (msg.type === "CHANNEL") {
        channels.subscriber = msg.payload;
        channels.subscriber.on("message", onSubMessage);
        stratManager.start();
        channels.setReady();
    }
    if (msg.type === "READY") channels.apiReady = true;
    if (msg.type === "ADD") onAdd(msg);
    if (msg.type === "TERMINATE") terminate();
});
channels.api.on("close", () => terminate()); // Only for unexpected closes

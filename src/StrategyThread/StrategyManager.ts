import { workerData, parentPort } from "worker_threads";
import fs from "fs";
import path from "path";
import Strategy from "./strategies/Strategy";
import Requester, { OpenTradeReturnType, CloseTradeReturnType } from "./Requester";
import channels from "../IPC/Channels";
import { onAdd } from "../IPC/SharedArrayFunctions";
import { MessageType } from "../IPC/MessageType";
import {
    TradeInfo, CloseTradeInfo, TradeRequest, ModifyTradeInfo, TradeOp,
} from "./TradeInfoTypes";
import account from "../IPC/Account";

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
        this.requester.getStaticInfo().then(() => {
            if (this.strategies.length === 0) {
                this.getAllStrategies().then(() => setTimeout(this.eventLoop.bind(this), 0));
            } else setTimeout(this.eventLoop.bind(this), 0);
        });
    }

    private eventLoop(): void {
        if (this.running) {
            account.updateCommission();
            for (const strat of this.strategies) {
                strat.update();
                for (let i = 0; i < strat.requestedTrades.length; i++) this.executeTrade(strat, strat.requestedTrades.pop());
                // for (let i = strat.openTrades.length - 1; i >= 0; i--) this.checkStopAndTakeProfit(strat, i);
                // for (let i = strat.pendingTrades.length - 1; i >= 0; i--) this.checkFilled(strat, i);
            }

            setTimeout(this.eventLoop.bind(this), 0);
        }
    }

    executeTrade(strat: Strategy, tradeInfo: TradeRequest): void {
        if (tradeInfo.request === "OPEN") {
            const trade = tradeInfo as TradeInfo;
            this.requester.openTrade(trade).then((ret) => {
                const { ticket, openPrice, openTime } = ret as OpenTradeReturnType;
                if (trade.type === TradeOp.BUY || trade.type === TradeOp.SELL) {
                    strat.openTrades.push({
                        ...trade, ticket, status: "OPEN", price: openPrice, time: new Date(openTime),
                    });
                } else {
                    strat.pendingTrades.push({
                        ...trade, ticket, status: "PENDING", price: openPrice, time: new Date(openTime),
                    });
                }
            }).catch((err: Error) => {
                console.error(`Could not open trade --- Reason: ${err.message}`);
            });
        }

        if (tradeInfo.request === "CLOSE") {
            const trade = tradeInfo as CloseTradeInfo;
            this.requester.closeTrade(trade).then((ret) => {
                const { closePrice, closeTime } = ret as CloseTradeReturnType;
                const index = strat.openTrades.findIndex((val) => val.ticket === trade.ticket);
                //TODO:  updateTradeInfoInDatabase(ticketNum, closePrice, closeTime)
                strat.openTrades.splice(index, 1);
            }).catch((err: Error) => {
                console.error(`Could not remove trade with ticketNum: ${trade.ticket} --- Reason: ${err.message}`);
                // if (reason !== "TRADE DOES NOT EXIST") setTimeout(close.bind(this), 100);
            });
        }

        if (tradeInfo.request === "MODIFY") {
            const trade = tradeInfo as ModifyTradeInfo;
            this.requester.modifyTrade(trade).then(() => {
                const openIndex = strat.openTrades.findIndex((val) => val.ticket === trade.ticket);
                const pendingIndex = strat.pendingTrades.findIndex((val) => val.ticket === trade.ticket);
                if (pendingIndex !== -1) { // Can only trade price if trade is pending
                    strat.pendingTrades[pendingIndex].price = trade.price;
                    strat.pendingTrades[pendingIndex].stopLoss = trade.stopLoss;
                    strat.pendingTrades[pendingIndex].takeProfit = trade.takeProfit;
                } else {
                    console.log("the trade", trade, "the index", openIndex);
                    strat.openTrades[openIndex].stopLoss = trade.stopLoss;
                    strat.openTrades[openIndex].takeProfit = trade.takeProfit;
                }
            }).catch((err: Error) => {
                console.error(`Could not modify trade with ticketNum: ${trade.ticket} --- Reason: ${err.message}`);
            });
        }
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

let addedItems = { "ACCOUNT INFO": false, "SYMBOL INFO": false };
function onSubMessage(msg: MessageType): void {
    if (msg.type === "ADD") {
        onAdd(msg);
        if (msg.what === "ACCOUNT INFO" || msg.what === "SYMBOL INFO") addedItems[msg.what] = true;
        if (addedItems["ACCOUNT INFO"] && addedItems["SYMBOL INFO"]) {
            stratManager.start();
            channels.setReady();
        }
    }
    if (msg.type === "READY") channels.subscriberReady = true;
}

channels.api.on("message", (msg) => {
    if (msg.type === "CHANNEL") {
        channels.subscriber = msg.payload;
        channels.subscriber.on("message", onSubMessage);
    }
    if (msg.type === "READY") channels.apiReady = true;
    if (msg.type === "ADD") onAdd(msg);
    if (msg.type === "TERMINATE") terminate();
});
channels.api.on("close", () => terminate()); // Only for unexpected closes

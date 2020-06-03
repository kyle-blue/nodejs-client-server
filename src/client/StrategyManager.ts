import { workerData, parentPort } from "worker_threads";
import fs from "fs";
import path from "path";
import Strategy from "../strategies/Strategy";
import Requester from "./Requester";
import { getOptions } from "../data/DataEmitter";

class StrategyManager {
    strategies: Strategy[];
    running: boolean;
    requester: Requester;

    constructor() {
        this.running = false;
        // @ts-ignore
        this.requester = new Requester(...workerData.requesterParams);

        this.strategies = [];
        this.getAllStrategies().then(() => setTimeout(() => this.start(), 0));
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
        setTimeout(this.eventLoop.bind(this), 0);
    }

    private eventLoop(): void {
        if (this.running) {
            setTimeout(this.eventLoop.bind(this), 0);
        }
    }
}

const stratManager = new StrategyManager();


function terminate(): void {
    stratManager.stop();
    setTimeout(() => {
        stratManager.disconnect()
            .then(() => {
                parentPort.postMessage("TERMINATED");
                process.exit();
            });
    }, 10);
}


interface MsgType extends getOptions {type: "GET" | "TERMINATE"}
parentPort.on("message", (msg: MsgType) => {
    if (msg.type === "GET") {

    } else if (msg.type === "TERMINATE") terminate();
});
parentPort.on("close", () => terminate()); // Only for unexpected closes

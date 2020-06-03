
import { Worker } from "worker_threads";
import path from "path";
import { Request as ZmqRequest } from "zeromq";
import Requester from "./Requester";
import data, { Data, setData } from "../data";
import { getOptions } from "../data/DataEmitter";

let [PROTOCOL, SERVER_IP, MAINPORT] = ["tcp", "localhost", 25001];
class Client {
    subscriber: Worker;
    stratManager: Worker;
    data: Data;
    constructor() {
        this.subscriber = undefined;

        this.assignPorts().then(([reqPort, subPort]) => {
            this.initStratManager(reqPort); // Must be initialised first. Sub sends this data
            this.initSubscriber(subPort);

            this.initDataEmitter();
        }).catch();
    }

    private initSubscriber(subPort: number): void {
        this.subscriber = new Worker(path.resolve(__dirname, "Subscriber.js"), {
            workerData: { protocol: PROTOCOL, ip: SERVER_IP, port: subPort },
        });
        this.subscriber.on("message", (msg: Data | "TERMINATED") => {
            if (msg === "TERMINATED") {
                this.subscriber = null;
                // return;
            }
            // this.stratManager.postMessage(msg);
            // setData(data, msg);
            // console.log(msg);
        });
    }

    private initStratManager(reqPort: number): void {
        this.stratManager = new Worker(path.resolve(__dirname, "StrategyManager.js"),
            { workerData: { requesterParams: [PROTOCOL, SERVER_IP, reqPort] } });


        this.stratManager.on("message", (msg) => {
            if (msg === "TERMINATED") {
                this.stratManager = null;
                // return;
            }
        });
    }

    private initDataEmitter(): void {
        data.emitter.on("GET", (options: getOptions) => {
            if (options.what === "DATA" && this.subscriber && this.stratManager) {
                this.subscriber.postMessage({ type: "GET", ...options });
            } else if (options.what === "STRATEGIES") {
                this.stratManager.postMessage({ type: "GET", ...options });
            }
        });
    }

    terminate(): Promise<void> {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    private async assignPorts(): Promise<[number, number]> {
        let reqSock = new ZmqRequest();
        reqSock.connect(`${PROTOCOL}://${SERVER_IP}:${MAINPORT}`);
        reqSock.send("REQUESTING CONNECTION");

        let ret = (await reqSock.receive()).toString();
        reqSock.disconnect(`${PROTOCOL}://${SERVER_IP}:${MAINPORT}`);
        let reqPort = Number(ret.match(/(?<=REQ_PORT: )[0-9]+(?=\n)/)[0]);
        let subPort = Number(ret.match(/(?<=SUB_PORT: )[0-9]+(?=\n)/)[0]);
        return [reqPort, subPort];
    }
}

export default Client;

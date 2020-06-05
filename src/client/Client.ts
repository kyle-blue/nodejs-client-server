
import { Worker, MessagePort, MessageChannel } from "worker_threads";
import path from "path";
import { Request as ZmqRequest } from "zeromq";
import Requester from "./Requester";
import data, { Data } from "../data";
import { getOptions } from "../data/DataEmitter";

// let [PROTOCOL, SERVER_IP, MAINPORT] = ["tcp", "localhost", 25001];
let [PROTOCOL, SERVER_IP, MAINPORT] = ["tcp", "host.docker.internal", 25001];
class Client {
    subscriber: Worker;
    stratManager: Worker;
    data: Data;
    constructor() {
        this.subscriber = undefined;

        this.assignPorts().then(([reqPort, subPort]) => {
            const { port1, port2 } = new MessageChannel();
            this.initStratManager(reqPort, port1); // Must be initialised first. Sub sends this data
            this.initSubscriber(subPort, port2);

            this.initDataEmitter();
        }).catch();
    }

    private async assignPorts(): Promise<[number, number]> {
        let reqSock = new ZmqRequest();
        reqSock.connect(`${PROTOCOL}://${SERVER_IP}:${MAINPORT}`);
        reqSock.send(JSON.stringify({ type: "REQUEST CONNECTION" }));

        let ret = JSON.parse((await reqSock.receive()).toString());
        reqSock.disconnect(`${PROTOCOL}://${SERVER_IP}:${MAINPORT}`);
        let reqPort = ret.req_port;
        let subPort = ret.sub_port;
        return [reqPort, subPort];
    }

    private initSubscriber(subPort: number, channel: MessagePort): void {
        this.subscriber = new Worker(path.resolve(__dirname, "Subscriber.js"), {
            workerData: { protocol: PROTOCOL, ip: SERVER_IP, port: subPort },
        });
        this.subscriber.on("message", (msg: Data | "TERMINATED") => {
            if (msg === "TERMINATED") {
                this.subscriber = null;
                return;
            }
            data.copyFrom(msg);
        });
        this.subscriber.postMessage({ type: "CHANNEL", channel }, [channel]);
    }

    private initStratManager(reqPort: number, channel: MessagePort): void {
        this.stratManager = new Worker(path.resolve(__dirname, "StrategyManager.js"),
            { workerData: { requesterParams: [PROTOCOL, SERVER_IP, reqPort] } });


        this.stratManager.on("message", (msg) => {
            if (msg === "TERMINATED") this.stratManager = null;
        });
        this.stratManager.postMessage({ type: "CHANNEL", channel }, [channel]);
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
            console.log("TERMINATING");
            const exit = (): void => {
                if (this.subscriber === null && this.stratManager === null) resolve();
                else setTimeout(() => exit(), 20);
            };
            this.stratManager.postMessage({ type: "TERMINATE" });
            this.subscriber.postMessage({ type: "TERMINATE" }); // TODO: Change worker ts typing to ensure correct messages are posted

            setTimeout(reject, 3000);
            exit();
        });
    }
}

export default Client;

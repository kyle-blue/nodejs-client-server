
import { Worker } from "worker_threads";
import path from "path";
import { Request as ZmqRequest } from "zeromq";
import Requester from "./Requester";
import data, { Data } from "../data";
import { getOptions } from "../data/DataEmitter";

let [PROTOCOL, SERVER_IP, MAINPORT] = ["tcp", "localhost", 25001];
class Client {
    requester: Requester;
    subscriber: Worker;
    data: Data;
    constructor() {
        this.requester = undefined;
        this.subscriber = undefined;
    }

    init(): void {
        this.assignPorts().then(([reqPort, subPort]) => {
            this.requester = new Requester(PROTOCOL, SERVER_IP, reqPort);
            this.subscriber = new Worker(path.resolve(__dirname, "Subscriber.js"), {
                workerData: { protocol: PROTOCOL, ip: SERVER_IP, port: subPort },
            });
            this.subscriber.on("message", (msg: Data) => {
                data.copyFrom(msg);
                data.emitter.emit("RECEIVED", {});
            });
            data.emitter.on("GET", (options: getOptions) => {
                this.subscriber.postMessage({ type: "GET", ...options });
            });
        }).catch();
    }

    // keyPressGetData(): void {
    //     let { stdin } = process;
    //     stdin.setRawMode(true);
    //     stdin.resume();
    //     stdin.setEncoding("utf8");
    //     stdin.on("data", (key: string) => {
    //         // eslint-disable-next-line eqeqeq
    //         if (key == "\u0003") {
    //             this.requester.disconnect();
    //             this.subscriber.terminate().then(() => {
    //                 process.exit(0);
    //             });
    //         } else {
    //             this.subscriber.postMessage("GET");
    //         }
    //     });
    // }

    disconnect(): void {
        this.requester.disconnect();
        this.subscriber.postMessage("TERMINATE");
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

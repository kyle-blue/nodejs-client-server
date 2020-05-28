
import { Worker } from "worker_threads";
import path from "path";
import { Request as ZmqRequest } from "zeromq";
import Requester from "./Requester";

let [PROTOCOL, SERVER_IP, MAINPORT] = ["tcp", "localhost", 25001];
class Client {
    requester: Requester;
    subscriber: Worker;
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
            this.subscriber.on("message", (msg) => {
                console.log(msg);
            });
        }).catch(() => {
            console.log("Wd");
        });
    }

    disconnect(): void {
        this.requester.disconnect();
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

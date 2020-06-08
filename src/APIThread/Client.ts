
import { Worker, MessagePort, MessageChannel } from "worker_threads";
import path from "path";
import { Request as ZmqRequest } from "zeromq";
import data from "../IPC/Data";
import channels from "../IPC/Channels";

// let [PROTOCOL, SERVER_IP, MAINPORT] = ["tcp", "localhost", 25001];
let [PROTOCOL, SERVER_IP, MAINPORT] = ["tcp", "host.docker.internal", 25001];
class Client {
    constructor() {
        this.assignPorts().then(([reqPort, subPort]) => {
            const { port1, port2 } = new MessageChannel();
            this.initStratManager(reqPort, port1); // Must be initialised first. Sub sends this data
            this.initSubscriber(subPort, port2);
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
        channels.subscriber = new Worker(path.resolve(__dirname, "../SubscriberThread/Subscriber.js"), {
            workerData: { protocol: PROTOCOL, ip: SERVER_IP, port: subPort },
        });
        channels.subscriber.on("message", (msg) => {
            if (msg.type === "TERMINATED") channels.subscriber = undefined;
            if (msg.type === "READY") {
                channels.subscriberReady = true;
                if (channels.subscriberReady && channels.stratManagerReady) channels.setReady();
            }
        });
        channels.subscriber.postMessage({ type: "CHANNEL", payload: channel }, [channel]);
    }

    private initStratManager(reqPort: number, channel: MessagePort): void {
        channels.stratManager = new Worker(path.resolve(__dirname, "../StrategyThread/StrategyManager.js"),
            { workerData: { requesterParams: [PROTOCOL, SERVER_IP, reqPort] } });

        channels.stratManager.on("message", (msg) => {
            if (msg.type === "TERMINATED") channels.stratManager = undefined;
            if (msg.type === "READY") {
                channels.stratManagerReady = true;
                if (channels.subscriberReady && channels.stratManagerReady) channels.setReady();
            }
        });
        channels.stratManager.postMessage({ type: "CHANNEL", payload: channel }, [channel]);
    }

    terminate(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log("TERMINATING");
            const exit = (): void => {
                if (!channels.subscriber && !channels.stratManager) resolve();
                else setTimeout(() => exit(), 20);
            };
            channels.stratManager.postMessage({ type: "TERMINATE" });
            channels.subscriber.postMessage({ type: "TERMINATE" });

            setTimeout(reject, 3000);
            exit();
        });
    }
}

export default Client;

import { workerData as wd, parentPort } from "worker_threads";
import { Subscriber as ZmqSubscriber } from "zeromq";
import Socket from "./Socket";
import data from "../data";

class Subscriber extends Socket {
    socket: ZmqSubscriber;

    constructor(private protocol: string, private ip: string, private port: number) {
        super();
        this.socket = new ZmqSubscriber();
        this.socket.connect(`${protocol}://${ip}:${port}`);
        this.socket.subscribe("");
        console.log(`Subscriber connected to ${protocol}://${ip}:${port}`);
    }

    streamData(): void {
        data.GREG = "HELLO";
    }

    disconnect(): void {
        this.socket.disconnect(`${this.protocol}://${this.ip}:${this.port}`);
    }
}

let subscriber = new Subscriber(wd.protocol, wd.ip, wd.port);
subscriber.streamData();
parentPort.postMessage(data);

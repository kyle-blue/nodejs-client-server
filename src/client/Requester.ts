import { Request as ZmqRequest } from "zeromq";
import Socket from "./Socket";

class Requester implements Socket {
    socket: ZmqRequest;

    // eslint-disable-next-line no-useless-constructor
    constructor(private protocol: string, private ip: string, private port: number) {
        this.socket = undefined;
        // this.socket.receiveTimeout = 0;
        this.connect();
    }

    connect(): void {
        this.socket = new ZmqRequest();
        this.socket.connect(`${this.protocol}://${this.ip}:${this.port}`);
        this.socket.linger = 0;
        console.log(`Requester connected to ${this.protocol}://${this.ip}:${this.port}`);
    }

    disconnect(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log("Disconnecting REQ_SOCKET");
            this.socket.send("REMOVE CONNECTION");
            this.socket.receive().then((ret) => {
                const retString = ret.toString();
                if (retString === "OK") {
                    this.socket.disconnect(`${this.protocol}://${this.ip}:${this.port}`);
                    console.log("REQ_SOCKET disconnected successfully");
                    resolve();
                } else {
                    reject();
                }
            }).catch(() => reject());
        });
    }
}

export default Requester;

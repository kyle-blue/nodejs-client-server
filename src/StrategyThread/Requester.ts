import { Request as ZmqRequest } from "zeromq";
import Socket from "../Util/Socket";
import { TradeOp, TradeInfo } from "./TradeInfoTypes";

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


        this.order({
            id: 0,
            symbol: "EURUSD",
            type: TradeOp.BUY,
            lots: 1,
            price: 1.0123,
            maxSlippage: 3,
            stopLoss: 1.001,
            takeProfit: 1.141,
            qty: 1,
            comment: "Testing",
            status: "PENDING",
            time: new Date(),
        })
            .then((val) => {
                console.log("Wow, you actually did it");
            }).catch(() => {
                console.log("Bruh moment right here");
            });
    }

    order(tradeInfo: TradeInfo): Promise<string> {
        if (!tradeInfo.qty) tradeInfo.qty = 1;
        return new Promise((resolve, reject) => {
            this.socket.send(JSON.stringify({ type: "TRADE", data: tradeInfo })).then((val) => {
                this.socket.receiveTimeout = 3000;
                this.socket.receive().then((val) => {
                    const retString = val.toString();
                    console.log(retString);
                    resolve(retString);
                }).catch(() => {
                    this.socket.receiveTimeout = -1;
                    reject();
                });
            });
        });
    }


    disconnect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const req = { type: "REMOVE CONNECTION" };
            console.log("Disconnecting REQ_SOCKET");
            this.socket.send(JSON.stringify(req));
            this.socket.receive().then((retBuf) => {
                const ret = JSON.parse(retBuf.toString());
                if (ret.type === "REMOVE SUCCESS") {
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

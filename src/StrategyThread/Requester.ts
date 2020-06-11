import { Request as ZmqRequest } from "zeromq";
import Socket from "../Util/Socket";
import { TradeOp, TradeInfo, CloseTradeInfo } from "./TradeInfoTypes";
import data from "../IPC/Data";
import { TickEnum as Tick } from "../IPC/Data/types/Tick";

type OpenTradeReturnType = {
    ticket: number;
    errorCode?: number;
    errorDesc?: string;
}

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

        // setTimeout(() => {
        //     this.openTrade({
        //         ticket: -1,
        //         symbol: "EURUSD",
        //         type: TradeOp.BUY,
        //         lots: 1,
        //         price: data.ticks.EURUSD.lastVal(Tick.BID),
        //         maxSlippage: 100,
        //         stopLoss: data.ticks.EURUSD.lastVal(Tick.BID) - 0.004,
        //         takeProfit: data.ticks.EURUSD.lastVal(Tick.BID) + 0.004,
        //         interval: "1 MINUTE",
        //         comment: "Testing",
        //         status: "PENDING",
        //         time: new Date(),
        //     })
        //         .then((val) => {
        //             console.log("Wow, you actually did it");
        //         }).catch(() => {
        //             console.log("Bruh moment right here");
        //         });
        // }, 1000);
    }


    /** On success, the promise returns the ticket number, else, the promise returns the error code and description */
    openTrade(tradeInfo: TradeInfo): Promise<Error | number> {
        return new Promise((resolve, reject) => {
            this.socket.send(JSON.stringify({ type: "OPEN TRADE", data: tradeInfo })).then(() => {
                this.socket.receiveTimeout = 3000;
                this.socket.receive().then((val) => {
                    const ret: OpenTradeReturnType = JSON.parse(val.toString());
                    if (ret.ticket !== -1) {
                        resolve(ret.ticket);
                    } else {
                        reject(Error(`Error Code: ${ret.errorCode} --- ${ret.errorDesc}`));
                    }
                }).catch(() => {
                    reject(Error("Message not received within 3 seconds"));
                }).finally(() => { this.socket.receiveTimeout = -1; });
            });
        });
    }

    closeTrade(tradeInfo: CloseTradeInfo): Promise<Error | number> {
        return new Promise((resolve, reject) => {
            this.socket.send(JSON.stringify({ type: "CLOSE TRADE", data: tradeInfo })).then(() => {
                this.socket.receiveTimeout = 3000;
                this.socket.receive().then((val) => {
                    const ret: CloseTradeReturnType = JSON.parse(val.toString());

                    console.log(ret);
                    //
                }).catch(() => {
                    reject(Error("Message not received within 3 seconds"));
                }).finally(() => { this.socket.receiveTimeout = -1; });
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

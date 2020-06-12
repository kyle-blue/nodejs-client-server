import Strategy from "./Strategy";
import { TradeOp } from "../TradeInfoTypes";
import data from "../../IPC/Data";
import { TickEnum } from "../../IPC/Data/types/Tick";

class EMACross extends Strategy {
    constructor() {
        super();
        this.wot = "ddwad";
        setTimeout(() => {
            this.openTrade("EURUSD", "1 MINUTE", TradeOp.SELL, 1.2);
        }, 1000);

        setTimeout(() => {
            console.log("open trades: ", this.openTrades);
            console.log("requested trades: ", this.requestedTrades);
            console.log("pending trades: ", this.pendingTrades);
        }, 1100);


        // setTimeout(() => {
        //     this.closeTrade(this.openTrades[0], 1.2);
        // }, 3000);

        setTimeout(() => {
            this.modifyTrade(this.openTrades[0], this.getCurrentPriceForTradeOp(this.openTrades[0].symbol, this.openTrades[0].type) + 0.005, this.getCurrentPriceForTradeOp(this.openTrades[0].symbol, this.openTrades[0].type) - 0.005);
        }, 3000);


        setTimeout(() => {
            console.log("open trades: ", this.openTrades);
            console.log("requested trades: ", this.requestedTrades);
            console.log("pending trades: ", this.pendingTrades);
        }, 3100);
    }
}
export default EMACross;

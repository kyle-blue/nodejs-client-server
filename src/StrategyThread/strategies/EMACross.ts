import Strategy from "./Strategy";
import { TradeOp } from "../TradeInfoTypes";
import data from "../../IPC/Data";
import { TickEnum } from "../../IPC/Data/types/Tick";

class EMACross extends Strategy {
    constructor() {
        super();
        this.wot = "ddwad";
        setTimeout(() => {
            this.openTrade("EURUSD", "1 MINUTE", TradeOp.SELL_LIMIT, 1.2, this.getCurrentPriceForTradeOp("EURUSD", TradeOp.SELL_LIMIT) + 0.002, this.getCurrentPriceForTradeOp("EURUSD", TradeOp.SELL_LIMIT) + 0.005, this.getCurrentPriceForTradeOp("EURUSD", TradeOp.SELL_LIMIT) - 0.005);
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
            this.modifyTrade(this.pendingTrades[0], undefined, undefined, this.pendingTrades[0].price + 0.001);
        }, 3000);


        setTimeout(() => {
            console.log("open trades: ", this.openTrades);
            console.log("requested trades: ", this.requestedTrades);
            console.log("pending trades: ", this.pendingTrades);
        }, 3100);
    }
}
export default EMACross;

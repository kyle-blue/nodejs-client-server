import Strategy from "./Strategy";
import { TradeOp } from "../TradeInfoTypes";
import data from "../../IPC/Data";
import { TickEnum } from "../../IPC/Data/types/Tick";
import account from "../../IPC/Account";
import { SymbolInfo } from "../../IPC/Data/types/SymbolInfo";

class EMACross extends Strategy {
    constructor() {
        super();
        this.wot = "ddwad";
        setTimeout(() => {
            this.openTrade("GBPUSD", "1 MINUTE", TradeOp.BUY_STOP, 1.2, this.getCurrentPriceForTradeOp("GBPUSD", TradeOp.SELL_LIMIT) + 0.001, this.getCurrentPriceForTradeOp("GBPUSD", TradeOp.SELL_LIMIT), this.getCurrentPriceForTradeOp("GBPUSD", TradeOp.SELL_LIMIT) + 0.002);
        }, 2000);

        // setTimeout(() => {
        //     console.log("open trades: ", this.openTrades);
        //     console.log("requested trades: ", this.requestedTrades);
        //     console.log("pending trades: ", this.pendingTrades);
        // }, 1100);

        const func = () => {
            console.log(`\nEquity: ${account.getEquity()} - Balance: ${account.getBalance()} - FreeMargin: ${account.getFreeMargin()}`);
            console.log(`Tick Value: ${data.symbolInfo.GBPUSD.get(0, SymbolInfo.TICK_VALUE)}`);
            setTimeout(func, 2000);
        };
        setTimeout(func, 3000);


        // setTimeout(() => {
        //     this.closeTrade(this.openTrades[0], 1.2);
        // }, 3000);

        // setTimeout(() => {
        //     this.modifyTrade(this.pendingTrades[0], undefined, undefined, this.pendingTrades[0].price + 0.001);
        // }, 3000);


        // setTimeout(() => {
        //     console.log("open trades: ", this.openTrades);
        //     console.log("requested trades: ", this.requestedTrades);
        //     console.log("pending trades: ", this.pendingTrades);
        // }, 3100);
    }
}
export default EMACross;

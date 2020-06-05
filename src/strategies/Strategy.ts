import { TradeOp, TradeInfo } from "../client/TradeInfoTypes";
import data from "../data";

class Strategy {
    openTrades: TradeInfo[];
    pendingTrades: TradeInfo[];
    failedTrades: TradeInfo[];
    //TODO:  past trades will be in Databse

    constructor() {
        this.openTrades = [];
        this.pendingTrades = [];
        this.failedTrades = [];
    }

    update(): void {

    }


    makeTrade(symbol: string, type: TradeOp, lots: number, qty?: number, price?: number, stopLoss?: number, takeProfit?: number, comment?: string) {
        if (!price) price = data.ticks[symbol].lastVal();
        if (!qty) qty = 1;
        const id = this.generateId();
        const status = "PENDING";
        const time = new Date();
        const maxSlippage = calcMaxSlippage();
        // Check risk reward ratio is good enough
        // Check not risking more than your max risk
        this.pendingTrades.push({
            id, lots, maxSlippage, price, status, symbol, time, type, comment, qty, stopLoss, takeProfit,
        });
    }

    generateId(): number {
        /**
         * I am going to need to setup a database connection now. I
         * need to generate an ID by ++ ing a current ID variable in a singleton
         * (I must implement its wrap around), then send it to the DB.
         * (OC first, during init, I must load stuff from DB)
         */
    }
}
export default Strategy;

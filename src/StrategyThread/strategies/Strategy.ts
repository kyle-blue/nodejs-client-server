import {
    TradeOp, TradeInfo, statusType, CloseTradeInfo,
} from "../TradeInfoTypes";
import data from "../../IPC/Data";
import CircularList from "../../Util/CircularList";



class Strategy {
    openTrades: TradeInfo[];
    /** Trades not yet processed  */
    requestedTrades: TradeInfo[];
    /** Stop and Limit trades that have been processed but not filled */
    pendingTrades: TradeInfo[];
    failedTrades: CircularList<TradeInfo>;
    closeTrades: CloseTradeInfo[];
    name: string; // Strategy name
    //TODO:  past trades will be in Database

    constructor() {
        this.openTrades = [];
        this.pendingTrades = [];
        this.requestedTrades = [];
        this.failedTrades = new CircularList(100);
        this.closeTrades = [];
        this.name = "UNKNOWN";
    }

    update(): void {
        // Check which symbols have good enough volatility and liquidity to trade. Only trade them
    }

    calcMaxSlippage(): number {
        return 10;
    }

    /** Calculates number of lots according to predefined max risk percent */
    calcLots(symbol: string): number {
        // Calculate the number of lots from symbol info, account balance, and desired risk
        return 1;
    }

    closeTrade(ticket: number, lots?: number): void {
        const trade = this.openTrades.find((val) => val.ticket === ticket);
        if (!lots) lots = trade.lots;
        const maxSlippage = this.calcMaxSlippage();
        const price = data.ticks[trade.symbol].lastVal();
        this.closeTrades.push({
            ticket, lots, maxSlippage, price,
        });
    }

    modifyTrade(ticket: number, stopLoss?: number, takeProfit?: number, price?: number): void {
        const i = this.openTrades.findIndex((val) => val.ticket === ticket);
        if (!price) price = this.openTrades[i].price;
        if (!price) stopLoss = this.openTrades[i].stopLoss || -1;
        if (!price) takeProfit = this.openTrades[i].takeProfit || -1;
        const maxSlippage = this.calcMaxSlippage();
        this.closeTrades.push({
            ticket, lots, maxSlippage, price,
        });
    }


    openTrade(symbol: string, interval: string, type: TradeOp, lots?: number, price?: number, stopLoss?: number, takeProfit?: number, comment?: string): void {
        if (!price) price = data.ticks[symbol].lastVal();
        let status: statusType = "PENDING";
        const time = new Date();
        const maxSlippage = this.calcMaxSlippage();
        const maxLots = this.calcLots(symbol);
        if (!lots) lots = maxLots;
        if (lots > maxLots) {
            const msg = `- Dynalgo Error: Lots (${lots}) is more than MaxLots (${maxLots})`;
            if (comment) comment += msg;
            else comment = msg;
            status = "FAILED";
            this.failedTrades.push({
                lots, maxSlippage, price, status, symbol, time, type, comment, stopLoss, takeProfit, ticket: -1, interval,
            });
            return;
        }
        // TODO: Check not risking more than your max overall open risk (remember, as you gain profit, and move up stops risk goes down) if you are, papertrade instead
        this.requestedTrades.push({
            lots, maxSlippage, price, status, symbol, time, type, comment, stopLoss, takeProfit, ticket: -1, interval,
        });
    }
}
export default Strategy;

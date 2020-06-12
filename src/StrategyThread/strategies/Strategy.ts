import {
    TradeOp, TradeInfo, statusType, CloseTradeInfo, TradeRequest,
} from "../TradeInfoTypes";
import data from "../../IPC/Data";
import CircularList from "../../Util/CircularList";
import { TickEnum } from "../../IPC/Data/types/Tick";



class Strategy {
    openTrades: TradeInfo[];
    /** Trades not yet processed  */
    requestedTrades: TradeRequest[];
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
        this.name = "UNKNOWN";
    }

    update(): void {
        // Update openTrades current profit etc
        // Check which symbols have good enough volatility and liquidity to trade. Only trade them
    }

    calcMaxSlippage(): number {
        return 15;
    }

    /** Calculates number of lots according to predefined max risk percent */
    calcLots(symbol: string): number {
        // Calculate the number of lots from symbol info, account balance, and desired risk
        return 2;
    }

    closeTrade(trade: TradeInfo, lots?: number): void {
        if (!lots) lots = trade.lots;
        const maxSlippage = this.calcMaxSlippage();
        const price = this.getCurrentPriceForTradeOp(trade.symbol, trade.type, false);
        this.requestedTrades.push({
            request: "CLOSE", ticket: trade.ticket, lots, maxSlippage, price,
        });
    }

    modifyTrade(trade: TradeInfo, stopLoss?: number, takeProfit?: number, price?: number): void {
        if (!price) price = trade.price;
        if (!price) stopLoss = trade.stopLoss || -1;
        if (!price) takeProfit = trade.takeProfit || -1;
        const maxSlippage = this.calcMaxSlippage();
        this.requestedTrades.push({
            request: "MODIFY", ticket: trade.ticket, stopLoss, takeProfit, price, maxSlippage,
        });
    }

    /** Returns the current price for a symbol, depending on wether it is a buy or sell trade (BID or ASK returned) */
    getCurrentPriceForTradeOp(symbol: string, op: TradeOp, isBuying = true): number {
        if (op === TradeOp.BUY || op === TradeOp.BUY_LIMIT || op === TradeOp.BUY_STOP) {
            if (isBuying) return data.ticks[symbol].lastVal(TickEnum.ASK);
            return data.ticks[symbol].lastVal(TickEnum.BID);
        }
        if (isBuying) return data.ticks[symbol].lastVal(TickEnum.BID);
        return data.ticks[symbol].lastVal(TickEnum.ASK);
    }


    openTrade(symbol: string, interval: string, type: TradeOp, lots?: number, price?: number, stopLoss?: number, takeProfit?: number, comment?: string): void {
        if (!price) price = this.getCurrentPriceForTradeOp(symbol, type);
        let status: statusType = "REQUESTED";
        const time = new Date();
        const maxSlippage = this.calcMaxSlippage();
        const maxLots = this.calcLots(symbol);
        if (!lots) lots = maxLots;
        if (lots > maxLots) {
            const msg = `- Dynalgo Error: Lots (${lots}) is more than MaxLots (${maxLots})`;
            console.error(msg);
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
            request: "OPEN", lots, maxSlippage, price, status, symbol, time, type, comment, stopLoss, takeProfit, ticket: -1, interval,
        });
    }
}
export default Strategy;

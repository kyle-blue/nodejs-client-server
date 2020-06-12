import {
    TradeOp, TradeInfo, statusType, CloseTradeInfo, TradeRequest,
} from "../TradeInfoTypes";
import data from "../../IPC/Data";
import CircularList from "../../Util/CircularList";
import { TickEnum as Tick } from "../../IPC/Data/types/Tick";



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

    /**  Check whether stop and limit orders of pendingTrades have been filled */
    private checkStopAndLimitOrders() {
        for (let i = this.pendingTrades.length - 1; i >= 0; i--) {
            const trade = this.pendingTrades[i];
            const lastAsk = data.ticks[trade.symbol].lastVal(Tick.ASK);
            const lastBid = data.ticks[trade.symbol].lastVal(Tick.BID);
            let isFilled = false;
            if (trade.type === TradeOp.BUY_LIMIT && lastAsk <= trade.price) isFilled = true;
            if (trade.type === TradeOp.BUY_STOP && lastAsk >= trade.price) isFilled = true;

            if (trade.type === TradeOp.SELL_LIMIT && lastBid >= trade.price) isFilled = true;
            if (trade.type === TradeOp.SELL_STOP && lastBid <= trade.price) isFilled = true;

            if (isFilled) {
                this.pendingTrades[i].status = "OPEN";
                this.openTrades.push(...this.pendingTrades.splice(i, 1));
            }
        }
    }

    /**  Check whether stops and takeprofits of openTrades have been hit */
    private checkStopsAndTakeProfits() {
        for (let i = this.openTrades.length - 1; i >= 0; i--) {
            const trade = this.openTrades[i];
            const lastAsk = data.ticks[trade.symbol].lastVal(Tick.ASK);
            const lastBid = data.ticks[trade.symbol].lastVal(Tick.BID);
            let isClosed = false;

            if (trade.type === TradeOp.BUY_LIMIT || trade.type === TradeOp.BUY_STOP || trade.type === TradeOp.BUY) {
                if (trade.takeProfit && lastBid >= trade.takeProfit) isClosed = true;
                if (trade.stopLoss && lastBid <= trade.stopLoss) isClosed = true;
            } else { // We are selling
                if (trade.takeProfit && lastAsk <= trade.takeProfit) isClosed = true;
                if (trade.stopLoss && lastAsk >= trade.stopLoss) isClosed = true;
            }
            //TODO: update the database
            if (isClosed) {
                this.openTrades.splice(i, 1);
            }
        }
    }

    /** Updates current profit/loss in openTrades */
    private updateProfits() {
        for (let i = 0; i < this.openTrades.length; i++) {}
    }


    update(): void {
        this.updateProfits();
        this.checkStopAndLimitOrders();
        this.checkStopsAndTakeProfits();
        // Check which symbols have good enough volatility and liquidity to trade. Only trade them (compare spread to atr?, and look at volume compared to average. This could be done in wrangler to be global (per interval, or mainly for minutes and below))
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
        if (!stopLoss) stopLoss = trade.stopLoss || -1;
        if (!takeProfit) takeProfit = trade.takeProfit || -1;
        const maxSlippage = this.calcMaxSlippage();
        this.requestedTrades.push({
            request: "MODIFY", ticket: trade.ticket, stopLoss, takeProfit, price, maxSlippage,
        });
    }

    /** Returns the current price for a symbol, depending on wether it is a buy or sell trade (BID or ASK returned) */
    getCurrentPriceForTradeOp(symbol: string, op: TradeOp, isBuying = true): number {
        if (op === TradeOp.BUY || op === TradeOp.BUY_LIMIT || op === TradeOp.BUY_STOP) {
            if (isBuying) return data.ticks[symbol].lastVal(Tick.ASK);
            return data.ticks[symbol].lastVal(Tick.BID);
        }
        if (isBuying) return data.ticks[symbol].lastVal(Tick.BID);
        return data.ticks[symbol].lastVal(Tick.ASK);
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

import { SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION } from "constants";
import {
    TradeOp, TradeInfo, statusType, TradeRequest,
} from "../TradeInfoTypes";
import data from "../../IPC/Data";
import CircularList from "../../Util/CircularList";
import { TickEnum as Tick, TickEnum } from "../../IPC/Data/types/Tick";
import account from "../../IPC/Account";
import { SymbolInfo } from "../../IPC/Data/types/SymbolInfo";
import { addNewSharedArray } from "../../IPC/SharedArrayFunctions";
import channels from "../../IPC/Channels";
import { calcATR, calcPivot } from "../../Util/Calculations";
import { OHLCEnum } from "../../IPC/Data/types/OHLC";
import { ATREnum } from "../../Util/types/Indicators";


type IndicatorNames = "ATR" | "PIVOT";
class Strategy {
    openTrades: TradeInfo[];
    /** Trades not yet processed  */
    requestedTrades: TradeRequest[];
    /** Stop and Limit trades that have been processed but not filled */
    pendingTrades: TradeInfo[];
    failedTrades: CircularList<TradeInfo>;
    name: string; // Strategy name
    //TODO:  past trades will be in Database

    intervals: string[];
    indicators: string[];
    symbols: string[];

    private intervalsUpdated = false;

    constructor() {
        this.openTrades = [];
        this.pendingTrades = [];
        this.requestedTrades = [];
        this.failedTrades = new CircularList(100);
        this.symbols = Object.keys(data.ticks);


        this.name = undefined;
        this.indicators = undefined;
        this.intervals = undefined;
    }

    /**  Check whether stop and limit orders of pendingTrades have been filled */
    private checkStopAndLimitOrders(): void {
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
    private checkStopsAndTakeProfits(): void {
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
    private updateProfits(): void {
        for (let i = 0; i < this.openTrades.length; i++) {
            const trade = this.openTrades[i];
            const commission = account.getCommission();
            const curPrice = this.getCurrentPriceForTradeOp(trade.symbol, trade.type, false);
            const tickValue = data.symbolInfo[trade.symbol].get(0, SymbolInfo.TICK_VALUE);
            const tickSize = data.symbolInfo[trade.symbol].get(0, SymbolInfo.TICK_SIZE);
            const tickDif = Math.round((curPrice - trade.price) * (1 / tickSize));

            trade.profit = (tickDif * tickValue * trade.lots) - (trade.lots * commission);
            trade.profitR = trade.profit / (trade.startEquity * account.system.riskPerTrade);
        }
    }

    private updateTrailingStops(): void {
        for (let i = 0; i < this.openTrades.length; i++) {
            const trade = this.openTrades[i];
            if (trade.isTrailing !== true) continue;

            const ohlc = data.ohlc[trade.symbol][trade.interval];
            const indicator = data.indicators[trade.symbol][trade.interval][trade.trailingType];

            const curTime = ohlc.get(ohlc.getIndex(ohlc.getLast() - 1), OHLCEnum.TIME);
            if (curTime === trade.lastTrailMod) return;
            const curPrice = ohlc.get(ohlc.getIndex(ohlc.getLast() - 1), OHLCEnum.CLOSE);
            const prevPrice = ohlc.get(ohlc.getIndex(ohlc.getLast() - 2), OHLCEnum.CLOSE);
            if (trade.type === TradeOp.BUY_LIMIT || trade.type === TradeOp.BUY_STOP || trade.type === TradeOp.BUY) {
                const potentialStop = curPrice - (indicator.lastVal() * trade.trailingMultiplier);
                if (curPrice > prevPrice && potentialStop > trade.stopLoss) {
                    this.modifyTrade(trade, potentialStop);
                }
            } else {
                const potentialStop = curPrice + (indicator.lastVal() * trade.trailingMultiplier);
                if (curPrice < prevPrice && potentialStop < trade.stopLoss) {
                    this.modifyTrade(trade, potentialStop);
                }
            }
            trade.lastTrailMod = curTime;
        }
    }

    update(): void {
        this.addIntervals();
        this.updateProfits();
        this.updateTrailingStops();
        this.checkStopAndLimitOrders();
        this.checkStopsAndTakeProfits();
        this.indicatorUpdate();
        // Check which symbols have good enough volatility and liquidity to trade. Only trade them (compare spread to atr?, and look at volume compared to average. This could be done in wrangler to be global (per interval, or mainly for minutes and below))
    }


    indicatorUpdate(): void {
        for (const symbol of this.symbols) {
            for (const interval of this.intervals) {
                const ohlc = data.ohlc[symbol][interval];
                if (ohlc.getCurrentLength() === 0) continue;
                for (const ind of this.indicators) {
                    const name = ind.split(":")[0];
                    if (name === "ATR") calcATR(ind, symbol, interval);
                    if (name === "PIVOT") calcPivot(ind, symbol, interval);
                }

                calcATR("ATR:5", symbol, interval); // This is used for calculating max slippage
            }
        }
    }


    addIntervals(forceUpdate = false): void {
        if (this.intervalsUpdated && !forceUpdate) return;
        for (const symbol of this.symbols) {
            for (const interval of this.intervals) {
                if (!(data.ohlc[symbol] && data.ohlc[symbol][interval])) {
                    addNewSharedArray({
                        type: "OHLC", channels: channels.getOtherChannels(), symbol, interval,
                    });
                }
            }
        }
    }

    calcMaxSlippage(symbol: string, interval: string): number {
        const atr = data.indicators[symbol][interval]["ATR:5"];
        if (atr.getCurrentLength() < 6) return 15;
        const tickSize = data.symbolInfo[symbol].get(0, SymbolInfo.TICK_SIZE);
        return Math.round(atr.lastVal() / tickSize);
    }

    floor(value: number, step = 1.0): number {
        let inv = 1.0 / step;
        return Math.floor(value * inv) / inv;
    }

    /** Calculates number of lots according to predefined max risk percent */
    calcLots(symbol: string, price: number, stopLoss: number): number {
        const equity = account.getEquity();
        const risk = account.system.riskPerTrade;
        const maxLoss = equity * risk;

        const tickSize = data.symbolInfo[symbol].get(0, SymbolInfo.TICK_SIZE);
        const tickValue = data.symbolInfo[symbol].get(0, SymbolInfo.TICK_VALUE);
        const minLot = data.symbolInfo[symbol].get(0, SymbolInfo.MIN_LOT);

        const ticksToStop = Math.round(Math.abs(price - stopLoss) * (1 / tickSize));
        const lossFor1Lot = tickValue * ticksToStop;
        const numLots = this.floor(maxLoss / (lossFor1Lot + account.getCommission()), minLot);
        return numLots;
    }

    closeTrade(trade: TradeInfo, lots?: number): void {
        if (!lots) lots = trade.lots;
        const maxSlippage = this.calcMaxSlippage(trade.symbol, trade.interval);
        const price = this.getCurrentPriceForTradeOp(trade.symbol, trade.type, false);
        this.requestedTrades.push({
            request: "CLOSE", ticket: trade.ticket, lots, maxSlippage, price,
        });
    }

    modifyTrade(trade: TradeInfo, stopLoss?: number, takeProfit?: number, price?: number): void {
        if (!price) price = trade.price;
        if (!stopLoss) stopLoss = trade.stopLoss;
        if (!takeProfit) takeProfit = trade.takeProfit || 0;
        const maxSlippage = this.calcMaxSlippage(trade.symbol, trade.interval);
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

    /** Turn passed trade into a trade with a trailing stop loss.
     * * indName param refers to the name of the indicator you will use to trail */
    setTrailing(trade: TradeInfo, indName: string, multiplier?: number): void {
        if (!multiplier) multiplier = 1;
        trade.isTrailing = true;
        trade.trailingType = indName;
        trade.trailingMultiplier = multiplier;
    }

    openTrade(symbol: string, interval: string, type: TradeOp, stopLoss: number, takeProfit?: number, lots?: number, price?: number, comment?: string): void {
        if (!price) price = this.getCurrentPriceForTradeOp(symbol, type);
        let status: statusType = "REQUESTED";
        const time = new Date();
        const maxSlippage = this.calcMaxSlippage(symbol, interval);
        const maxLots = this.calcLots(symbol, price, stopLoss);
        if (!lots) lots = maxLots;
        if (lots > maxLots) {
            const msg = `- Dynalgo Error: Lots (${lots}) is more than MaxLots (${maxLots})`;
            console.error(msg);
            if (comment) comment += msg;
            else comment = msg;
            status = "FAILED";
            this.failedTrades.push({
                lots, maxSlippage, price, status, symbol, time, type, comment, stopLoss, takeProfit, ticket: -1, interval, startEquity: account.getEquity(),
            });
            return;
        }
        // TODO: Check not risking more than your max overall open risk (remember, as you gain profit, and move up stops risk goes down) if you are, papertrade instead
        this.requestedTrades.push({
            request: "OPEN", lots, maxSlippage, price, status, symbol, time, type, comment, stopLoss, takeProfit, ticket: -1, interval, startEquity: account.getEquity(),
        });
    }
}
export default Strategy;

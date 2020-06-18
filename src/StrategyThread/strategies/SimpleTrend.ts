import Strategy from "./Strategy";
import data from "../../IPC/Data";
import { OHLCEnum as OHLC } from "../../IPC/Data/types/OHLC";
import { addNewSharedArray } from "../../IPC/SharedArrayFunctions";
import channels from "../../IPC/Channels";
import { ohlc } from "../../Database";
import { TradeInfo, TradeOp, TradeRequest } from "../TradeInfoTypes";
import CircularFloatArray from "../../Util/CircularFloatArray";
import { TickEnum } from "../../IPC/Data/types/Tick";
import CircularList from "../../Util/CircularList";
import { PivotEnum, ATREnum } from "../../Util/types/Indicators";


interface STTradeRequest extends TradeRequest {
    pivotTime?: number;
}
interface STTradeInfo extends TradeInfo {
    pivotTime?: number;
}

const sATR = "ATR:5";
const sPivot = "PIVOT:3:3";
class SimpleTrend extends Strategy {
    ohlc: CircularFloatArray;
    atr: CircularFloatArray;
    pivot: CircularFloatArray;
    requestedTrades: STTradeRequest[];
    openTrades: STTradeInfo[];
    pendingTrades: STTradeInfo[];
    failedTrades: CircularList<STTradeInfo>;

    constructor() {
        super();
        this.name = "Simple Trend";
        this.intervals = ["1 MINUTE"];
        this.indicators = [sATR, sPivot];
        this.ohlc = undefined;
        this.atr = undefined;
    }

    update(): void {
        super.update();
        if (this.requestedTrades.length !== 0) return;

        const maxPeriod = 5;
        for (const symbol of this.symbols) {
            for (const interval of this.intervals) {
                if (data.ohlc[symbol][interval].getCurrentLength() < maxPeriod) return;
                this.updateSymbol(symbol, interval);
            }
        }
    }

    updateSymbol(symbol: string, interval: string): void {
        this.ohlc = data.ohlc[symbol][interval];
        this.atr = data.indicators[symbol][interval][sATR];
        this.pivot = data.indicators[symbol][interval][sPivot];

        const curPrice = data.ticks[symbol].lastVal(TickEnum.BID);

        const curHighIndex = this.getPivotIndex(true, 0);
        const prevHighIndex = this.getPivotIndex(true, 1);
        if (curHighIndex !== -1 && prevHighIndex !== -1) {
            const curHigh = this.pivot.get(curHighIndex, PivotEnum.PRICE);
            const prevHigh = this.pivot.get(prevHighIndex, PivotEnum.PRICE);
            if (curHigh < prevHigh) this.removeAllPendingTrades({ isHigh: true });

            const curHighTime = this.pivot.get(curHighIndex, PivotEnum.TIME);
            if (!this.tradesExistOnPivot(curHighTime)) {
                let dif = curHigh - prevHigh;
                const atrRequirement = (this.atr.lastVal() * 2);
                if (dif > atrRequirement && curPrice < curHigh) {
                    this.openTrade(symbol, interval, TradeOp.BUY_STOP, curHigh + this.atr.lastVal());
                    const index = this.requestedTrades.length - 1;
                    this.requestedTrades[index].pivotTime = curHighTime;
                }
            }
        }


        const curLowIndex = this.getPivotIndex(false, 0);
        const prevLowIndex = this.getPivotIndex(false, 1);
        if (curLowIndex !== -1 && prevLowIndex !== -1) {
            const curLow = this.pivot.get(curLowIndex, PivotEnum.PRICE);
            const prevLow = this.pivot.get(prevLowIndex, PivotEnum.PRICE);
            if (curLow > prevLow) this.removeAllPendingTrades({ isHigh: false });


            const curLowTime = this.pivot.get(curLowIndex, PivotEnum.TIME);
            if (!this.tradesExistOnPivot(curLowTime)) {
                let dif = prevLow - curLow;
                const atrRequirement = (this.atr.lastVal() * 2);
                if (dif > atrRequirement && curPrice > prevLow) {
                    this.openTrade(symbol, interval, TradeOp.SELL_STOP, curLow - this.atr.lastVal());
                    const index = this.requestedTrades.length - 1;
                    this.requestedTrades[index].pivotTime = curLowTime;
                }
            }
        }
    }

    removeAllPendingTrades(options: {isHigh: boolean}): void {
        for (let i = this.pendingTrades.length - 1; i >= 0; i--) {
            const trade = this.pendingTrades[i];
            const pivotIndex = this.pivot.reverseFindIndex((index) => this.pivot.get(index, PivotEnum.TIME) === trade.pivotTime);
            const isHigh = (this.pivot.get(pivotIndex, PivotEnum.IS_HIGH) === 1);
            if (options.isHigh && isHigh) this.closeTrade(trade);
            if (!options.isHigh && !isHigh) this.closeTrade(trade);
        }
    }

    tradesExistOnPivot(pivotTime: number): boolean {
        let exists = false;
        this.openTrades.forEach((val) => { if (val.pivotTime === pivotTime) exists = true; });
        this.requestedTrades.forEach((val) => { if (val.pivotTime === pivotTime) exists = true; });
        this.pendingTrades.forEach((val) => { if (val.pivotTime === pivotTime) exists = true; });
        return exists;
    }

    /** if isHigh is ture , and nthFromRight is 3, the index of the 4th pivot high from right will be returned
     *  -1 returned if doesn't exist
     */
    getPivotIndex(isHigh: boolean, nthFromRight = 0): number {
        const match = isHigh ? 1 : -1;
        let counter = 0;
        let pivotIndex = -1;
        this.pivot.reverseForEach((index) => {
            if (this.pivot.get(index, PivotEnum.IS_HIGH) === match) {
                if (counter === nthFromRight) {
                    pivotIndex = index;
                    return true;
                }
                counter++;
            }
        });
        return pivotIndex;
    }

    openTrade(symbol: string, interval: string, type: TradeOp, price?: number): void {
        const multiplier = 3.5;
        const curPrice = this.getCurrentPriceForTradeOp(symbol, type, false);
        let stopLoss;
        if (type === TradeOp.BUY_LIMIT || type === TradeOp.BUY_STOP || type === TradeOp.BUY) {
            if (!price) stopLoss = curPrice - (this.atr.lastVal() * multiplier);
            else stopLoss = price - (this.atr.lastVal() * multiplier);
        } else {
            // eslint-disable-next-line no-lonely-if
            if (!price) stopLoss = curPrice + (this.atr.lastVal() * multiplier);
            else stopLoss = price + (this.atr.lastVal() * multiplier);
        }
        super.openTrade(symbol, interval, type, stopLoss, undefined, undefined, price);
        const lastIndex = this.requestedTrades.length - 1;
        this.setTrailing(this.requestedTrades[lastIndex] as TradeInfo, sATR, multiplier);
    }
}


export default SimpleTrend;

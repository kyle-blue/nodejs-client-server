/* eslint-disable @typescript-eslint/no-use-before-define */
import { isRegExp } from "util";
import { FORMERR } from "dns";
import { ATR } from "technicalindicators";
import data from "../IPC/Data";
import { addNewSharedArray } from "../IPC/SharedArrayFunctions";
import channels from "../IPC/Channels";
import { ATREnum, PivotEnum } from "./types/Indicators";
import { Data } from "../IPC/Data/Data";
import CircularFloatArray from "./CircularFloatArray";
import { OHLCEnum } from "../IPC/Data/types/OHLC";

type SymbolName= string;
type IndicatorName= string;
type IntervalName= string;
type LastState = Record<SymbolName, Record<IntervalName, Record<IndicatorName, number>>>;

/** Holds last calculated OHLC index per symbol / interval / indicator */
let lasts: LastState = {};
let last = 0;
let ohlc: CircularFloatArray;
let indicator: CircularFloatArray;
export function calcATR(name: string, symbol: string, interval: string): void {
    initCalc(name, symbol, interval, ATREnum);
    const period = parseInt(name.split(":")[1]);
    if (ohlc.getCurrentLength() <= period) return;

    let input = {
        high: [], low: [], close: [], index: [], period,
    };
    const addInput = (index) => {
        input.high.push(ohlc.get(index, OHLCEnum.HIGH));
        input.low.push(ohlc.get(index, OHLCEnum.LOW));
        input.close.push(ohlc.get(index, OHLCEnum.CLOSE));
        input.index.push(index);
    };

    let isFirstIter = true;
    ohlc.forEach((index) => {
        last = ohlc.getIndex(last + 1);
        const firstIndex = ohlc.getFirst();
        const dif = ohlc.difference(index, firstIndex);
        if (dif <= period) {
            indicator.push(-1);
            return;
        }
        if (isFirstIter) {
            for (let i = period; i >= 1; i--) addInput(ohlc.getIndex(index - i));
            isFirstIter = false;
        }
        addInput(index);
    }, null, last, ohlc.getIndex(ohlc.getLast() - 1));
    lasts[symbol][interval][name] = last;

    const inputNotEmpty = !isFirstIter;
    if (inputNotEmpty) {
        for (const val of ATR.calculate(input)) indicator.push(val);
    }
}


export function calcPivot(name: string, symbol: string, interval: string): void {
    initCalc(name, symbol, interval, PivotEnum);
    const tempSplit = name.split(":");
    const left = parseInt(tempSplit[1]);
    const right = parseInt(tempSplit[2]);
    const currentLen = ohlc.getCurrentLength();
    if (currentLen < left + right + 1) return;

    ohlc.forEach((index) => {
        last = ohlc.getIndex(last + 1);
        const firstIndex = ohlc.getFirst();
        const dif = ohlc.difference(index, firstIndex);
        if (dif <= left) return;
        const curHigh = ohlc.get(index, OHLCEnum.HIGH);
        const curLow = ohlc.get(index, OHLCEnum.LOW);

        const leftData = { high: curHigh, low: curLow };
        const rightData = { high: curHigh, low: curLow };
        for (let i = 1; i <= left; i++) {
            const newHigh = ohlc.get(ohlc.getIndex(index - i), OHLCEnum.HIGH);
            const newLow = ohlc.get(ohlc.getIndex(index - i), OHLCEnum.LOW);
            if (newHigh > leftData.high) leftData.high = newHigh;
            if (newLow < leftData.low) leftData.low = newLow;
        }
        for (let i = 1; i <= right; i++) {
            const newHigh = ohlc.get(ohlc.getIndex(index + i), OHLCEnum.HIGH);
            const newLow = ohlc.get(ohlc.getIndex(index + i), OHLCEnum.LOW);
            if (newHigh > rightData.high) rightData.high = newHigh;
            if (newLow < rightData.low) rightData.low = newLow;
        }

        if (leftData.high <= curHigh && rightData.high <= curHigh) {
            const time = ohlc.get(index, OHLCEnum.TIME);
            indicator.push(1, curHigh, time); // IS_HIGH, PRICE, TIME
        }
        if (leftData.low >= curLow && rightData.low >= curLow) {
            const time = ohlc.get(index, OHLCEnum.TIME);
            indicator.push(-1, curLow, time); // IS_HIGH, PRICE, TIME
        }
    }, null, last, ohlc.getIndex(ohlc.getLast() - right));
    lasts[symbol][interval][name] = last;
}


function initCalc(name: string, symbol: string, interval: string, indicatorEnum: any): void {
    ohlc = data.ohlc[symbol][interval];
    if (!lasts[symbol]) lasts[symbol] = {};
    if (!lasts[symbol][interval]) lasts[symbol][interval] = {};
    if (lasts[symbol][interval][name]) last = lasts[symbol][interval][name];
    else last = ohlc.getFirst();
    if (!(data.indicators[symbol] && data.indicators[symbol][interval] && data.indicators[symbol][interval][name])) {
        const temp = Object.values(indicatorEnum);
        const keys = temp.slice(temp.length / 2) as number[];
        addNewSharedArray({
            type: "INDICATOR", channels: channels.getOtherChannels(), symbol, interval, indicator: name, keys,
        });
    }
    indicator = data.indicators[symbol][interval][name];
}

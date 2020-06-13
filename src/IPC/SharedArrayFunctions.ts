import data from "./Data";
import CircularFloatArray from "../Util/CircularFloatArray";
import { TickEnum as Tick } from "./Data/types/Tick";
import { OHLCEnum as OHLC } from "./Data/types/OHLC";
import { MessagePortType, WorkerType, MessageType } from "./MessageType";
import { SymbolInfo as SI } from "./Data/types/SymbolInfo";
import account, { AI } from "./Account";

export interface AddNewSharedArrayOptions {
    type: "OHLC" | "TICK" | "SYMBOL INFO" | "ACCOUNT INFO"; // TODO add EMA and other indicators
    channels: (WorkerType | MessagePortType) [];
    symbol?: string;
    interval?: string;
}

export function addNewSharedArray(options: AddNewSharedArrayOptions) {
    const {
        type, channels, symbol, interval,
    } = options;
    if (type === "TICK") {
        data.ticks[symbol] = new CircularFloatArray(data.tickArrSize, Tick.BID, Tick.ASK, Tick.TIME);
        const payload = data.ticks[symbol].buf;
        for (const channel of channels) {
            channel.postMessage({
                type: "ADD", what: "TICK", symbol, payload,
            });
        }
    }
    if (type === "OHLC") {
        if (!data.ohlc[symbol]) data.ohlc[symbol] = {};
        data.ohlc[symbol][interval] = new CircularFloatArray(
            data.ohlcSize, OHLC.TIME, OHLC.OPEN, OHLC.HIGH, OHLC.LOW, OHLC.CLOSE, OHLC.VOLUME,
        );
        const payload = data.ohlc[symbol][interval].buf;
        for (const channel of channels) {
            channel.postMessage({
                type: "ADD", what: "OHLC", symbol, interval, payload,
            });
        }
    }
    if (type === "SYMBOL INFO") {
        data.symbolInfo[symbol] = new CircularFloatArray(1, SI.MIN_LOT, SI.TICK_SIZE, SI.TICK_VALUE);
        const payload = data.symbolInfo[symbol].buf;
        for (const channel of channels) {
            channel.postMessage({
                type: "ADD", what: "SYMBOL INFO", symbol, interval, payload,
            });
        }
    }

    if (type === "ACCOUNT INFO") {
        account.infoArray = new CircularFloatArray(
            1, AI.EQUITY, AI.BALANCE, AI.FREE_MARGIN, AI.LEVERAGE, AI.COMMISSION, AI.BASE_COMMISSION,
        );
        const payload = account.infoArray.buf;
        for (const channel of channels) {
            channel.postMessage({
                type: "ADD", what: "ACCOUNT INFO", symbol, interval, payload,
            });
        }
    }
}

export function onAdd(options: MessageType): void {
    let {
        symbol, interval, what, payload,
    } = options;
    if (what === "TICK") {
        data.ticks[symbol] = new CircularFloatArray(payload, Tick.BID, Tick.ASK, Tick.TIME);
    }
    if (what === "OHLC") {
        if (!data.ohlc[symbol]) data.ohlc[symbol] = {};
        data.ohlc[symbol][interval] = new CircularFloatArray(payload, OHLC.TIME, OHLC.OPEN, OHLC.HIGH, OHLC.LOW, OHLC.CLOSE, OHLC.VOLUME);
    }
    if (what === "SYMBOL INFO") {
        data.symbolInfo[symbol] = new CircularFloatArray(payload, SI.MIN_LOT, SI.TICK_SIZE, SI.TICK_VALUE);
    }
    if (what === "ACCOUNT INFO") {
        account.infoArray = new CircularFloatArray(payload, AI.EQUITY, AI.BALANCE, AI.FREE_MARGIN, AI.LEVERAGE, AI.COMMISSION, AI.BASE_COMMISSION);
    }
}

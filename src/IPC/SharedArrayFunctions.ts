import data from "./Data";
import CircularFloatArray from "../Util/CircularFloatArray";
import { TickEnum as Tick } from "./Data/types/Tick";
import { OHLCEnum as OHLC } from "./Data/types/OHLC";
import { MessagePortType, WorkerType, MessageType } from "./MessageType";

export interface AddNewSharedArrayOptions {
    type: "OHLC" | "TICK"; // TODO add EMA and other indicators
    channels: (WorkerType | MessagePortType) [];
    symbol: string;
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
}

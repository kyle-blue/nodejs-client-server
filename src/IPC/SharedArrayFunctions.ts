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
        for (const channel of channels) {
            channel.postMessage({
                type: "ADD", what: "TICK", symbol, payload: data.ticks[symbol].buf,
            }, [data.ticks[symbol].buf]);
        }
    }
    if (type === "OHLC") {
        data.ohlc[symbol][interval] = new CircularFloatArray(
            data.ohlcSize, OHLC.TIME, OHLC.OPEN, OHLC.HIGH, OHLC.LOW, OHLC.CLOSE, OHLC.VOLUME,
        );
        for (const channel of channels) {
            channel.postMessage({
                type: "ADD", what: "OHLC", symbol, payload: data.ohlc[symbol][interval].buf,
            }, [data.ohlc[symbol][interval].buf]);
        }
    }
}

export function onAdd(options: MessageType) {
    let {
        symbol, interval, what, payload,
    } = options;
    if (what === "TICK") {
        data.ticks[symbol] = new CircularFloatArray(payload, Tick.BID, Tick.ASK, Tick.TIME);
    }
    if (what === "OHLC") {
        data.ticks[symbol][interval] = new CircularFloatArray(payload, OHLC.TIME, OHLC.OPEN, OHLC.HIGH, OHLC.LOW, OHLC.CLOSE, OHLC.VOLUME);
    }
}

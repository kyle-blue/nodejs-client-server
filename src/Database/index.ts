import mongoose, { Mongoose } from "mongoose";
import { settings } from "cluster";

const MONGO_IP = "mongodb"; //docker-compose adds service link as ip in hosts
const MONGO_PORT = "27017";
const DB_URL = `mongodb://${MONGO_IP}:${MONGO_PORT}`;

mongoose.connect(`${DB_URL}/dynalgo`, { useNewUrlParser: true, useUnifiedTopology: true });

const tradesSchema = new mongoose.Schema({
    ticket: { type: Number, required: true },
    lots: { type: Number, required: true },
    maxSlippage: { type: Number, required: true },
    inPrice: { type: Number, required: true },
    outPrice: { type: Number, required: false },
    outReason: { type: String, required: false }, // "TAKE PROFIT" | "STOP LOSS" | "MARKET CLOSE"
    status: { type: String, required: true },
    symbol: { type: String, required: true },
    time: { type: Date, required: true, default: Date.now },
    type: { type: Number, required: true }, // TradeOp Enum
    stopLoss: { type: Number, required: false },
    takeProfit: { type: Number, required: false },
    comment: { type: String, required: false },
    accountID: { type: Number, required: true },
    platform: { type: String, requires: true }, // e.g. "MT4"
    strategy: { type: String, required: true },
    interval: { type: String, required: true },
    isReal: { type: Boolean, required: true }, // Is it a real or paper trade?
},
{ versionKey: false });

export const trades = mongoose.model("trades", tradesSchema);

/** OHLC for 15 second bars (other OHLCs are derived from this) */
const OHLCSchema = new mongoose.Schema({
    time: { type: Date, required: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, required: true },
},
{ versionKey: false });

export const ohlc = mongoose.model("ohlcs", OHLCSchema);


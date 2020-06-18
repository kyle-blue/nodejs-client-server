export enum TradeOp {
    BUY = 0,
    SELL = 1,
    BUY_LIMIT = 2,
    SELL_LIMIT = 3,
    BUY_STOP = 4,
    SELL_STOP = 5
}

/** REQUESTED means a trade has not yet been processed, PENDING means a stop or limit order has not yet been filled */
export type statusType = "REQUESTED" | "PENDING" | "OPEN" | "FAILED"

export type TradeInfo = {
    time: Date;
    status: statusType;
    ticket: number; // Essentially the id of the trade
    symbol: string;
    interval: string;
    type: TradeOp;
    lots: number;
    price: number;
    maxSlippage: number;
    startEquity: number;
    strategy?: string;
    profit?: number;
    profitR?: number;
    comment?: string;
    stopLoss?: number;
    takeProfit?: number;
    isReal?: boolean;
    isTrailing?: boolean;
    trailingType?: string;
    trailingMultiplier?: number;
    lastTrailMod?: number;
}


export interface TradeRequest extends Partial<TradeInfo> {
    request: "OPEN" | "MODIFY" | "CLOSE";
}

export type CloseTradeInfo = {
    ticket: number;
    lots: number;
    maxSlippage: number;
    price: number;
};


export type ModifyTradeInfo = {
    ticket: number;
    price: number;
    stopLoss: number;
    takeProfit: number;
};


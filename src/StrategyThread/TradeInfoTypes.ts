export enum TradeOp {
    BUY = 0,
    SELL = 1,
    BUY_LIMIT = 2,
    SELL_LIMIT = 3,
    BUY_STOP = 4,
    SELL_STOP = 5
}

export type statusType = "PENDING" | "OPEN" | "FAILED"

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
    strategy?: string;
    comment?: string;
    stopLoss?: number;
    takeProfit?: number;
    isReal?: boolean;
}

export type CloseTradeInfo = {
    ticket: number;
    lots: number;
    maxSlippage: number;
    price: number;
};

export enum TradeOp {
    BUY = 0,
    SELL = 1,
    BUY_LIMIT = 2,
    SELL_LIMIT = 3,
    BUY_STOP = 4,
    SELL_STOP = 5
}

export type TradeInfo = {
    time: Date;
    status: "PENDING" | "OPEN" | "FAILED";
    id: number;
    symbol: string;
    type: TradeOp;
    lots: number;
    price: number;
    maxSlippage: number;
    /** Only put more than 1 if you want to split trades, else put 1 */
    qty?: number;
    comment?: string;
    stopLoss?: number;
    takeProfit?: number;
}

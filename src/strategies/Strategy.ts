type TradeInfo = {
    type: "LIMIT" | "MARKET" | "STOP";
    direction: "LONG" | "SHORT";
    status: "PENDING" | "OPEN";
    id: number;
    time: Date;
    size: number;
    symbol: string;
    etc: any; //TODO: add all trade info here
}

class Strategy {
    curTrades: TradeInfo[];

    constructor() {
        this.curTrades = [];
    }

    update() {

    }

    makeTrade(type, direction, takeProfit, stopLoss) {

    }
}
export default Strategy;

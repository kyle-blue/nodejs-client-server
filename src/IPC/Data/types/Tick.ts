export interface Tick {
    bid: number;
    ask: number;
    time: Date;
}

export enum TickEnum {
    BID, ASK, TIME
}

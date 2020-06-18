// This is a singleton pattern, however, this doesn't work for
// sharing between worker threads. Gonna need messaging.

import CircularFloatArray from "../Util/CircularFloatArray";
import data from "./Data";
import { TickEnum } from "./Data/types/Tick";

const SYSTEM = {
    maxDrawDownPerWeek: "6%",
    /** 0.01 means 1% risk per trade */
    riskPerTrade: 0.01,
    maxOpenRisk: "6%",
    botReactionSpeed: 10, // How many trades / time should you average the profit over
    numberOfSimultatiousStrategies: 5,
    strategyCutoff: "+0.2R", // How many x risk in profit should be made on average to consider the strategy profitable (or instead you could do some normal distribution thing again)
};


// TODO: store balance history in db
export enum AI {
    /** dynamic */ EQUITY, BALANCE, FREE_MARGIN, /** static */ LEVERAGE, COMMISSION, BASE_COMMISSION
}


/** Shared account data */
export class Account {
    system: typeof SYSTEM;
    infoArray: CircularFloatArray;

    constructor() {
        this.infoArray = undefined; // Dynamic
        this.system = SYSTEM; // HardCoded
    }

    updateCommission(): void {
        if (data.ticks.GBPUSDp && data.ticks.GBPUSDp.length !== 0) {
            this.setCommission(this.getBaseCommission() / data.ticks.GBPUSDp.lastVal(TickEnum.ASK));
        } else {
            this.setCommission(this.getBaseCommission());
        }
    }

    getEquity(): number { return this.infoArray.get(0, AI.EQUITY); }
    setEquity(val: number): void { return this.infoArray.set(0, val, AI.EQUITY); }

    getBalance(): number { return this.infoArray.get(0, AI.BALANCE); }
    setBalance(val: number): void { return this.infoArray.set(0, val, AI.BALANCE); }

    getFreeMargin(): number { return this.infoArray.get(0, AI.FREE_MARGIN); }
    setFreeMargin(val: number): void { return this.infoArray.set(0, val, AI.FREE_MARGIN); }

    getLeverage(): number { return this.infoArray.get(0, AI.LEVERAGE); }
    setLeverage(val: number): void { return this.infoArray.set(0, val, AI.LEVERAGE); }

    getCommission(): number { return this.infoArray.get(0, AI.COMMISSION); }
    setCommission(val: number): void { return this.infoArray.set(0, val, AI.COMMISSION); }

    getBaseCommission(): number { return this.infoArray.get(0, AI.BASE_COMMISSION); }
    setBaseCommission(val: number): void { return this.infoArray.set(0, val, AI.BASE_COMMISSION); }
}

const instance = new Account();
export default instance;

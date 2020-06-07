import { MessagePortType, WorkerType } from "./MessageType";


class Channels {
    api: MessagePortType;
    subscriber: WorkerType | MessagePortType;
    stratManager: WorkerType | MessagePortType;

    constructor() {
        this.api = undefined;
        this.subscriber = undefined;
        this.stratManager = undefined;
    }

    getOtherChannels(): (WorkerType | MessagePortType) [] {
        let arr = [];
        if (this.api) arr.push(this.api);
        if (this.subscriber) arr.push(this.subscriber);
        if (this.stratManager) arr.push(this.stratManager);
        return arr;
    }
}

const instance = new Channels();
export default instance;

import { MessagePortType, WorkerType, MessageType } from "./MessageType";


class Channels {
    api: MessagePortType;
    subscriber: WorkerType | MessagePortType;
    stratManager: WorkerType | MessagePortType;

    apiReady: boolean;
    subscriberReady: boolean;
    stratManagerReady: boolean;

    constructor() {
        this.api = undefined;
        this.subscriber = undefined;
        this.stratManager = undefined;

        this.apiReady = false;
        this.subscriberReady = false;
        this.stratManagerReady = false;
    }

    getOtherChannels(): (WorkerType | MessagePortType) [] {
        let arr = [];
        if (this.api) arr.push(this.api);
        if (this.subscriber) arr.push(this.subscriber);
        if (this.stratManager) arr.push(this.stratManager);
        return arr;
    }

    isReady(): boolean {
        return this.apiReady && this.subscriberReady && this.stratManagerReady;
    }

    setReady(): void {
        if (!this.api) this.apiReady = true;
        if (!this.subscriber) this.subscriberReady = true;
        if (!this.stratManager) this.stratManagerReady = true;

        const channels = this.getOtherChannels();
        for (const channel of channels) {
            channel.postMessage({ type: "READY" });
        }
    }
}

const instance = new Channels();
export default instance;

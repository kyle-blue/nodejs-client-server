class CircularArray extends Array {
    /** Where arr.push(x) adds to */
    public first: number;
    public last: number;
    private numAdded: number;

    constructor(public length, defaultVal: any = undefined) {
        super(length);
        this.fill(defaultVal);
        this.first = 0;
        this.last = 0;
        this.numAdded = 0;
    }

    push(value: any): this{
        const next = (this.last + 1) % this.length;
        super[next] = value;
        this.last = next;
        if (this.numAdded >= this.length) this.first = (this.first + 1) % this.length;
        this.numAdded += 1;
        return this;
    }


    forEach(predicate: (value: any, index: number, arr: CircularArray) => void, thisArg?: any): void {
        predicate.bind(thisArg);
        for (let i = 0, cur = this.first; i < this.length; i++, cur = (cur + 1) % this.length) {
            predicate(this[cur], cur, this);
        }
    }

    next(currentIndex: number) {
        return (currentIndex + 1) % this.length;
    }
}

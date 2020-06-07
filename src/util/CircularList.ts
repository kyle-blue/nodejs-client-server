class CircularList<T> extends Array {
    /** Where arr.push(x) adds to */
    public first: number;
    public last: number;
    public currentLength: number;

    constructor(public length, defaultVal: T = undefined) {
        super(length);
        this.fill(defaultVal);
        this.first = -1;
        this.last = -1;
        this.currentLength = 0;
    }

    push(value: T): this {
        this.last = this.getIndex(this.last + 1);
        super[this.last] = value;
        if (this.currentLength === this.length || this.first === -1) this.first = this.getIndex(this.first + 1);
        if (this.currentLength < this.length) this.currentLength++;
        return this;
    }

    lastVal(): T {
        return this[this.last];
    }

    firstVal(): T {
        return this[this.first];
    }

    getIndex(index: number, offset = 0): number {
        let newIndex = (index + offset) % this.length;
        if (newIndex < 0) {
            newIndex += this.length;
        }
        return newIndex;
    }


    forEach(predicate: (value: T, index: number, arr: CircularList<T>) => (boolean | void), thisArg?: any): void {
        predicate.bind(thisArg);
        for (let i = 0, cur = this.first; i < this.currentLength; i++, cur = this.getIndex(cur + 1)) {
            if (predicate(this[cur], cur, this)) return;
        }
    }

    findIndex(predicate: (value: T, index: number, arr: CircularList<T>) => boolean, thisArg?: any): number {
        predicate.bind(thisArg);
        for (let i = 0, cur = this.first; i < this.currentLength; i++, cur = this.getIndex(cur + 1)) {
            if (predicate(this[cur], cur, this)) {
                return cur;
            }
        }
        return -1;
    }

    find(predicate: (value: T, index: number, arr: CircularList<T>) => boolean, thisArg?: any): T {
        predicate.bind(thisArg);
        for (let i = 0, cur = this.first; i < this.currentLength; i++, cur = this.getIndex(cur + 1)) {
            if (predicate(this[cur], cur, this)) {
                return this[cur];
            }
        }
    }

    /** Find the difference between indexes */
    difference(last: number, first: number) {
        let dif;
        if (last < first) {
            dif = this.length - (first - last);
        } else {
            dif = last - first;
        }
        return dif;
    }

    next(currentIndex: number): number {
        return this.getIndex(currentIndex + 1);
    }
}


export default CircularList;

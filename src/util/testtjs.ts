/* eslint-disable max-len */
const UNLOCKED = 0;
const LOCKED = 1;


class CircularFloatArray {
    public first: number;
    public last: number;
    public currentLength: number;
    // public arr: Float64Array; This isn't actually needed. We always convert through tempFloatArr
    public arr: Int32Array;
    public buf: SharedArrayBuffer;
    public length: number;
    /** How many times bigger is Float64Array then Int32Array */
    private readonly mult: number;
    private tempBuf: ArrayBuffer;
    private tempIntArr: Int32Array;
    private tempFloatArr: Float64Array;
    public floatArr: Float64Array;


    /*** @param x Either the length of a new Float64Array or the SharedArrayBuffer of an existing CircularFloatArray */
    constructor(x: number | SharedArrayBuffer) {
        this.mult = 2;
        if (typeof x === "number") {
            this.length = x;
            this.buf = new SharedArrayBuffer((this.length + 1) * (32 / 8) * this.mult); // + 1 For the last index, used for mutex locking
            this.arr = new Int32Array(this.buf);
        } else {
            this.buf = x;
            this.arr = new Int32Array(this.buf);
            this.length = (this.arr.length / this.mult) - 1;
        }
        this.floatArr = new Float64Array(this.buf);

        this.tempBuf = new ArrayBuffer(1 * (32 / 8) * this.mult);
        this.tempIntArr = new Int32Array(this.tempBuf);
        this.tempFloatArr = new Float64Array(this.tempBuf);

        this.first = -1;
        this.last = -1;
        this.currentLength = 0;
    }

    /** Atomic set operation */
    set(index: number, value: number): void {
        this.tempFloatArr[0] = value;
        for (let i = 0; i < this.mult; i++) {
            Atomics.store(this.arr, (index * this.mult) + i, this.tempIntArr[i]);
        }
    }

    /** Atomic get operation */
    get(index: number): number {
        for (let i = 0; i < this.mult; i++) {
            this.tempIntArr[i] = Atomics.load(this.arr, (index * this.mult) + i);
        }
        return this.tempFloatArr[0];
    }

    lock(): void {
        const index = this.length * this.mult;
        for (;;) {
            if (Atomics.compareExchange(this.arr, index, UNLOCKED, LOCKED) === UNLOCKED) {
                return;
            }
            Atomics.wait(this.arr, index, LOCKED);
        }
    }

    unlock(): void {
        const index = this.length * this.mult;
        if (Atomics.compareExchange(this.arr, index, LOCKED, UNLOCKED) !== LOCKED) {
            throw new Error("Mutex is in inconsistent state: unlock on unlocked Mutex.");
        }
        Atomics.notify(this.arr, index, 1);
    }

    push(value: number): this {
        this.last = this.getIndex(this.last + 1);
        this.set(this.last, value);
        if (this.currentLength === this.length || this.first === -1) this.first = this.getIndex(this.first + 1);
        if (this.currentLength < this.length) this.currentLength++;
        return this;
    }

    lastVal(): number {
        return this.get(this.last);
    }

    firstVal(): number {
        return this.get(this.first);
    }

    getIndex(index: number, offset = 0): number {
        let newIndex = (index + offset) % this.length;
        if (newIndex < 0) {
            newIndex += this.length;
        }
        return newIndex;
    }


    forEach(predicate: (value: number, index: number, arr: CircularFloatArray) => (boolean | void), thisArg?: any): void {
        predicate.bind(thisArg);
        for (let i = 0, cur = this.first; i < this.currentLength; i++, cur = this.getIndex(cur + 1)) {
            if (predicate(this.get(cur), cur, this)) return;
        }
    }

    /** Returns the index when the predicate is true, else -1 */
    findIndex(predicate: (value: number, index: number, arr: CircularFloatArray) => boolean, thisArg?: any): number {
        predicate.bind(thisArg);
        for (let i = 0, cur = this.first; i < this.currentLength; i++, cur = this.getIndex(cur + 1)) {
            if (predicate(this.get(cur), cur, this)) {
                return cur;
            }
        }
        return -1;
    }

    /** Returns the value when the predicate is true, else undefined */
    find(predicate: (value: number, index: number, arr: CircularFloatArray) => boolean, thisArg?: any): number {
        predicate.bind(thisArg);
        for (let i = 0, cur = this.first; i < this.currentLength; i++, cur = this.getIndex(cur + 1)) {
            if (predicate(this.get(cur), cur, this)) {
                return this.get(cur);
            }
        }
        return undefined;
    }

    /** Find the difference between indexes */
    difference(last: number, first: number): number {
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

const mine = new CircularFloatArray(10);
mine.lock();
mine.push(510.3123);
mine.push(69.6969);
mine.push(420);
mine.push(100000000.319208);
mine.push(100000000.319208);
mine.push(100000000.319208);
mine.push(1.319208);
mine.push(100000000.319208);
mine.push(100000000.319208);
mine.push(100000000.319208);
mine.push(100000000.319208);
mine.push(100000000.319208);
setTimeout(() => {
    console.log("unlockingdwadwdw");
    console.log("unlockingdwadwdw");
    console.log("unlockingdwadwdw");
    console.log("unlockingdwadwdw");
    console.log(mine);
}, 1000);

mine.lock();
console.log("haiiii");
mine.forEach((value, index) => {
    console.log(`i: ${index} --- val: ${value}`);
});

console.log(`Foound index ${mine.findIndex((val) => val === 1.319208)}`);
console.log(mine);
mine.unlock();

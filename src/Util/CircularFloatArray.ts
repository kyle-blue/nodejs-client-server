

/* eslint-disable max-len */
const UNLOCKED = 0;
const LOCKED = 1;

const FIRST_OFFSET = 1;
const LAST_OFFSET = 2;
const CURRENT_LENGTH_OFFSET = 3;
/** IMPORTANT: WHEN ACCESSING FIRSTVAL, YOU MUST USE LOCK */
class CircularFloatArray {
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
    public names: any[];
    private namesLen: number;


    /*** @param x Either the length of a new Float64Array or the SharedArrayBuffer of an existing CircularFloatArray */
    constructor(x: number | SharedArrayBuffer, ...names) {
        if (names) this.names = names;
        if (!names || names.length === 0) this.namesLen = 1;
        else this.namesLen = names.length;
        this.mult = Float64Array.BYTES_PER_ELEMENT / Int32Array.BYTES_PER_ELEMENT;


        this.tempBuf = new ArrayBuffer(1 * Int32Array.BYTES_PER_ELEMENT * this.mult);
        this.tempIntArr = new Int32Array(this.tempBuf);
        this.tempFloatArr = new Float64Array(this.tempBuf);
        if (typeof x === "number") {
            this.length = x;
            const len = this.length * Int32Array.BYTES_PER_ELEMENT * this.mult * this.namesLen;
            const extra = this.mult * Int32Array.BYTES_PER_ELEMENT * 4; // + 4 for mutex, for first, last and currentLength
            this.buf = new SharedArrayBuffer(len + extra);
            this.arr = new Int32Array(this.buf);

            this.setFirst(-1);
            this.setLast(-1);
            this.setCurrentLength(0);
        } else {
            this.buf = x;
            this.arr = new Int32Array(this.buf);
            this.length = ((this.arr.length - (4 * this.mult)) / this.mult / this.namesLen);
        }

        this.floatArr = new Float64Array(this.buf);
    }

    public setFirst = (value: number): void => this.setOffset(this.length, value, FIRST_OFFSET);
    public getFirst = (): number => this.getOffset(this.length, FIRST_OFFSET);
    public setLast = (value: number): void => this.setOffset(this.length, value, LAST_OFFSET);
    public getLast = (): number => this.getOffset(this.length, LAST_OFFSET);
    public setCurrentLength = (value: number): void => this.setOffset(this.length, value, CURRENT_LENGTH_OFFSET);
    public getCurrentLength = (): number => this.getOffset(this.length, CURRENT_LENGTH_OFFSET);


    /** Atomic set operation */
    set(index: number, value: number, name: any = undefined): void {
        let offset = 0;
        if (name) {
            offset = this.names.findIndex((val) => val === name);
            if (offset === -1) throw Error(`Could not set ${name} in array`);
        }
        this.tempFloatArr[0] = value;
        for (let i = 0; i < this.mult; i++) {
            Atomics.store(this.arr, (index * this.mult * this.namesLen) + i + (offset * this.mult), this.tempIntArr[i]);
        }
    }

    setOffset(index: number, value: number, offset: number): void {
        this.tempFloatArr[0] = value;
        for (let i = 0; i < this.mult; i++) {
            Atomics.store(this.arr, (index * this.mult * this.namesLen) + i + (offset * this.mult), this.tempIntArr[i]);
        }
    }


    /** Atomic set operation that sets all names at once */
    setAll(index: number, ...values: number[]): void {
        if (values.length !== this.namesLen) {
            throw Error(`setAll: Length of values is ${values.length} it should be ${this.namesLen}`);
        }
        for (let offset = 0; offset < this.namesLen; offset++) {
            this.tempFloatArr[0] = values[offset];
            for (let i = 0; i < this.mult; i++) {
                Atomics.store(this.arr, (index * this.mult * this.namesLen) + i + (offset * this.mult), this.tempIntArr[i]);
            }
        }
    }

    /** Atomic get operation */
    get(index: number, name: any = undefined): number {
        let offset = 0;
        if (name) {
            offset = this.names.findIndex((val) => val === name);
            if (offset === -1) throw Error(`Could not get ${name} in array`);
        }
        for (let i = 0; i < this.mult; i++) {
            this.tempIntArr[i] = Atomics.load(this.arr, (index * this.mult * this.namesLen) + i + (offset * this.mult));
        }
        return this.tempFloatArr[0];
    }

    getOffset(index: number, offset: number): number {
        for (let i = 0; i < this.mult; i++) {
            this.tempIntArr[i] = Atomics.load(this.arr, (index * this.mult * this.namesLen) + i + (offset * this.mult));
        }
        return this.tempFloatArr[0];
    }

    lock(): void {
        const index = this.length * this.mult * this.namesLen;
        for (;;) {
            if (Atomics.compareExchange(this.arr, index, UNLOCKED, LOCKED) === UNLOCKED) {
                return;
            }
            Atomics.wait(this.arr, index, LOCKED);
        }
    }

    unlock(): void {
        const index = this.length * this.mult * this.namesLen;
        if (Atomics.compareExchange(this.arr, index, LOCKED, UNLOCKED) !== LOCKED) {
            throw new Error("Mutex is in inconsistent state: unlock on unlocked Mutex.");
        }
        Atomics.notify(this.arr, index, 1);
    }

    /** Because of locking, the order here is highly important. Dont change it... */
    push(...value: number[]): this {
        const last = this.getIndex(this.getLast() + 1);
        const first = this.getFirst();
        const currentLength = this.getCurrentLength();
        if (currentLength === this.length) this.setFirst(this.getIndex(first + 1));
        if (this.namesLen > 1) this.setAll(last, ...value);
        else this.set(last, value[0]);
        if (currentLength < this.length) this.setCurrentLength(currentLength + 1);
        if (first === -1) this.setFirst(this.getIndex(first + 1));
        this.setLast(last);
        return this;
    }

    lastVal(name?: any): number {
        return this.get(this.getLast(), name);
    }

    firstVal(name?: any): number {
        return this.get(this.getFirst(), name);
    }

    getIndex(index: number, offset = 0): number {
        let newIndex = (index + offset) % this.length;
        if (newIndex < 0) {
            newIndex += this.length;
        }
        return newIndex;
    }


    forEach(predicate: (index: number, arr: CircularFloatArray) => (boolean | void), thisArg?: any): void {
        const currentLength = this.getCurrentLength();
        predicate.bind(thisArg);
        for (let i = 0, cur = this.getFirst(); i < currentLength; i++, cur = this.getIndex(cur + 1)) {
            if (predicate(cur, this)) return;
        }
    }

    /** Returns the index when the predicate is true, else -1 */
    findIndex(predicate: (index: number, arr: CircularFloatArray) => boolean, thisArg?: any): number {
        const currentLength = this.getCurrentLength();
        predicate.bind(thisArg);
        for (let i = 0, cur = this.getFirst(); i < currentLength; i++, cur = this.getIndex(cur + 1)) {
            if (predicate(cur, this)) {
                return cur;
            }
        }
        return -1;
    }

    /** Returns the value when the predicate is true, else undefined */
    find(predicate: (index: number, arr: CircularFloatArray) => boolean, thisArg?: any): number {
        const currentLength = this.getCurrentLength();
        predicate.bind(thisArg);
        for (let i = 0, cur = this.getFirst(); i < currentLength; i++, cur = this.getIndex(cur + 1)) {
            if (predicate(cur, this)) {
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

export default CircularFloatArray;

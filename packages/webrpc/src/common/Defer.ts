export class Defer<T> {
    private _resolve!: (value: T) => void;
    private _reject!: (reason: unknown) => void;
    private _promise: Promise<T>;
    constructor() {
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }
    public get promise() {
        return this._promise;
    }
    public resolve(value: T) {
        this._resolve(value);
    }
    public reject(reason: unknown) {
        this._reject(reason);
    }
}

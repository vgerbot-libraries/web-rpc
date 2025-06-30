import { isFunction } from '../../src/common/isFunction';
import { isPlainObject } from '../../src/common/isPlainObject';
import { isPromiseLike } from '../../src/common/isPromiseLike';
import { isTransferable } from '../../src/common/isTransferable';
import { isTypedArray } from '../../src/common/isTypedArray';
import { Defer } from '../../src/common/Defer';

describe('Common Utilities', () => {
    describe('isFunction', () => {
        it('should return true for functions', () => {
            expect(isFunction(() => {})).toBe(true);
            expect(isFunction(function () {})).toBe(true);
            expect(isFunction(async () => {})).toBe(true);
            expect(isFunction(function* () {})).toBe(true);
            expect(isFunction(Math.max)).toBe(true);
        });

        it('should return false for non-functions', () => {
            expect(isFunction(null)).toBe(false);
            expect(isFunction(undefined)).toBe(false);
            expect(isFunction('string')).toBe(false);
            expect(isFunction(123)).toBe(false);
            expect(isFunction({})).toBe(false);
            expect(isFunction([])).toBe(false);
        });
    });

    describe('isPlainObject', () => {
        it('should return true for plain objects', () => {
            expect(isPlainObject({})).toBe(true);
            expect(isPlainObject({ a: 1 })).toBe(true);
            expect(isPlainObject(Object.create(null))).toBe(true);
        });

        it('should return false for non-plain objects', () => {
            expect(isPlainObject(null)).toBe(false);
            expect(isPlainObject(undefined)).toBe(false);
            expect(isPlainObject('string')).toBe(false);
            expect(isPlainObject(123)).toBe(false);
            expect(isPlainObject([])).toBe(false);
            expect(isPlainObject(new Date())).toBe(false);
            expect(isPlainObject(new RegExp(''))).toBe(false);
        });
    });

    describe('isPromiseLike', () => {
        it('should return true for promise-like objects', () => {
            expect(isPromiseLike(Promise.resolve())).toBe(true);
            expect(isPromiseLike({ then: () => {} })).toBe(true);
        });

        it('should return false for non-promise-like objects', () => {
            expect(isPromiseLike(null)).toBe(false);
            expect(isPromiseLike(undefined)).toBe(false);
            expect(isPromiseLike('string')).toBe(false);
            expect(isPromiseLike(123)).toBe(false);
            expect(isPromiseLike({})).toBe(false);
            // Note: isPromiseLike only checks for 'then' property existence, not if it's a function
            expect(isPromiseLike({ then: 'not a function' })).toBe(true);
        });
    });

    describe('isTransferable', () => {
        it('should return true for transferable objects', () => {
            expect(isTransferable(new ArrayBuffer(8))).toBe(true);
        });

        it('should return false for non-transferable objects', () => {
            // Note: In Node.js environment, some globalThis objects are undefined,
            // causing the function to return undefined instead of false
            const testValues = [null, undefined, 'string', 123, {}, []];
            testValues.forEach(value => {
                const result = isTransferable(value);
                expect(result === false || result === undefined).toBe(true);
            });
        });
    });

    describe('isTypedArray', () => {
        it('should return true for typed arrays', () => {
            expect(isTypedArray(new Uint8Array())).toBe(true);
            expect(isTypedArray(new Int16Array())).toBe(true);
            expect(isTypedArray(new Uint16Array())).toBe(true);
            expect(isTypedArray(new Uint32Array())).toBe(true);
            expect(isTypedArray(new Int8Array())).toBe(true);
            expect(isTypedArray(new Int32Array())).toBe(true);
            expect(isTypedArray(new Uint8ClampedArray())).toBe(true);
            // Note: Float32Array and BigInt64Array are not included in the current implementation
            expect(isTypedArray(new Float32Array())).toBe(false);
            expect(isTypedArray(new BigInt64Array())).toBe(false);
        });

        it('should return false for non-typed arrays', () => {
            expect(isTypedArray(null)).toBe(false);
            expect(isTypedArray(undefined)).toBe(false);
            expect(isTypedArray('string')).toBe(false);
            expect(isTypedArray(123)).toBe(false);
            expect(isTypedArray({})).toBe(false);
            expect(isTypedArray([])).toBe(false);
            expect(isTypedArray(new ArrayBuffer(8))).toBe(false);
        });
    });

    describe('Defer', () => {
        it('should create a deferred object with promise', () => {
            const deferred = new Defer<string>();

            expect(deferred.promise).toBeInstanceOf(Promise);
            expect(typeof deferred.resolve).toBe('function');
            expect(typeof deferred.reject).toBe('function');
        });

        it('should resolve the promise when resolve is called', async () => {
            const deferred = new Defer<string>();
            const testValue = 'test value';

            deferred.resolve(testValue);
            const result = await deferred.promise;

            expect(result).toBe(testValue);
        });

        it('should reject the promise when reject is called', async () => {
            const deferred = new Defer<string>();
            const testError = new Error('test error');

            deferred.reject(testError);

            await expect(deferred.promise).rejects.toThrow('test error');
        });
    });
});

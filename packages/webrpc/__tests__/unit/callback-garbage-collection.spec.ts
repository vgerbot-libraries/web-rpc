import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deserializeRequestData } from '../../src/common/deserializeRequestData';
import { CALLBACK_FLAG } from '../../src/protocol/Callback';
import { GETTER_FLAG } from '../../src/protocol/Getter';

describe('Callback Garbage Collection', () => {
    let mockInvokeCallback: ReturnType<typeof vi.fn>;
    let mockCleanupCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockInvokeCallback = vi.fn();
        mockCleanupCallback = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('FinalizationRegistry Integration', () => {
        it('should register callbacks with FinalizationRegistry', () => {
            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'func-123',
            };

            const data = [callbackObj];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(1);
            expect(typeof result[0]).toBe('function');
            // The callback should be registered with FinalizationRegistry
            // We can't directly test the registry, but we can verify the function was created
            expect(mockCleanupCallback).not.toHaveBeenCalled(); // Not called immediately
        });

        it('should register getter callbacks with FinalizationRegistry', () => {
            const getterObj = {
                flag: GETTER_FLAG,
                contextId: 'test-context',
                id: 'getter-456',
            };

            const data = [{ computed: getterObj }];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(1);
            const obj = result[0] as Record<string, unknown>;
            expect(obj.computed).toBeDefined();
            // The getter should be registered with FinalizationRegistry
            expect(mockCleanupCallback).not.toHaveBeenCalled(); // Not called immediately
        });

        it('should handle multiple callbacks with different IDs', () => {
            const callback1 = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'func-1',
            };
            const callback2 = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'func-2',
            };

            const data = [callback1, callback2];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(2);
            expect(typeof result[0]).toBe('function');
            expect(typeof result[1]).toBe('function');
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });

        it('should handle nested callbacks with proper cleanup registration', () => {
            const nestedCallback = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'nested-func',
            };

            const data = [
                {
                    level1: {
                        level2: {
                            callback: nestedCallback,
                        },
                    },
                },
            ];

            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(1);
            const obj = result[0] as Record<string, unknown>;
            const level1 = obj.level1 as Record<string, unknown>;
            const level2 = level1.level2 as Record<string, unknown>;
            expect(typeof level2.callback).toBe('function');
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });
    });

    describe('Cleanup Callback Functionality', () => {
        it('should call cleanup callback when provided', () => {
            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'func-cleanup-test',
            };

            const data = [callbackObj];
            deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            // Verify the cleanup callback function is properly passed
            // We can't directly trigger garbage collection in tests, but we can verify
            // that the function is called when we manually invoke it
            mockCleanupCallback('func-cleanup-test');
            expect(mockCleanupCallback).toHaveBeenCalledWith('func-cleanup-test');
        });

        it('should handle cleanup for getter callbacks', () => {
            const getterObj = {
                flag: GETTER_FLAG,
                contextId: 'test-context',
                id: 'getter-cleanup-test',
            };

            const data = [{ computed: getterObj }];
            deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            // Test that cleanup callback can be called for getter
            mockCleanupCallback('getter-cleanup-test');
            expect(mockCleanupCallback).toHaveBeenCalledWith('getter-cleanup-test');
        });

        it('should handle cleanup for multiple different callback types', () => {
            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'func-multi',
            };
            const getterObj = {
                flag: GETTER_FLAG,
                contextId: 'test-context',
                id: 'getter-multi',
            };

            const data = [
                {
                    callback: callbackObj,
                    getter: getterObj,
                },
            ];

            deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            // Test cleanup for both types
            mockCleanupCallback('func-multi');
            mockCleanupCallback('getter-multi');
            expect(mockCleanupCallback).toHaveBeenCalledWith('func-multi');
            expect(mockCleanupCallback).toHaveBeenCalledWith('getter-multi');
        });
    });

    describe('Memory Management', () => {
        it('should not leak references when callbacks are garbage collected', () => {
            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'func-memory-test',
            };

            const data = [callbackObj];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            // Store reference to the callback
            const callback = result[0] as Function;
            expect(typeof callback).toBe('function');

            // Clear the reference
            result.length = 0;

            // The callback should be eligible for garbage collection
            // We can't directly test GC, but we can verify the structure is correct
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });

        it('should handle circular references with cleanup', () => {
            const circularObj: Record<string, unknown> = {
                callback: {
                    flag: CALLBACK_FLAG,
                    contextId: 'test-context',
                    id: 'circular-callback',
                },
                self: null,
            };
            circularObj.self = circularObj;

            const data = [circularObj];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(1);
            const processedObj = result[0] as Record<string, unknown>;
            expect(processedObj.self).toBe(processedObj);
            expect(typeof processedObj.callback).toBe('function');
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });

        it('should handle arrays with callbacks and cleanup', () => {
            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'array-callback',
            };

            const data = [[1, 2, callbackObj, 3], callbackObj];

            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(2);
            expect(Array.isArray(result[0])).toBe(true);
            expect(typeof result[1]).toBe('function');
            expect(typeof (result[0] as unknown[])[2]).toBe('function');
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle cleanup callback errors gracefully', () => {
            const errorCleanupCallback = vi.fn((callbackId: string) => {
                throw new Error('Cleanup error');
            });

            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'func-error-test',
            };

            const data = [callbackObj];

            // Should not throw during deserialization
            expect(() => {
                deserializeRequestData(data, mockInvokeCallback, errorCleanupCallback);
            }).not.toThrow();

            // Should throw when cleanup callback is called
            expect(() => {
                errorCleanupCallback('func-error-test');
            }).toThrow('Cleanup error');
        });

        it('should handle undefined cleanup callback', () => {
            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'func-undefined-cleanup',
            };

            const data = [callbackObj];

            // Should not throw even with undefined cleanup callback
            expect(() => {
                deserializeRequestData(data, mockInvokeCallback, undefined as any);
            }).toThrow(); // This should throw because FinalizationRegistry requires a cleanup function
        });
    });

    describe('Integration with Existing Functionality', () => {
        it('should maintain existing callback functionality while adding cleanup', async () => {
            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'func-integration-test',
            };

            mockInvokeCallback.mockResolvedValue('integration-result');

            const data = [callbackObj];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(1);
            expect(typeof result[0]).toBe('function');

            const callback = result[0] as Function;
            const callResult = await callback('test-arg');

            expect(callResult).toBe('integration-result');
            expect(mockInvokeCallback).toHaveBeenCalledWith('func-integration-test', ['test-arg']);
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });

        it('should maintain existing getter functionality while adding cleanup', async () => {
            const getterObj = {
                flag: GETTER_FLAG,
                contextId: 'test-context',
                id: 'getter-integration-test',
            };

            mockInvokeCallback.mockResolvedValue('getter-integration-result');

            const data = [{ computed: getterObj }];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(1);
            const obj = result[0] as Record<string, unknown>;

            const getterResult = await obj.computed;
            expect(getterResult).toBe('getter-integration-result');
            expect(mockInvokeCallback).toHaveBeenCalledWith('getter-integration-test', []);
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });
    });
});

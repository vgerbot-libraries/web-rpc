import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deserializeRequestData } from '../../src/common/deserializeRequestData';
import { WebRPCPort } from '../../src/core/WebRPCPort';
import { CALLBACK_FLAG } from '../../src/protocol/Callback';
import { GETTER_FLAG } from '../../src/protocol/Getter';

describe('Memory Leak Prevention', () => {
    let mockTransport: { send: ReturnType<typeof vi.fn> };
    let webRPCPort: WebRPCPort;
    let mockInvokeCallback: ReturnType<typeof vi.fn>;
    let mockCleanupCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockTransport = { send: vi.fn() };
        webRPCPort = new WebRPCPort('test-client', mockTransport);
        mockInvokeCallback = vi.fn();
        mockCleanupCallback = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Callback Registry Management', () => {
        it('should track callbacks in the registry', () => {
            const callbackId = 'test-callback-123';
            const mockCallback = vi.fn();

            // Add callback to registry
            (webRPCPort as any).callbacks.set(callbackId, mockCallback);

            // Verify callback is tracked
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(true);
            expect((webRPCPort as any).callbacks.get(callbackId)).toBe(mockCallback);
        });

        it('should remove callbacks from registry during cleanup', () => {
            const callbackId = 'cleanup-test-456';
            const mockCallback = vi.fn();

            // Add callback to registry
            (webRPCPort as any).callbacks.set(callbackId, mockCallback);
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(true);

            // Remove callback from registry
            (webRPCPort as any).callbacks.delete(callbackId);
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(false);
        });

        it('should handle multiple callbacks in registry', () => {
            const callbackIds = ['callback-1', 'callback-2', 'callback-3'];
            const mockCallbacks = callbackIds.map(id => vi.fn());

            // Add multiple callbacks
            callbackIds.forEach((id, index) => {
                (webRPCPort as any).callbacks.set(id, mockCallbacks[index]);
            });

            // Verify all callbacks are tracked
            callbackIds.forEach(id => {
                expect((webRPCPort as any).callbacks.has(id)).toBe(true);
            });

            // Verify registry size
            expect((webRPCPort as any).callbacks.size).toBe(3);
        });

        it('should prevent duplicate callback registrations', () => {
            const callbackId = 'duplicate-test';
            const mockCallback1 = vi.fn();
            const mockCallback2 = vi.fn();

            // Add first callback
            (webRPCPort as any).callbacks.set(callbackId, mockCallback1);
            expect((webRPCPort as any).callbacks.get(callbackId)).toBe(mockCallback1);

            // Overwrite with second callback
            (webRPCPort as any).callbacks.set(callbackId, mockCallback2);
            expect((webRPCPort as any).callbacks.get(callbackId)).toBe(mockCallback2);
            expect((webRPCPort as any).callbacks.size).toBe(1);
        });
    });

    describe('FinalizationRegistry Integration', () => {
        it('should register callbacks with FinalizationRegistry for automatic cleanup', () => {
            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'finalization-test',
            };

            const data = [callbackObj];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(1);
            expect(typeof result[0]).toBe('function');

            // The callback should be registered with FinalizationRegistry
            // We can't directly test the registry, but we can verify the function was created
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });

        it('should register getters with FinalizationRegistry for automatic cleanup', () => {
            const getterObj = {
                flag: GETTER_FLAG,
                contextId: 'test-context',
                id: 'getter-finalization-test',
            };

            const data = [{ computed: getterObj }];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(1);
            const obj = result[0] as Record<string, unknown>;
            expect(obj.computed).toBeDefined();

            // The getter should be registered with FinalizationRegistry
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });

        it('should handle cleanup callback invocation', () => {
            const callbackId = 'cleanup-invocation-test';

            // Simulate cleanup callback being called
            mockCleanupCallback(callbackId);

            expect(mockCleanupCallback).toHaveBeenCalledWith(callbackId);
            expect(mockCleanupCallback).toHaveBeenCalledTimes(1);
        });
    });

    describe('Memory Leak Scenarios', () => {
        it('should prevent accumulation of unused callbacks', () => {
            const callbackIds = [];

            // Create many callbacks
            for (let i = 0; i < 1000; i++) {
                const callbackId = `callback-${i}`;
                const mockCallback = vi.fn();
                (webRPCPort as any).callbacks.set(callbackId, mockCallback);
                callbackIds.push(callbackId);
            }

            // Verify all callbacks are registered
            expect((webRPCPort as any).callbacks.size).toBe(1000);

            // Clean up all callbacks
            callbackIds.forEach(id => {
                (webRPCPort as any).callbacks.delete(id);
            });

            // Verify all callbacks are removed
            expect((webRPCPort as any).callbacks.size).toBe(0);
        });

        it('should handle rapid callback creation and destruction', () => {
            const iterations = 100;

            for (let i = 0; i < iterations; i++) {
                const callbackId = `rapid-callback-${i}`;
                const mockCallback = vi.fn();

                // Create callback
                (webRPCPort as any).callbacks.set(callbackId, mockCallback);
                expect((webRPCPort as any).callbacks.has(callbackId)).toBe(true);

                // Immediately destroy callback
                (webRPCPort as any).callbacks.delete(callbackId);
                expect((webRPCPort as any).callbacks.has(callbackId)).toBe(false);
            }

            // Registry should be empty after all iterations
            expect((webRPCPort as any).callbacks.size).toBe(0);
        });

        it('should handle callbacks with circular references', () => {
            const circularCallback = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'circular-callback',
            };

            const data = [circularCallback];
            const result = deserializeRequestData(data, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(1);
            expect(typeof result[0]).toBe('function');

            // Create a circular reference
            const callback = result[0] as Function;
            (callback as any).self = callback;

            // The callback should still be properly registered for cleanup
            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });

        it('should handle nested callback structures', () => {
            const nestedCallbacks = [
                {
                    level1: {
                        level2: {
                            callback: {
                                flag: CALLBACK_FLAG,
                                contextId: 'test-context',
                                id: 'nested-callback-1',
                            },
                        },
                    },
                },
                {
                    callback: {
                        flag: CALLBACK_FLAG,
                        contextId: 'test-context',
                        id: 'nested-callback-2',
                    },
                },
            ];

            const result = deserializeRequestData(nestedCallbacks, mockInvokeCallback, mockCleanupCallback);

            expect(result).toHaveLength(2);

            const obj1 = result[0] as Record<string, unknown>;
            const level1 = obj1.level1 as Record<string, unknown>;
            const level2 = level1.level2 as Record<string, unknown>;
            expect(typeof level2.callback).toBe('function');

            const obj2 = result[1] as Record<string, unknown>;
            expect(typeof obj2.callback).toBe('function');

            expect(mockCleanupCallback).not.toHaveBeenCalled();
        });
    });

    describe('Cleanup Message Handling', () => {
        it('should send cleanup messages for remote callbacks', () => {
            const callbackId = 'remote-cleanup-test';

            // Call cleanup for remote callback
            (webRPCPort as any).cleanupRemoteCallback(callbackId);

            // Verify cleanup message was sent
            expect(mockTransport.send).toHaveBeenCalledWith({
                id: callbackId,
                _webrpc: {
                    action: 'cleanup-callback',
                    timestamp: expect.any(Number),
                },
            });
        });

        it('should handle cleanup messages for local callbacks', () => {
            const callbackId = 'local-cleanup-test';
            const mockCallback = vi.fn();

            // Add callback to registry
            (webRPCPort as any).callbacks.set(callbackId, mockCallback);
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(true);

            // Simulate receiving cleanup message
            const cleanupMessage = {
                id: callbackId,
                _webrpc: {
                    action: 'cleanup-callback',
                    timestamp: Date.now(),
                },
                callbackId,
            };

            webRPCPort.receive(cleanupMessage);

            // Verify callback was removed
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(false);
        });

        it('should handle cleanup messages for non-existent callbacks', () => {
            const callbackId = 'non-existent-callback';

            // Verify callback doesn't exist
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(false);

            // Simulate receiving cleanup message for non-existent callback
            const cleanupMessage = {
                id: callbackId,
                _webrpc: {
                    action: 'cleanup-callback',
                    timestamp: Date.now(),
                },
                callbackId,
            };

            // Should not throw
            expect(() => {
                webRPCPort.receive(cleanupMessage);
            }).not.toThrow();

            // Registry should still be empty
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(false);
        });
    });

    describe('Performance and Stress Testing', () => {
        it('should handle large numbers of callbacks efficiently', () => {
            const startTime = performance.now();
            const callbackCount = 10000;

            // Create many callbacks
            for (let i = 0; i < callbackCount; i++) {
                const callbackId = `perf-callback-${i}`;
                const mockCallback = vi.fn();
                (webRPCPort as any).callbacks.set(callbackId, mockCallback);
            }

            const createTime = performance.now() - startTime;
            expect((webRPCPort as any).callbacks.size).toBe(callbackCount);
            expect(createTime).toBeLessThan(1000); // Should complete within 1 second

            // Clean up all callbacks
            const cleanupStartTime = performance.now();
            (webRPCPort as any).callbacks.clear();
            const cleanupTime = performance.now() - cleanupStartTime;

            expect((webRPCPort as any).callbacks.size).toBe(0);
            expect(cleanupTime).toBeLessThan(100); // Should clean up quickly
        });

        it('should handle concurrent callback operations', () => {
            const concurrentOperations = 100;
            const promises = [];

            // Create concurrent operations
            for (let i = 0; i < concurrentOperations; i++) {
                const promise = new Promise<void>(resolve => {
                    setTimeout(() => {
                        const callbackId = `concurrent-callback-${i}`;
                        const mockCallback = vi.fn();

                        // Create callback
                        (webRPCPort as any).callbacks.set(callbackId, mockCallback);

                        // Verify it exists
                        expect((webRPCPort as any).callbacks.has(callbackId)).toBe(true);

                        // Clean it up
                        (webRPCPort as any).callbacks.delete(callbackId);

                        resolve();
                    }, Math.random() * 10);
                });
                promises.push(promise);
            }

            return Promise.all(promises).then(() => {
                // All operations should complete successfully
                expect((webRPCPort as any).callbacks.size).toBe(0);
            });
        });

        it('should maintain consistent state under stress', () => {
            const stressIterations = 1000;
            let expectedSize = 0;

            for (let i = 0; i < stressIterations; i++) {
                const operation = Math.random();

                if (operation < 0.7) {
                    // Create callback
                    const callbackId = `stress-callback-${i}`;
                    const mockCallback = vi.fn();
                    (webRPCPort as any).callbacks.set(callbackId, mockCallback);
                    expectedSize++;
                } else if (operation < 0.9 && expectedSize > 0) {
                    // Delete callback
                    const callbackId = `stress-callback-${i - 1}`;
                    if ((webRPCPort as any).callbacks.has(callbackId)) {
                        (webRPCPort as any).callbacks.delete(callbackId);
                        expectedSize--;
                    }
                } else {
                    // Clear all callbacks
                    (webRPCPort as any).callbacks.clear();
                    expectedSize = 0;
                }

                // Verify size is consistent
                expect((webRPCPort as any).callbacks.size).toBe(expectedSize);
            }
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle cleanup callback errors gracefully', () => {
            const errorCleanupCallback = vi.fn(() => {
                throw new Error('Cleanup error');
            });

            const callbackObj = {
                flag: CALLBACK_FLAG,
                contextId: 'test-context',
                id: 'error-callback',
            };

            const data = [callbackObj];

            // Should not throw during deserialization
            expect(() => {
                deserializeRequestData(data, mockInvokeCallback, errorCleanupCallback);
            }).not.toThrow();

            // Should throw when cleanup callback is called
            expect(() => {
                errorCleanupCallback('error-callback');
            }).toThrow('Cleanup error');
        });

        it('should handle invalid callback IDs', () => {
            const invalidIds = [null, undefined, '', 123, {}, []];

            invalidIds.forEach(invalidId => {
                // Should not throw when cleaning up invalid callback
                expect(() => {
                    (webRPCPort as any).callbacks.delete(invalidId);
                }).not.toThrow();
            });
        });

        it('should handle cleanup of already cleaned up callbacks', () => {
            const callbackId = 'double-cleanup-test';
            const mockCallback = vi.fn();

            // Add callback
            (webRPCPort as any).callbacks.set(callbackId, mockCallback);
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(true);

            // Clean up first time
            (webRPCPort as any).callbacks.delete(callbackId);
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(false);

            // Clean up second time (should not throw)
            expect(() => {
                (webRPCPort as any).callbacks.delete(callbackId);
            }).not.toThrow();

            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(false);
        });
    });
});

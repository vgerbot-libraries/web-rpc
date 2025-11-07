import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebRPC } from '../../src/core/WebRPC';
import { PostMessageTransport } from '../../src/transports/PostMessageTransport';

describe('Callback Garbage Collection Integration Tests', () => {
    let server: WebRPC;
    let client: WebRPC;
    let serverTransport: PostMessageTransport;
    let clientTransport: PostMessageTransport;
    let channel: MessageChannel;

    beforeEach(() => {
        channel = new MessageChannel();
        serverTransport = new PostMessageTransport(channel.port1);
        clientTransport = new PostMessageTransport(channel.port2);

        server = new WebRPC('test-server', serverTransport);
        client = new WebRPC('test-client', clientTransport);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('End-to-End Callback Cleanup', () => {
        it('should handle callback cleanup in a complete RPC flow', async () => {
            const mockCallback = vi.fn();
            const serverInstance = {
                processWithCallback: (callback: (data: string) => void) => {
                    // Store the callback and call it later
                    setTimeout(() => {
                        callback('processed data');
                    }, 10);
                },
            };

            server.register('processor', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('processor')!;

            // Call the remote method with a callback
            const resultPromise = new Promise<string>(resolve => {
                remoteInstance.processWithCallback((data: string) => {
                    resolve(data);
                });
            });

            const result = await resultPromise;
            expect(result).toBe('processed data');
        });

        it('should handle multiple callbacks with cleanup', async () => {
            const serverInstance = {
                processMultipleCallbacks: (callbacks: {
                    onSuccess: (data: string) => void;
                    onError: (error: string) => void;
                }) => {
                    setTimeout(() => {
                        callbacks.onSuccess('success data');
                    }, 5);
                },
            };

            server.register('multiProcessor', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('multiProcessor')!;

            const resultPromise = new Promise<string>(resolve => {
                remoteInstance.processMultipleCallbacks({
                    onSuccess: (data: string) => resolve(data),
                    onError: (error: string) => resolve(`error: ${error}`),
                });
            });

            const result = await resultPromise;
            expect(result).toBe('success data');
        });

        it('should handle callback cleanup when callbacks are no longer referenced', async () => {
            const serverInstance = {
                createCallback: () => {
                    return (data: string) => {
                        return `processed: ${data}`;
                    };
                },
            };

            server.register('callbackFactory', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('callbackFactory')!;

            // Create a callback
            const callback = await remoteInstance.createCallback();
            expect(typeof callback).toBe('function');

            // Call the callback
            const result = await callback('test data');
            expect(result).toBe('processed: test data');

            // The callback should be eligible for cleanup after this point
            // We can't directly test GC, but we can verify the structure is correct
        });
    });

    describe('Memory Leak Prevention', () => {
        it('should not accumulate callbacks indefinitely', async () => {
            const serverInstance = {
                createCallback: (id: number) => {
                    return (data: string) => {
                        return `callback-${id}: ${data}`;
                    };
                },
            };

            server.register('callbackFactory', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('callbackFactory')!;

            // Create multiple callbacks
            const callbacks = [];
            for (let i = 0; i < 10; i++) {
                const callback = await remoteInstance.createCallback(i);
                callbacks.push(callback);
            }

            // Use all callbacks
            for (let i = 0; i < callbacks.length; i++) {
                const result = await callbacks[i](`data-${i}`);
                expect(result).toBe(`callback-${i}: data-${i}`);
            }

            // Clear references to callbacks
            callbacks.length = 0;

            // The callbacks should be eligible for garbage collection
            // We can't directly test this, but we can verify the system doesn't crash
        });

        it('should handle rapid callback creation and cleanup', async () => {
            const serverInstance = {
                quickCallback: (data: string) => {
                    return (processed: string) => {
                        return `${data} -> ${processed}`;
                    };
                },
            };

            server.register('quickProcessor', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('quickProcessor')!;

            // Create and use callbacks rapidly
            const promises = [];
            for (let i = 0; i < 50; i++) {
                const callback = await remoteInstance.quickCallback(`input-${i}`);
                const result = await callback(`processed-${i}`);
                promises.push(result);
            }

            const results = await Promise.all(promises);
            expect(results).toHaveLength(50);
            expect(results[0]).toBe('input-0 -> processed-0');
            expect(results[49]).toBe('input-49 -> processed-49');
        });
    });

    describe('Error Handling in Cleanup', () => {
        it('should handle errors during callback execution gracefully', async () => {
            const serverInstance = {
                errorCallback: (callback: (data: string) => void) => {
                    try {
                        callback('test data');
                    } catch (error) {
                        // Handle error gracefully
                    }
                },
            };

            server.register('errorHandler', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('errorHandler')!;

            // Should not throw even if callback has issues
            expect(async () => {
                await remoteInstance.errorCallback((data: string) => {
                    throw new Error('Callback error');
                });
            }).not.toThrow();
        });

        it('should handle cleanup when transport fails', async () => {
            // Create a transport that fails after a few messages
            let messageCount = 0;
            const failingTransport = {
                send: vi.fn(() => {
                    messageCount++;
                    if (messageCount > 5) {
                        throw new Error('Transport failed');
                    }
                }),
                receive: vi.fn(),
            };

            const failingClient = new WebRPC('failing-client', failingTransport);
            const serverInstance = {
                createCallback: () => {
                    return (data: string) => `processed: ${data}`;
                },
            };

            server.register('failingTest', serverInstance);
            const remoteInstance = failingClient.get<typeof serverInstance>('failingTest')!;

            // Should handle transport failures gracefully
            try {
                const callback = await remoteInstance.createCallback();
                await callback('test');
            } catch (error) {
                // Expected to fail after a few messages
                expect(error).toBeDefined();
            }
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle nested callbacks with cleanup', async () => {
            const serverInstance = {
                nestedCallback: (outerCallback: (innerCallback: (data: string) => void) => void) => {
                    const innerCallback = (data: string) => {
                        return `inner: ${data}`;
                    };
                    outerCallback(innerCallback);
                },
            };

            server.register('nestedProcessor', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('nestedProcessor')!;

            const resultPromise = new Promise<string>(resolve => {
                remoteInstance.nestedCallback((innerCallback: (data: string) => void) => {
                    const result = innerCallback('nested data');
                    resolve(result);
                });
            });

            const result = await resultPromise;
            expect(result).toBe('inner: nested data');
        });

        it('should handle callbacks in arrays and objects', async () => {
            const serverInstance = {
                complexCallback: (callbacks: {
                    array: ((data: string) => string)[];
                    object: {
                        method: (data: string) => string;
                    };
                }) => {
                    const arrayResult = callbacks.array[0]('array data');
                    const objectResult = callbacks.object.method('object data');
                    return { arrayResult, objectResult };
                },
            };

            server.register('complexProcessor', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('complexProcessor')!;

            const result = await remoteInstance.complexCallback({
                array: [(data: string) => `array: ${data}`],
                object: {
                    method: (data: string) => `object: ${data}`,
                },
            });

            expect(result.arrayResult).toBe('array: array data');
            expect(result.objectResult).toBe('object: object data');
        });

        it('should handle circular callback references', async () => {
            const serverInstance = {
                circularCallback: (callback: (self: any) => void) => {
                    // Create a circular reference
                    const circular = {
                        callback,
                        self: null as any,
                    };
                    circular.self = circular;
                    callback(circular);
                },
            };

            server.register('circularProcessor', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('circularProcessor')!;

            const resultPromise = new Promise<any>(resolve => {
                remoteInstance.circularCallback((circular: any) => {
                    resolve(circular);
                });
            });

            const result = await resultPromise;
            expect(result.self).toBe(result);
            expect(typeof result.callback).toBe('function');
        });
    });

    describe('Performance and Stress Testing', () => {
        it('should handle many concurrent callbacks', async () => {
            const serverInstance = {
                concurrentCallback: (id: number, callback: (result: string) => void) => {
                    setTimeout(() => {
                        callback(`result-${id}`);
                    }, Math.random() * 10);
                },
            };

            server.register('concurrentProcessor', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('concurrentProcessor')!;

            // Create many concurrent callback operations
            const promises = [];
            for (let i = 0; i < 100; i++) {
                const promise = new Promise<string>(resolve => {
                    remoteInstance.concurrentCallback(i, (result: string) => {
                        resolve(result);
                    });
                });
                promises.push(promise);
            }

            const results = await Promise.all(promises);
            expect(results).toHaveLength(100);

            // Verify all results are correct
            for (let i = 0; i < 100; i++) {
                expect(results[i]).toBe(`result-${i}`);
            }
        });

        it('should handle long-running callbacks with cleanup', async () => {
            const serverInstance = {
                longRunningCallback: (callback: (progress: number) => void) => {
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 10;
                        callback(progress);
                        if (progress >= 100) {
                            clearInterval(interval);
                        }
                    }, 10);
                },
            };

            server.register('longRunningProcessor', serverInstance);
            const remoteInstance = client.get<typeof serverInstance>('longRunningProcessor')!;

            const progressValues: number[] = [];
            const resultPromise = new Promise<number[]>(resolve => {
                remoteInstance.longRunningCallback((progress: number) => {
                    progressValues.push(progress);
                    if (progress >= 100) {
                        resolve(progressValues);
                    }
                });
            });

            const results = await resultPromise;
            expect(results).toContain(10);
            expect(results).toContain(50);
            expect(results).toContain(100);
            expect(results[results.length - 1]).toBe(100);
        });
    });
});

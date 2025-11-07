import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebRPCPort } from '../../src/core/WebRPCPort';
import { PostMessageTransport } from '../../src/transports/PostMessageTransport';
import { createInvocationId, createSafeId } from '../../src/protocol/InvocationId';
import type { CleanupCallbackMessage } from '../../src/protocol/Message';

describe('WebRPCPort Cleanup Functionality', () => {
    let mockTransport: {
        send: ReturnType<typeof vi.fn>;
        onMessage: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
    };
    let webRPCPort: WebRPCPort;
    let channel: MessageChannel;

    beforeEach(() => {
        mockTransport = {
            send: vi.fn(),
            onMessage: vi.fn(),
            close: vi.fn(),
        };
        webRPCPort = new WebRPCPort('test-client', 'test-port', {}, mockTransport);
        channel = new MessageChannel();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Cleanup Callback Message Handling', () => {
        it('should handle cleanup-callback messages', () => {
            const callbackId = 'test-callback-123';
            const cleanupMessage: CleanupCallbackMessage = {
                id: createInvocationId(createSafeId('test-client'), createSafeId('test-port'), callbackId),
                _webrpc: {
                    action: 'cleanup-callback',
                    timestamp: Date.now(),
                },
                callbackId,
            };

            // Add a callback to the registry first
            const mockCallback = vi.fn();
            (webRPCPort as any).callbacks.set(createSafeId(callbackId), mockCallback);

            // Verify callback exists before cleanup
            expect((webRPCPort as any).callbacks.has(createSafeId(callbackId))).toBe(true);

            // Handle the cleanup message
            webRPCPort.receive(cleanupMessage);

            // Verify callback was removed
            expect((webRPCPort as any).callbacks.has(createSafeId(callbackId))).toBe(false);
        });

        it('should handle cleanup-callback messages for non-existent callbacks', () => {
            const callbackId = 'non-existent-callback';
            const cleanupMessage: CleanupCallbackMessage = {
                id: createInvocationId(createSafeId('test-client'), createSafeId('test-port'), callbackId),
                _webrpc: {
                    action: 'cleanup-callback',
                    timestamp: Date.now(),
                },
                callbackId,
            };

            // Should not throw when cleaning up non-existent callback
            expect(() => {
                webRPCPort.receive(cleanupMessage);
            }).not.toThrow();

            // Verify callback registry is still empty
            expect((webRPCPort as any).callbacks.has(createSafeId(callbackId))).toBe(false);
        });

        it('should handle multiple cleanup-callback messages', () => {
            const callbackId1 = 'callback-1';
            const callbackId2 = 'callback-2';
            const callbackId3 = 'callback-3';

            // Add multiple callbacks
            (webRPCPort as any).callbacks.set(createSafeId(callbackId1), vi.fn());
            (webRPCPort as any).callbacks.set(createSafeId(callbackId2), vi.fn());
            (webRPCPort as any).callbacks.set(createSafeId(callbackId3), vi.fn());

            // Verify all callbacks exist
            expect((webRPCPort as any).callbacks.has(createSafeId(callbackId1))).toBe(true);
            expect((webRPCPort as any).callbacks.has(createSafeId(callbackId2))).toBe(true);
            expect((webRPCPort as any).callbacks.has(createSafeId(callbackId3))).toBe(true);

            // Clean up first callback
            const cleanupMessage1: CleanupCallbackMessage = {
                id: createInvocationId(createSafeId('test-client'), createSafeId('test-port'), callbackId1),
                _webrpc: {
                    action: 'cleanup-callback',
                    timestamp: Date.now(),
                },
                callbackId: callbackId1,
            };
            webRPCPort.receive(cleanupMessage1);

            // Clean up third callback
            const cleanupMessage3: CleanupCallbackMessage = {
                id: createInvocationId(createSafeId('test-client'), createSafeId('test-port'), callbackId3),
                _webrpc: {
                    action: 'cleanup-callback',
                    timestamp: Date.now(),
                },
                callbackId: callbackId3,
            };
            webRPCPort.receive(cleanupMessage3);

            // Verify only second callback remains
            expect((webRPCPort as any).callbacks.has(createSafeId(callbackId1))).toBe(false);
            expect((webRPCPort as any).callbacks.has(createSafeId(callbackId2))).toBe(true);
            expect((webRPCPort as any).callbacks.has(createSafeId(callbackId3))).toBe(false);
        });
    });

    describe('Remote Callback Cleanup', () => {
        it('should send cleanup-callback message when remote callback is cleaned up', () => {
            const callbackId = 'remote-callback-456';

            // Call the private cleanupRemoteCallback method
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

        it('should send cleanup-callback message with correct timestamp', () => {
            const callbackId = 'remote-callback-timestamp';
            const beforeTime = Date.now();

            (webRPCPort as any).cleanupRemoteCallback(callbackId);

            const afterTime = Date.now();
            const sentMessage = mockTransport.send.mock.calls[0][0];

            expect(sentMessage._webrpc.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(sentMessage._webrpc.timestamp).toBeLessThanOrEqual(afterTime);
        });

        it('should handle multiple remote callback cleanups', () => {
            const callbackIds = ['remote-1', 'remote-2', 'remote-3'];

            callbackIds.forEach(id => {
                (webRPCPort as any).cleanupRemoteCallback(id);
            });

            expect(mockTransport.send).toHaveBeenCalledTimes(3);
            callbackIds.forEach((id, index) => {
                const sentMessage = mockTransport.send.mock.calls[index][0];
                expect(sentMessage.id).toBe(id);
                expect(sentMessage._webrpc.action).toBe('cleanup-callback');
            });
        });
    });

    describe('Integration with Method Calls', () => {
        it('should register cleanup callback when deserializing method call parameters', () => {
            const methodCallMessage = {
                id: createInvocationId(createSafeId('test-client'), createSafeId('test-port'), 'test-action'),
                _webrpc: {
                    action: 'method-call' as const,
                    timestamp: Date.now(),
                },
                method: 'testMethod',
                params: [
                    {
                        flag: '$$WEB-RPC-CALLBACK',
                        contextId: 'test-context',
                        id: 'callback-from-params',
                    },
                ],
            };

            // Mock the method on the local instance
            const mockMethod = vi.fn();
            (webRPCPort as any).localInstance = {
                testMethod: mockMethod,
            };

            // Handle the method call
            webRPCPort.receive(methodCallMessage);

            // Verify the method was called with deserialized parameters
            expect(mockMethod).toHaveBeenCalled();
            const callArgs = mockMethod.mock.calls[0][0];
            expect(Array.isArray(callArgs)).toBe(true);
            expect(typeof callArgs[0]).toBe('function');
        });

        it('should register cleanup callback when deserializing method return values', async () => {
            const returnMessage = {
                id: createInvocationId(createSafeId('test-client'), createSafeId('test-port'), 'test-action'),
                _webrpc: {
                    action: 'method-return' as const,
                    timestamp: Date.now(),
                },
                result: {
                    flag: '$$WEB-RPC-CALLBACK',
                    contextId: 'test-context',
                    id: 'callback-from-result',
                },
            };

            // Mock a pending invocation
            const mockDefer = {
                promise: Promise.resolve(),
                resolve: vi.fn(),
                reject: vi.fn(),
            };
            (webRPCPort as any).pendingInvocations.set('test-action', mockDefer);

            // Handle the return message
            webRPCPort.receive(returnMessage);

            // Wait for the promise to resolve
            await mockDefer.promise;

            // Verify the result was deserialized
            expect(mockDefer.resolve).toHaveBeenCalled();
            const resolvedValue = mockDefer.resolve.mock.calls[0][0];
            expect(typeof resolvedValue).toBe('function');
        });
    });

    describe('Error Handling', () => {
        it('should handle cleanup-callback messages with invalid structure', () => {
            const invalidMessage = {
                id: 'invalid-callback',
                _webrpc: {
                    action: 'cleanup-callback',
                    timestamp: Date.now(),
                },
                // Missing callbackId field
            };

            // Should not throw when handling invalid cleanup message
            expect(() => {
                webRPCPort.receive(invalidMessage as any);
            }).not.toThrow();
        });

        it('should handle cleanup-callback messages with wrong action', () => {
            const wrongActionMessage = {
                id: 'wrong-action-callback',
                _webrpc: {
                    action: 'method-call', // Wrong action
                    timestamp: Date.now(),
                },
                callbackId: 'wrong-action-callback',
            };

            // Should not process as cleanup message
            expect(() => {
                webRPCPort.receive(wrongActionMessage as any);
            }).not.toThrow();
        });

        it('should handle transport errors during cleanup message sending', () => {
            const errorTransport = {
                send: vi.fn(() => {
                    throw new Error('Transport error');
                }),
                onMessage: vi.fn(),
                close: vi.fn(),
            };

            const errorWebRPCPort = new WebRPCPort('test-client', 'test-port', {}, errorTransport);
            const callbackId = 'error-callback';

            // Should not throw when transport fails
            expect(() => {
                (errorWebRPCPort as any).cleanupRemoteCallback(callbackId);
            }).toThrow('Transport error');
        });
    });

    describe('Memory Management', () => {
        it('should prevent memory leaks by cleaning up callbacks', () => {
            const callbackIds = ['leak-test-1', 'leak-test-2', 'leak-test-3'];

            // Add callbacks
            callbackIds.forEach(id => {
                (webRPCPort as any).callbacks.set(id, vi.fn());
            });

            // Verify all callbacks exist
            callbackIds.forEach(id => {
                expect((webRPCPort as any).callbacks.has(id)).toBe(true);
            });

            // Clean up all callbacks
            callbackIds.forEach(id => {
                const cleanupMessage: CleanupCallbackMessage = {
                    id: createInvocationId(createSafeId('test-client'), createSafeId('test-port'), id),
                    _webrpc: {
                        action: 'cleanup-callback',
                        timestamp: Date.now(),
                    },
                    callbackId: id,
                };
                webRPCPort.receive(cleanupMessage);
            });

            // Verify all callbacks were removed
            callbackIds.forEach(id => {
                expect((webRPCPort as any).callbacks.has(id)).toBe(false);
            });

            // Verify callback registry is empty
            expect((webRPCPort as any).callbacks.size).toBe(0);
        });

        it('should handle cleanup of callbacks that are still in use', () => {
            const callbackId = 'in-use-callback';
            const mockCallback = vi.fn();

            // Add callback
            (webRPCPort as any).callbacks.set(createSafeId(callbackId), mockCallback);

            // Clean up the callback
            const cleanupMessage: CleanupCallbackMessage = {
                id: createInvocationId(createSafeId('test-client'), createSafeId('test-port'), callbackId),
                _webrpc: {
                    action: 'cleanup-callback',
                    timestamp: Date.now(),
                },
                callbackId,
            };
            webRPCPort.receive(cleanupMessage);

            // Verify callback was removed even if it might still be referenced elsewhere
            expect((webRPCPort as any).callbacks.has(callbackId)).toBe(false);
        });
    });
});

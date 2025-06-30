import { vi } from 'vitest';
import { WebRPC } from '../../src/core/WebRPC';
import { MessageChannelTransport } from '../../src/transports/MessagePortTransport';
import { SendFunctionTransport } from '../../src/core/SendFunctionTransport';

describe('Error Handling and Edge Cases', () => {
    describe('WebRPC', () => {
        it('should handle invalid messages gracefully', () => {
            const channel = new MessageChannel();
            const transport = new MessageChannelTransport({ port: channel.port1 });
            const webRPC = new WebRPC('test-client', transport);

            // Should not throw when receiving invalid data
            expect(() => webRPC.receive(null)).not.toThrow();
            expect(() => webRPC.receive(undefined)).not.toThrow();
            expect(() => webRPC.receive('invalid')).not.toThrow();
            expect(() => webRPC.receive(123)).not.toThrow();
            expect(() => webRPC.receive({ invalid: 'object' })).not.toThrow();
        });

        it('should handle messages for different client IDs', () => {
            const channel = new MessageChannel();
            const transport = new MessageChannelTransport({ port: channel.port1 });
            const webRPC = new WebRPC('test-client', transport);

            const invalidMessage = {
                type: 'method-call',
                invocationId: {
                    clientId: 'different-client',
                    portId: 'test-port',
                    callId: 'test-call',
                },
                method: 'test',
                args: [],
            };

            // Should ignore messages for different clients
            expect(() => webRPC.receive(invalidMessage)).not.toThrow();
        });

        it('should handle function transport constructor', () => {
            const mockSendFunction = vi.fn();
            const webRPC = new WebRPC('test-client', mockSendFunction);

            expect(webRPC).toBeInstanceOf(WebRPC);
        });

        it('should handle closing', () => {
            const channel = new MessageChannel();
            const transport = new MessageChannelTransport({ port: channel.port1 });
            const webRPC = new WebRPC('test-client', transport);

            expect(() => webRPC.close()).not.toThrow();
        });
    });

    describe('SendFunctionTransport', () => {
        it('should call the provided send function', () => {
            const mockSend = vi.fn();
            const transport = new SendFunctionTransport(mockSend);

            const testData = { test: 'data' };
            const transferables = [new ArrayBuffer(8)];

            transport.send(testData, transferables);

            expect(mockSend).toHaveBeenCalledWith(testData, transferables);
        });

        it('should return no-op cleanup function from onMessage', () => {
            const mockSend = vi.fn();
            const transport = new SendFunctionTransport(mockSend);

            const cleanup = transport.onMessage(() => {});

            expect(typeof cleanup).toBe('function');
            expect(() => cleanup()).not.toThrow();
        });

        it('should have no-op close method', () => {
            const mockSend = vi.fn();
            const transport = new SendFunctionTransport(mockSend);

            expect(() => transport.close()).not.toThrow();
        });
    });

    describe('MessageChannelTransport edge cases', () => {
        it('should handle transferable objects without throwing', () => {
            const channel = new MessageChannel();
            const transport = new MessageChannelTransport({ port: channel.port1 });

            const testData = { test: 'data' };
            const buffer = new ArrayBuffer(8);

            expect(() => transport.send(testData, [buffer])).not.toThrow();
        });

        it('should handle multiple cleanup calls', () => {
            const channel = new MessageChannel();
            const transport = new MessageChannelTransport({ port: channel.port1 });

            const cleanup = transport.onMessage(() => {});

            // Multiple cleanup calls should not throw
            expect(() => cleanup()).not.toThrow();
            expect(() => cleanup()).not.toThrow();
            expect(() => transport.close()).not.toThrow();
        });

        it('should handle close after cleanup', () => {
            const channel = new MessageChannel();
            const transport = new MessageChannelTransport({ port: channel.port1 });

            const cleanup = transport.onMessage(() => {});
            cleanup();

            // Close after cleanup should not throw
            expect(() => transport.close()).not.toThrow();
        });
    });
});

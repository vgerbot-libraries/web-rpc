import { vi } from 'vitest';
import { WebRPC } from '../../src';
import { MessageChannelTransport } from '../../src/transports';

describe('WebRPC', () => {
    it('should handle basic method calls', async () => {
        const channel = new MessageChannel();
        const serverTransport = new MessageChannelTransport({ port: channel.port1 });
        const clientTransport = new MessageChannelTransport({ port: channel.port2 });

        const server = new WebRPC('test', serverTransport);
        const instance = {
            sum: (args: number[]) => args.reduce((acc, it) => acc + it, 0),
        };
        server.register('sum', instance);
        const client = new WebRPC('test', clientTransport);
        const remoteInstance = client.get<typeof instance>('sum')!;
        expect(await remoteInstance.sum([1, 2, 3])).toBe(6);
    });

    it('should handle ArrayBuffer data transfer', async () => {
        const channel = new MessageChannel();
        const serverTransport = new MessageChannelTransport({ port: channel.port1 });
        const clientTransport = new MessageChannelTransport({ port: channel.port2 });

        const server = new WebRPC('test', serverTransport);
        const instance = {
            getByteLength: (buffer: ArrayBuffer) => {
                return buffer.byteLength;
            },
        };
        server.register('arrayBufferTester', instance);
        const client = new WebRPC('test', clientTransport);
        const remoteInstance = client.get<typeof instance>('arrayBufferTester')!;

        const buffer = new ArrayBuffer(8);
        expect(await remoteInstance.getByteLength(buffer)).toBe(8);
    });

    it('should handle callback functions', async () => {
        const channel = new MessageChannel();
        const serverTransport = new MessageChannelTransport({ port: channel.port1 });
        const clientTransport = new MessageChannelTransport({ port: channel.port2 });

        const server = new WebRPC('test', serverTransport);
        const instance = {
            executeCallback: (callback: (data: string) => void) => {
                setTimeout(() => {
                    callback('hello from server');
                }, 10);
            },
        };
        server.register('callbackTester', instance);

        const client = new WebRPC('test', clientTransport);
        const remoteInstance = client.get<typeof instance>('callbackTester')!;

        const callbackPromise = new Promise<string>(resolve => {
            remoteInstance.executeCallback((data: string) => {
                resolve(data);
            });
        });

        expect(await callbackPromise).toBe('hello from server');
    });

    it('should handle getter properties', async () => {
        const channel = new MessageChannel();
        const serverTransport = new MessageChannelTransport({ port: channel.port1 });
        const clientTransport = new MessageChannelTransport({ port: channel.port2 });

        const server = new WebRPC('test', serverTransport);
        const instance = {
            execute: () => {
                return {
                    get value() {
                        return 'secret';
                    },
                };
            },
        };
        server.register('getterTester', instance);

        const client = new WebRPC('test', clientTransport);
        const remoteInstance = client.get<typeof instance>('getterTester')!;

        expect(await (await remoteInstance.execute()).value).toBe('secret');
    });

    it('should handle function transport', () => {
        const mockSend = vi.fn();
        const webRPC = new WebRPC('test-client', mockSend);
        expect(webRPC).toBeInstanceOf(WebRPC);
    });

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

    it('should handle method calls with promises', async () => {
        const channel = new MessageChannel();
        const serverTransport = new MessageChannelTransport({ port: channel.port1 });
        const clientTransport = new MessageChannelTransport({ port: channel.port2 });

        const server = new WebRPC('test', serverTransport);
        const instance = {
            asyncMethod: async (value: string) => {
                await new Promise(resolve => setTimeout(resolve, 1));
                return `processed: ${value}`;
            },
        };
        server.register('asyncTester', instance);
        const client = new WebRPC('test', clientTransport);
        const remoteInstance = client.get<typeof instance>('asyncTester')!;

        const result = await remoteInstance.asyncMethod('test');
        expect(result).toBe('processed: test');
    });

    it('should handle method call errors', async () => {
        const channel = new MessageChannel();
        const serverTransport = new MessageChannelTransport({ port: channel.port1 });
        const clientTransport = new MessageChannelTransport({ port: channel.port2 });

        const server = new WebRPC('test', serverTransport);
        const instance = {
            throwError: () => {
                throw new Error('Test error');
            },
        };
        server.register('errorTester', instance);
        const client = new WebRPC('test', clientTransport);
        const remoteInstance = client.get<typeof instance>('errorTester')!;

        await expect(remoteInstance.throwError()).rejects.toThrow('Test error');
    });
});

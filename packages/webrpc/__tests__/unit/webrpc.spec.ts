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
});

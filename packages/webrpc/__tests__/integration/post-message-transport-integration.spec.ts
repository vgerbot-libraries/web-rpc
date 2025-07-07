import { PostMessageTransport } from '../../src/transports/PostMessageTransport';
import { testDataFixtures } from '../fixtures/data';

describe('PostMessageTransport Integration Tests', () => {
    describe('MessagePort Communication', () => {
        it('should support bidirectional communication with MessagePort', async () => {
            const channel = new MessageChannel();
            const transport1 = new PostMessageTransport(channel.port1);
            const transport2 = new PostMessageTransport(channel.port2);

            const messages1: unknown[] = [];
            const messages2: unknown[] = [];

            const cleanup1 = transport1.onMessage(data => messages1.push(data));
            const cleanup2 = transport2.onMessage(data => messages2.push(data));

            // Send messages in both directions
            transport1.send('Hello from transport1');
            transport2.send('Hello from transport2');

            // Wait for message delivery
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(messages1).toContain('Hello from transport2');
            expect(messages2).toContain('Hello from transport1');

            cleanup1();
            cleanup2();
            transport1.close();
            transport2.close();
        });

        it('should handle complex data structures with MessagePort', async () => {
            const channel = new MessageChannel();
            const sender = new PostMessageTransport(channel.port1);
            const receiver = new PostMessageTransport(channel.port2);

            const complexData = testDataFixtures.complexData.deeplyNested;
            let receivedData: unknown;

            const cleanup = receiver.onMessage(data => {
                receivedData = data;
            });

            sender.send(complexData);

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(receivedData).toEqual(complexData);

            cleanup();
            sender.close();
            receiver.close();
        });

        it('should handle transferable objects with MessagePort', async () => {
            const channel = new MessageChannel();
            const sender = new PostMessageTransport(channel.port1);
            const receiver = new PostMessageTransport(channel.port2);

            const buffer = new ArrayBuffer(1024);
            const view = new Uint8Array(buffer);
            view[0] = 42;
            view[1] = 84;

            let receivedData: unknown;

            const cleanup = receiver.onMessage(data => {
                receivedData = data;
            });

            sender.send({ message: 'with transferable', buffer }, [buffer]);

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(receivedData).toEqual({ message: 'with transferable', buffer });
            expect(buffer.byteLength).toBe(0); // Should be transferred

            cleanup();
            sender.close();
            receiver.close();
        });

        it('should handle rapid message sequences with MessagePort', async () => {
            const channel = new MessageChannel();
            const sender = new PostMessageTransport(channel.port1);
            const receiver = new PostMessageTransport(channel.port2);

            const messages: unknown[] = [];
            const cleanup = receiver.onMessage(data => {
                messages.push(data);
            });

            // Send 100 messages rapidly
            const expectedMessages = Array.from({ length: 100 }, (_, i) => `message-${i}`);
            expectedMessages.forEach(msg => sender.send(msg));

            // Wait for all messages to be delivered
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(messages).toHaveLength(100);
            expectedMessages.forEach(msg => {
                expect(messages).toContain(msg);
            });

            cleanup();
            sender.close();
            receiver.close();
        });
    });

    describe('BroadcastChannel Communication', () => {
        it('should support bidirectional communication with BroadcastChannel', async () => {
            const channelName = 'test-post-channel-1';
            const channel1 = new BroadcastChannel(channelName);
            const channel2 = new BroadcastChannel(channelName);
            const transport1 = new PostMessageTransport(channel1);
            const transport2 = new PostMessageTransport(channel2);

            const messages1: unknown[] = [];
            const messages2: unknown[] = [];

            const cleanup1 = transport1.onMessage(data => messages1.push(data));
            const cleanup2 = transport2.onMessage(data => messages2.push(data));

            // Send messages in both directions
            transport1.send('Hello from transport1');
            transport2.send('Hello from transport2');

            // Wait for message delivery
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(messages1).toContain('Hello from transport2');
            expect(messages2).toContain('Hello from transport1');

            cleanup1();
            cleanup2();
            transport1.close();
            transport2.close();
            channel1.close();
            channel2.close();
        });

        it('should handle complex data with BroadcastChannel', async () => {
            const channelName = 'test-post-channel-2';
            const senderChannel = new BroadcastChannel(channelName);
            const receiverChannel = new BroadcastChannel(channelName);
            const sender = new PostMessageTransport(senderChannel);
            const receiver = new PostMessageTransport(receiverChannel);

            const complexData = testDataFixtures.complexData.deeplyNested;
            let receivedData: unknown;

            const cleanup = receiver.onMessage(data => {
                receivedData = data;
            });

            sender.send(complexData);

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(receivedData).toEqual(complexData);

            cleanup();
            sender.close();
            receiver.close();
            senderChannel.close();
            receiverChannel.close();
        });

        it('should not support transferable objects with BroadcastChannel', async () => {
            const channelName = 'test-post-channel-3';
            const senderChannel = new BroadcastChannel(channelName);
            const receiverChannel = new BroadcastChannel(channelName);
            const sender = new PostMessageTransport(senderChannel);
            const receiver = new PostMessageTransport(receiverChannel);

            const buffer = new ArrayBuffer(1024);
            const view = new Uint8Array(buffer);
            view[0] = 42;
            view[1] = 84;

            let receivedData: unknown;

            const cleanup = receiver.onMessage(data => {
                receivedData = data;
            });

            // BroadcastChannel doesn't support transferable objects
            sender.send({ message: 'with transferable', buffer });

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(receivedData).toEqual({ message: 'with transferable', buffer });
            expect(buffer.byteLength).toBe(1024); // Should not be transferred

            cleanup();
            sender.close();
            receiver.close();
            senderChannel.close();
            receiverChannel.close();
        });

        it('should handle multiple receivers with BroadcastChannel', async () => {
            const channelName = 'test-post-channel-4';
            const senderChannel = new BroadcastChannel(channelName);
            const receiverChannel1 = new BroadcastChannel(channelName);
            const receiverChannel2 = new BroadcastChannel(channelName);
            const receiverChannel3 = new BroadcastChannel(channelName);

            const sender = new PostMessageTransport(senderChannel);
            const receiver1 = new PostMessageTransport(receiverChannel1);
            const receiver2 = new PostMessageTransport(receiverChannel2);
            const receiver3 = new PostMessageTransport(receiverChannel3);

            const messages1: unknown[] = [];
            const messages2: unknown[] = [];
            const messages3: unknown[] = [];

            const cleanup1 = receiver1.onMessage(data => messages1.push(data));
            const cleanup2 = receiver2.onMessage(data => messages2.push(data));
            const cleanup3 = receiver3.onMessage(data => messages3.push(data));

            sender.send('broadcast message');

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(messages1).toContain('broadcast message');
            expect(messages2).toContain('broadcast message');
            expect(messages3).toContain('broadcast message');

            cleanup1();
            cleanup2();
            cleanup3();
            sender.close();
            receiver1.close();
            receiver2.close();
            receiver3.close();
            senderChannel.close();
            receiverChannel1.close();
            receiverChannel2.close();
            receiverChannel3.close();
        });
    });

    describe('Worker Communication', () => {
        it('should support communication with Worker', async () => {
            const workerScript = `
                self.onmessage = function(e) {
                    self.postMessage('Echo: ' + e.data);
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            const transport = new PostMessageTransport(worker);

            const messages: unknown[] = [];
            const cleanup = transport.onMessage(data => {
                messages.push(data);
            });

            transport.send('Hello Worker');

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(messages).toContain('Echo: Hello Worker');

            cleanup();
            transport.close();
            worker.terminate();
        });

        it('should handle complex data structures with Worker', async () => {
            const workerScript = `
                self.onmessage = function(e) {
                    self.postMessage(e.data);
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            const transport = new PostMessageTransport(worker);

            const complexData = testDataFixtures.complexData.deeplyNested;
            let receivedData: unknown;

            const cleanup = transport.onMessage(data => {
                receivedData = data;
            });

            transport.send(complexData);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(receivedData).toEqual(complexData);

            cleanup();
            transport.close();
            worker.terminate();
        });

        it('should handle transferable objects with Worker', async () => {
            const workerScript = `
                self.onmessage = function(e) {
                    self.postMessage(e.data);
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            const transport = new PostMessageTransport(worker);

            const buffer = new ArrayBuffer(1024);
            const view = new Uint8Array(buffer);
            view[0] = 42;
            view[1] = 84;

            let receivedData: unknown;

            const cleanup = transport.onMessage(data => {
                receivedData = data;
            });

            transport.send({ message: 'with transferable', buffer }, [buffer]);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(receivedData).toBeDefined();
            expect(buffer.byteLength).toBe(0);

            cleanup();
            transport.close();
            worker.terminate();
        });

        it('should properly clean up worker resources on close', async () => {
            const workerScript = `
                self.onmessage = function(e) {
                    self.postMessage('Echo: ' + e.data);
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            const transport = new PostMessageTransport(worker);

            const messages: unknown[] = [];
            const cleanup = transport.onMessage(data => {
                messages.push(data);
            });

            transport.send('before close');

            await new Promise(resolve => setTimeout(resolve, 50));

            transport.close();

            transport.send('after close');

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(messages).toContain('Echo: before close');
            expect(messages).not.toContain('Echo: after close');

            cleanup();
            worker.terminate();
        });

        it('should handle cleanup function calls after worker transport close', () => {
            const workerScript = `
                self.onmessage = function(e) {
                    self.postMessage(e.data);
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            const transport = new PostMessageTransport(worker);

            const cleanup = transport.onMessage(() => {});

            transport.close();

            expect(() => cleanup()).not.toThrow();
            expect(() => cleanup()).not.toThrow();

            worker.terminate();
        });
    });

    describe('Invalid Target Handling', () => {
        it('should throw error for invalid post message target', () => {
            expect(() => {
                new PostMessageTransport({} as MessagePort);
            }).toThrow('Invalid post message target');

            expect(() => {
                new PostMessageTransport(null as unknown as MessagePort);
            }).toThrow('Invalid post message target');

            expect(() => {
                new PostMessageTransport('invalid' as unknown as MessagePort);
            }).toThrow('Invalid post message target');
        });
    });

    describe('Resource Management', () => {
        it('should properly clean up MessagePort resources on close', async () => {
            const channel = new MessageChannel();
            const transport1 = new PostMessageTransport(channel.port1);
            const transport2 = new PostMessageTransport(channel.port2);

            const messages: unknown[] = [];
            const cleanup = transport2.onMessage(data => {
                messages.push(data);
            });

            transport1.send('before close');

            await new Promise(resolve => setTimeout(resolve, 20));

            // Close transport2
            transport2.close();

            // This message should not be received
            transport1.send('after close');

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(messages).toContain('before close');
            expect(messages).not.toContain('after close');

            cleanup();
            transport1.close();
        });

        it('should properly clean up BroadcastChannel resources on close', async () => {
            const channelName = 'test-cleanup-broadcast';
            const senderChannel = new BroadcastChannel(channelName);
            const receiverChannel = new BroadcastChannel(channelName);
            const transport1 = new PostMessageTransport(senderChannel);
            const transport2 = new PostMessageTransport(receiverChannel);

            const messages: unknown[] = [];
            const cleanup = transport2.onMessage(data => {
                messages.push(data);
            });

            transport1.send('before close');

            await new Promise(resolve => setTimeout(resolve, 20));

            // Close transport2
            transport2.close();

            // This message should not be received
            transport1.send('after close');

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(messages).toContain('before close');
            expect(messages).not.toContain('after close');

            cleanup();
            transport1.close();
            senderChannel.close();
            receiverChannel.close();
        });

        it('should handle cleanup function calls after transport close', () => {
            const channel = new MessageChannel();
            const transport = new PostMessageTransport(channel.port1);

            const cleanup = transport.onMessage(() => {});

            transport.close();

            // These should not throw
            expect(() => cleanup()).not.toThrow();
            expect(() => cleanup()).not.toThrow();
        });
    });

    describe('Performance', () => {
        it('should handle large messages efficiently with MessagePort', async () => {
            const channel = new MessageChannel();
            const sender = new PostMessageTransport(channel.port1);
            const receiver = new PostMessageTransport(channel.port2);

            // Create a large message (1MB of data)
            const largeData = 'x'.repeat(1024 * 1024);
            let receivedData: unknown;

            const cleanup = receiver.onMessage(data => {
                receivedData = data;
            });

            const startTime = performance.now();
            sender.send(largeData);

            // Wait for message delivery
            await new Promise(resolve => setTimeout(resolve, 100));

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(receivedData).toBe(largeData);
            expect(duration).toBeLessThan(1000); // Should complete within 1 second

            cleanup();
            sender.close();
            receiver.close();
        });

        it('should handle high message throughput with MessagePort', async () => {
            const channel = new MessageChannel();
            const sender = new PostMessageTransport(channel.port1);
            const receiver = new PostMessageTransport(channel.port2);

            const messages: unknown[] = [];
            const cleanup = receiver.onMessage(data => {
                messages.push(data);
            });

            const messageCount = 1000;
            const startTime = performance.now();

            // Send many messages
            for (let i = 0; i < messageCount; i++) {
                sender.send(`message-${i}`);
            }

            // Wait for all messages
            while (messages.length < messageCount) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }

            const endTime = performance.now();
            const duration = endTime - startTime;
            const messagesPerSecond = messageCount / (duration / 1000);

            expect(messages).toHaveLength(messageCount);
            expect(messagesPerSecond).toBeGreaterThan(100); // Should handle at least 100 msg/sec

            cleanup();
            sender.close();
            receiver.close();
        });
    });
});

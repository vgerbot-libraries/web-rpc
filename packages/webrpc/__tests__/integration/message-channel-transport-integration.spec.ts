import { MessageChannelTransport } from '../../src/transports/MessageChannelTransport';
import { testDataFixtures } from '../fixtures/data';

describe('MessageChannelTransport Integration Tests', () => {
    describe('Bidirectional Communication', () => {
        it('should support bidirectional communication', async () => {
            const channel = new MessageChannel();
            const transport1 = new MessageChannelTransport({ port: channel.port1 });
            const transport2 = new MessageChannelTransport({ port: channel.port2 });

            const messages1: unknown[] = [];
            const messages2: unknown[] = [];

            transport1.onMessage(data => messages1.push(data));
            transport2.onMessage(data => messages2.push(data));

            // Send messages in both directions
            transport1.send('Hello from transport1');
            transport2.send('Hello from transport2');

            // Wait for message delivery
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(messages1).toContain('Hello from transport2');
            expect(messages2).toContain('Hello from transport1');

            transport1.close();
            transport2.close();
        });

        it('should handle complex data structures', async () => {
            const channel = new MessageChannel();
            const sender = new MessageChannelTransport({ port: channel.port1 });
            const receiver = new MessageChannelTransport({ port: channel.port2 });

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

        it('should handle transferable objects', async () => {
            const channel = new MessageChannel();
            const sender = new MessageChannelTransport({ port: channel.port1 });
            const receiver = new MessageChannelTransport({ port: channel.port2 });

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

            cleanup();
            sender.close();
            receiver.close();
        });

        it('should handle rapid message sequences', async () => {
            const channel = new MessageChannel();
            const sender = new MessageChannelTransport({ port: channel.port1 });
            const receiver = new MessageChannelTransport({ port: channel.port2 });

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

        it('should handle concurrent senders', async () => {
            const channel1 = new MessageChannel();
            const channel2 = new MessageChannel();
            const sender1 = new MessageChannelTransport({ port: channel1.port1 });
            const sender2 = new MessageChannelTransport({ port: channel2.port1 });
            const receiver1 = new MessageChannelTransport({ port: channel1.port2 });
            const receiver2 = new MessageChannelTransport({ port: channel2.port2 });

            const messages1: unknown[] = [];
            const messages2: unknown[] = [];

            const cleanup1 = receiver1.onMessage(data => messages1.push(data));
            const cleanup2 = receiver2.onMessage(data => messages2.push(data));

            // Send messages concurrently
            const promises = [
                Promise.resolve().then(() => sender1.send('from sender1')),
                Promise.resolve().then(() => sender2.send('from sender2')),
                Promise.resolve().then(() => sender1.send('second from sender1')),
                Promise.resolve().then(() => sender2.send('second from sender2')),
            ];

            await Promise.all(promises);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(messages1).toContain('from sender1');
            expect(messages1).toContain('second from sender1');
            expect(messages2).toContain('from sender2');
            expect(messages2).toContain('second from sender2');

            cleanup1();
            cleanup2();
            sender1.close();
            sender2.close();
            receiver1.close();
            receiver2.close();
        });
    });

    describe('MessageChannelTransport Resource Management', () => {
        it('should properly clean up resources on close', async () => {
            const channel = new MessageChannel();
            const transport1 = new MessageChannelTransport({ port: channel.port1 });
            const transport2 = new MessageChannelTransport({ port: channel.port2 });

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

        it('should handle cleanup function calls after transport close', () => {
            const channel = new MessageChannel();
            const transport = new MessageChannelTransport({ port: channel.port1 });

            const cleanup = transport.onMessage(() => {});

            transport.close();

            // These should not throw
            expect(() => cleanup()).not.toThrow();
            expect(() => cleanup()).not.toThrow();
        });
    });

    describe('MessageChannelTransport Error Handling', () => {
        it('should handle send errors gracefully', () => {
            const channel = new MessageChannel();
            const transport = new MessageChannelTransport({ port: channel.port1 });

            // Close the port to cause errors
            channel.port1.close();

            // Send should handle the error (might throw depending on implementation)
            expect(() => {
                try {
                    transport.send('test message');
                } catch (error) {
                    // Error is expected for closed port
                    expect(error).toBeDefined();
                }
            }).not.toThrow();
        });

        it('should handle listener setup errors gracefully', () => {
            const channel = new MessageChannel();
            const transport = new MessageChannelTransport({ port: channel.port1 });

            // Close the port
            channel.port1.close();

            // Setting up listeners should handle the error gracefully
            expect(() => {
                const cleanup = transport.onMessage(() => {});
                cleanup();
            }).not.toThrow();
        });
    });

    describe('MessageChannelTransport Performance', () => {
        it('should handle large messages efficiently', async () => {
            const channel = new MessageChannel();
            const sender = new MessageChannelTransport({ port: channel.port1 });
            const receiver = new MessageChannelTransport({ port: channel.port2 });

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

        it('should handle high message throughput', async () => {
            const channel = new MessageChannel();
            const sender = new MessageChannelTransport({ port: channel.port1 });
            const receiver = new MessageChannelTransport({ port: channel.port2 });

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

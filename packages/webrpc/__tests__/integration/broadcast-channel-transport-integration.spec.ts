import { vi } from 'vitest';
import { BroadcastChannelTransport } from '../../src/transports/BroadcastChannelTransport';
import { testDataFixtures } from '../fixtures/data';

describe('BroadcastChannelTransport Integration Tests', () => {
    describe('Same Channel Communication', () => {
        it('should support bidirectional communication on same channel', async () => {
            const channelName = 'test-channel-1';
            const transport1 = new BroadcastChannelTransport({ channel: channelName });
            const transport2 = new BroadcastChannelTransport({ channel: channelName });

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

        it('should handle complex data structures', async () => {
            const channelName = 'test-channel-2';
            const sender = new BroadcastChannelTransport({ channel: channelName });
            const receiver = new BroadcastChannelTransport({ channel: channelName });

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

        it('should not support transferable objects (logs warning)', async () => {
            const channelName = 'test-channel-3';
            const sender = new BroadcastChannelTransport({ channel: channelName });
            const receiver = new BroadcastChannelTransport({ channel: channelName });

            const buffer = new ArrayBuffer(1024);
            const view = new Uint8Array(buffer);
            view[0] = 42;
            view[1] = 84;

            let receivedData: unknown;
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const cleanup = receiver.onMessage(data => {
                receivedData = data;
            });

            sender.send({ message: 'with transferable', buffer }, [buffer]);

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(receivedData).toEqual({ message: 'with transferable', buffer });
            expect(consoleSpy).toHaveBeenCalledWith('BroadcastChannelTransport does not support transferable objects.');

            cleanup();
            sender.close();
            receiver.close();
            consoleSpy.mockRestore();
        });

        it('should handle rapid message sequences', async () => {
            const channelName = 'test-channel-4';
            const sender = new BroadcastChannelTransport({ channel: channelName });
            const receiver = new BroadcastChannelTransport({ channel: channelName });

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

        it('should handle multiple receivers on same channel', async () => {
            const channelName = 'test-channel-5';
            const sender = new BroadcastChannelTransport({ channel: channelName });
            const receiver1 = new BroadcastChannelTransport({ channel: channelName });
            const receiver2 = new BroadcastChannelTransport({ channel: channelName });
            const receiver3 = new BroadcastChannelTransport({ channel: channelName });

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
        });
    });

    describe('Different Channel Isolation', () => {
        it('should not receive messages from different channels', async () => {
            const transport1 = new BroadcastChannelTransport({ channel: 'channel-a' });
            const transport2 = new BroadcastChannelTransport({ channel: 'channel-b' });

            const messages1: unknown[] = [];
            const messages2: unknown[] = [];

            const cleanup1 = transport1.onMessage(data => messages1.push(data));
            const cleanup2 = transport2.onMessage(data => messages2.push(data));

            // Send messages on different channels
            transport1.send('message on channel A');
            transport2.send('message on channel B');

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(messages1).not.toContain('message on channel B');
            expect(messages2).not.toContain('message on channel A');
            expect(messages1).toHaveLength(0);
            expect(messages2).toHaveLength(0);

            cleanup1();
            cleanup2();
            transport1.close();
            transport2.close();
        });
    });

    describe('BroadcastChannelTransport Resource Management', () => {
        it('should properly clean up resources on close', async () => {
            const channelName = 'test-channel-cleanup';
            const transport1 = new BroadcastChannelTransport({ channel: channelName });
            const transport2 = new BroadcastChannelTransport({ channel: channelName });

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
            const transport = new BroadcastChannelTransport({ channel: 'test-cleanup' });

            const cleanup = transport.onMessage(() => {});

            transport.close();

            // These should not throw
            expect(() => cleanup()).not.toThrow();
            expect(() => cleanup()).not.toThrow();
        });

        it('should accept both string and BroadcastChannel instance', () => {
            const channelName = 'test-channel-types';

            // Test with string
            const transport1 = new BroadcastChannelTransport({ channel: channelName });
            expect(transport1).toBeDefined();

            // Test with BroadcastChannel instance
            const channel = new BroadcastChannel(channelName);
            const transport2 = new BroadcastChannelTransport({ channel });
            expect(transport2).toBeDefined();

            transport1.close();
            transport2.close();
            channel.close();
        });
    });

    describe('BroadcastChannelTransport Performance', () => {
        it('should handle large messages efficiently', async () => {
            const channelName = 'test-channel-perf';
            const sender = new BroadcastChannelTransport({ channel: channelName });
            const receiver = new BroadcastChannelTransport({ channel: channelName });

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
            const channelName = 'test-channel-throughput';
            const sender = new BroadcastChannelTransport({ channel: channelName });
            const receiver = new BroadcastChannelTransport({ channel: channelName });

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

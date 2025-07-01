import { BrowserExtensionTransport } from '../../src/transports/BrowserExtensionTransport';
import { testDataFixtures } from '../fixtures/data';
import type browser from 'webextension-polyfill';


// Create a mock implementation of browser.runtime.Port
function createMockPort() {
    const listeners = new Set<(message: unknown) => void>();
    let isConnected = true;

    return {
        onMessage: {
            addListener: (callback: (message: unknown) => void) => {
                listeners.add(callback);
            },
            removeListener: (callback: (message: unknown) => void) => {
                listeners.delete(callback);
            },
        },
        postMessage: (message: unknown) => {
            if (!isConnected) {
                throw new Error('Attempting to use a disconnected port object');
            }
            // Simulate async message delivery
            setTimeout(() => {
                listeners.forEach(listener => listener(message));
            }, 0);
        },
        disconnect: () => {
            isConnected = false;
            listeners.clear();
        },
    } as unknown as browser.Runtime.Port;
}

// Create a pair of connected mock ports for bidirectional communication
function createMockPortPair(): [browser.Runtime.Port, browser.Runtime.Port] {
    const port1Listeners = new Set<(message: unknown) => void>();
    const port2Listeners = new Set<(message: unknown) => void>();
    let isConnected = true;

    const port1 = {
        onMessage: {
            addListener: (callback: (message: unknown) => void) => {
                port1Listeners.add(callback);
            },
            removeListener: (callback: (message: unknown) => void) => {
                port1Listeners.delete(callback);
            },
        },
        postMessage: (message: unknown) => {
            if (!isConnected) {
                throw new Error('Attempting to use a disconnected port object');
            }
            // Send message to port2 listeners
            setTimeout(() => {
                port2Listeners.forEach(listener => listener(message));
            }, 0);
        },
        disconnect: () => {
            isConnected = false;
            port1Listeners.clear();
            port2Listeners.clear();
        },
    } as unknown as browser.Runtime.Port;

    const port2 = {
        onMessage: {
            addListener: (callback: (message: unknown) => void) => {
                port2Listeners.add(callback);
            },
            removeListener: (callback: (message: unknown) => void) => {
                port2Listeners.delete(callback);
            },
        },
        postMessage: (message: unknown) => {
            if (!isConnected) {
                throw new Error('Attempting to use a disconnected port object');
            }
            // Send message to port1 listeners
            setTimeout(() => {
                port1Listeners.forEach(listener => listener(message));
            }, 0);
        },
        disconnect: () => {
            isConnected = false;
            port1Listeners.clear();
            port2Listeners.clear();
        },
    } as unknown as browser.Runtime.Port;

    return [port1, port2];
}

describe('BrowserExtensionTransport Integration Tests', () => {
    describe('Basic Port Communication', () => {
        it('should send and receive messages through port', async () => {
            const [port1, port2] = createMockPortPair();
            const transport1 = new BrowserExtensionTransport({ port: port1 });
            const transport2 = new BrowserExtensionTransport({ port: port2 });

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
            const [port1, port2] = createMockPortPair();
            const sender = new BrowserExtensionTransport({ port: port1 });
            const receiver = new BrowserExtensionTransport({ port: port2 });

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

        it('should warn about transferable objects', async () => {
            const [port1, port2] = createMockPortPair();
            const sender = new BrowserExtensionTransport({ port: port1 });
            const receiver = new BrowserExtensionTransport({ port: port2 });

            // Spy on console.warn to check if warning is logged
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const buffer = new ArrayBuffer(1024);
            let receivedData: unknown;

            const cleanup = receiver.onMessage(data => {
                receivedData = data;
            });

            sender.send({ message: 'with transferable', buffer }, [buffer]);

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(consoleSpy).toHaveBeenCalledWith('BrowserExtensionTransport does not support transferable objects.');
            expect(receivedData).toEqual({ message: 'with transferable', buffer });

            consoleSpy.mockRestore();
            cleanup();
            sender.close();
            receiver.close();
        });

        it('should handle rapid message sequences', async () => {
            const [port1, port2] = createMockPortPair();
            const sender = new BrowserExtensionTransport({ port: port1 });
            const receiver = new BrowserExtensionTransport({ port: port2 });

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

    describe('Error Handling', () => {
        it('should handle listener cleanup properly', async () => {
            const mockPort = createMockPort();
            const transport = new BrowserExtensionTransport({ port: mockPort });

            let messageCount = 0;
            const cleanup = transport.onMessage(() => {
                messageCount++;
            });

            // Send a message before cleanup
            mockPort.postMessage('test1');
            await new Promise(resolve => setTimeout(resolve, 20));
            expect(messageCount).toBe(1);

            // Cleanup and send another message
            cleanup();
            mockPort.postMessage('test2');
            await new Promise(resolve => setTimeout(resolve, 20));
            expect(messageCount).toBe(1); // Should not increment

            transport.close();
        });

        it('should handle port disconnection gracefully', async () => {
            const mockPort = createMockPort();
            const transport = new BrowserExtensionTransport({ port: mockPort });

            let messageReceived = false;
            const cleanup = transport.onMessage(() => {
                messageReceived = true;
            });

            // Disconnect the port and try to send a message
            mockPort.disconnect();

            expect(() => {
                transport.send('test message');
            }).toThrow('Attempting to use a disconnected port object');

            expect(messageReceived).toBe(false);

            cleanup();
            transport.close();
        });

        it('should handle multiple cleanup calls safely', async () => {
            const mockPort = createMockPort();
            const transport = new BrowserExtensionTransport({ port: mockPort });

            const cleanup = transport.onMessage(() => {});

            // Multiple cleanup calls should not throw
            expect(() => {
                cleanup();
                cleanup();
                cleanup();
            }).not.toThrow();

            transport.close();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty messages', async () => {
            const [port1, port2] = createMockPortPair();
            const sender = new BrowserExtensionTransport({ port: port1 });
            const receiver = new BrowserExtensionTransport({ port: port2 });

            const messages: unknown[] = [];
            const cleanup = receiver.onMessage(data => {
                messages.push(data);
            });

            // Send empty values
            sender.send('');
            sender.send(null);
            sender.send(undefined);
            sender.send(0);
            sender.send(false);

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(messages).toEqual(['', null, undefined, 0, false]);

            cleanup();
            sender.close();
            receiver.close();
        });

        it('should handle special characters and unicode', async () => {
            const [port1, port2] = createMockPortPair();
            const sender = new BrowserExtensionTransport({ port: port1 });
            const receiver = new BrowserExtensionTransport({ port: port2 });

            const specialData = testDataFixtures.edgeCases.unicode;
            let receivedData: unknown;

            const cleanup = receiver.onMessage(data => {
                receivedData = data;
            });

            sender.send(specialData);

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(receivedData).toBe(specialData);

            cleanup();
            sender.close();
            receiver.close();
        });

        it('should handle large data payloads', async () => {
            const [port1, port2] = createMockPortPair();
            const sender = new BrowserExtensionTransport({ port: port1 });
            const receiver = new BrowserExtensionTransport({ port: port2 });

            // Create a large object
            const largeData = {
                array: Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    data: `item-${i}`,
                    nested: {
                        value: i * 2,
                        text: `nested-${i}`,
                    },
                })),
                metadata: testDataFixtures.complexData.deeplyNested,
            };

            let receivedData: unknown;

            const cleanup = receiver.onMessage(data => {
                receivedData = data;
            });

            sender.send(largeData);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(receivedData).toEqual(largeData);

            cleanup();
            sender.close();
            receiver.close();
        });
    });

    describe('Lifecycle Management', () => {
        it('should properly close and cleanup resources', async () => {
            const mockPort = createMockPort();
            const transport = new BrowserExtensionTransport({ port: mockPort });

            // Setup message listener
            let messageReceived = false;
            const cleanup = transport.onMessage(() => {
                messageReceived = true;
            });

            // Close transport
            transport.close();

            // Try to send message after close
            expect(() => {
                mockPort.postMessage('test');
            }).toThrow('Attempting to use a disconnected port object');

            expect(messageReceived).toBe(false);

            // Cleanup should be safe to call even after close
            expect(() => {
                cleanup();
            }).not.toThrow();
        });

        it('should handle multiple transport instances on same port', async () => {
            const mockPort = createMockPort();
            const transport1 = new BrowserExtensionTransport({ port: mockPort });
            const transport2 = new BrowserExtensionTransport({ port: mockPort });

            const messages1: unknown[] = [];
            const messages2: unknown[] = [];

            const cleanup1 = transport1.onMessage(data => messages1.push(data));
            const cleanup2 = transport2.onMessage(data => messages2.push(data));

            // Send a message - both transports should receive it
            mockPort.postMessage('broadcast message');

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(messages1).toContain('broadcast message');
            expect(messages2).toContain('broadcast message');

            cleanup1();
            cleanup2();
            transport1.close();
            // Don't close transport2 since port is already disconnected
        });
    });

    describe('Browser Extension Context Simulation', () => {
        it('should simulate content script to background communication', async () => {
            const [contentPort, backgroundPort] = createMockPortPair();

            // Simulate content script
            const contentTransport = new BrowserExtensionTransport({ port: contentPort });

            // Simulate background script
            const backgroundTransport = new BrowserExtensionTransport({ port: backgroundPort });

            const backgroundMessages: unknown[] = [];
            const contentMessages: unknown[] = [];

            const cleanupBackground = backgroundTransport.onMessage(data => {
                backgroundMessages.push(data);
                // Echo back with prefix
                backgroundTransport.send(`background-response: ${data}`);
            });

            const cleanupContent = contentTransport.onMessage(data => {
                contentMessages.push(data);
            });

            // Content script sends request
            contentTransport.send('get-user-data');

            await new Promise(resolve => setTimeout(resolve, 20));

            expect(backgroundMessages).toContain('get-user-data');
            expect(contentMessages).toContain('background-response: get-user-data');

            cleanupBackground();
            cleanupContent();
            contentTransport.close();
            backgroundTransport.close();
        });

        it('should simulate popup to background communication', async () => {
            const [popupPort, backgroundPort] = createMockPortPair();

            const popupTransport = new BrowserExtensionTransport({ port: popupPort });
            const backgroundTransport = new BrowserExtensionTransport({ port: backgroundPort });

            let popupResponse: unknown;
            let backgroundRequest: unknown;

            const cleanupBackground = backgroundTransport.onMessage(data => {
                backgroundRequest = data;
                // Simulate background processing and response
                setTimeout(() => {
                    backgroundTransport.send({
                        status: 'success',
                        data: { userId: 123, name: 'John Doe' },
                        requestId: (data as { requestId: string })?.['requestId'],
                    });
                }, 10);
            });

            const cleanupPopup = popupTransport.onMessage(data => {
                popupResponse = data;
            });

            // Popup sends request
            popupTransport.send({
                action: 'getUserInfo',
                requestId: 'req-123',
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(backgroundRequest).toEqual({
                action: 'getUserInfo',
                requestId: 'req-123',
            });

            expect(popupResponse).toEqual({
                status: 'success',
                data: { userId: 123, name: 'John Doe' },
                requestId: 'req-123',
            });

            cleanupBackground();
            cleanupPopup();
            popupTransport.close();
            backgroundTransport.close();
        });
    });
});

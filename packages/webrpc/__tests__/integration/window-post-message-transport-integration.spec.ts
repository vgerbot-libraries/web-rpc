import { WindowPostMessageTransport } from '../../src/transports/WindowPostMessageTransport';
import { testDataFixtures } from '../fixtures/data';

describe('WindowPostMessageTransport Integration Tests', () => {
    describe('Iframe Communication', () => {
        it('should support communication with iframe', async () => {
            // Create an iframe for testing
            const iframe = document.createElement('iframe');
            iframe.srcdoc = `
                <script>
                    window.addEventListener("message", e => 
                        e.source.postMessage("Echo: " + e.data, "*")
                    );
                </script>
            `;
            document.body.appendChild(iframe);

            // Wait for iframe to load
            await new Promise(resolve => {
                iframe.onload = resolve;
            });

            const transport = new WindowPostMessageTransport({
                remote: iframe.contentWindow!,
                origin: '*',
            });

            const messages: unknown[] = [];
            const cleanup = transport.onMessage(data => {
                messages.push(data);
            });

            transport.send('Hello iframe');

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(messages).toContain('Echo: Hello iframe');

            cleanup();
            transport.close();
            document.body.removeChild(iframe);
        });

        it('should handle complex data structures with iframe', async () => {
            const iframe = document.createElement('iframe');
            iframe.srcdoc = `
                <script>
                    window.addEventListener("message", e => 
                        e.source.postMessage(e.data, "*")
                    );
                </script>
            `;
            document.body.appendChild(iframe);

            await new Promise(resolve => {
                iframe.onload = resolve;
            });

            const transport = new WindowPostMessageTransport({
                remote: iframe.contentWindow!,
                origin: '*',
            });

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
            document.body.removeChild(iframe);
        });

        it('should handle transferable objects with iframe', async () => {
            const iframe = document.createElement('iframe');
            iframe.srcdoc = `
                <script>
                    window.addEventListener("message", e => 
                        e.source.postMessage(e.data, "*", e.ports || [])
                    );
                </script>
            `;
            document.body.appendChild(iframe);

            await new Promise(resolve => {
                iframe.onload = resolve;
            });

            const transport = new WindowPostMessageTransport({
                remote: iframe.contentWindow!,
                origin: '*',
            });

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

            expect(receivedData).toEqual({ message: 'with transferable', buffer });
            expect(buffer.byteLength).toBe(0);

            cleanup();
            transport.close();
            document.body.removeChild(iframe);
        });

        it('should respect origin filtering', async () => {
            const iframe = document.createElement('iframe');
            iframe.srcdoc = `
                <script>
                    window.addEventListener("message", e => 
                        e.source.postMessage("Echo: " + e.data, "*")
                    );
                </script>
            `;
            document.body.appendChild(iframe);

            await new Promise(resolve => {
                iframe.onload = resolve;
            });

            // Set specific origin that won't match
            const transport = new WindowPostMessageTransport({
                remote: iframe.contentWindow!,
                origin: 'https://example.com',
            });

            const messages: unknown[] = [];
            const cleanup = transport.onMessage(data => {
                messages.push(data);
            });

            transport.send('Hello with origin');

            await new Promise(resolve => setTimeout(resolve, 100));

            // Should not receive message due to origin mismatch
            expect(messages).toHaveLength(0);

            cleanup();
            transport.close();
            document.body.removeChild(iframe);
        });
    });

    describe('Self Communication', () => {
        it('should support self-communication with different transports', async () => {
            const transport1 = new WindowPostMessageTransport({
                remote: window,
                origin: '*',
            });

            const transport2 = new WindowPostMessageTransport({
                remote: window,
                origin: '*',
            });

            const messages1: unknown[] = [];
            const messages2: unknown[] = [];

            const cleanup1 = transport1.onMessage(data => {
                if (typeof data === 'string' && data.startsWith('transport2:')) {
                    messages1.push(data);
                }
            });

            const cleanup2 = transport2.onMessage(data => {
                if (typeof data === 'string' && data.startsWith('transport1:')) {
                    messages2.push(data);
                }
            });

            transport1.send('transport1: Hello from transport1');
            transport2.send('transport2: Hello from transport2');

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(messages1).toContain('transport2: Hello from transport2');
            expect(messages2).toContain('transport1: Hello from transport1');

            cleanup1();
            cleanup2();
            transport1.close();
            transport2.close();
        });
    });

    describe('Resource Management', () => {
        it('should properly clean up resources on close', async () => {
            const iframe = document.createElement('iframe');
            iframe.srcdoc = `
                <script>
                    window.addEventListener("message", e => 
                        e.source.postMessage("Echo: " + e.data, "*")
                    );
                </script>
            `;
            document.body.appendChild(iframe);

            await new Promise(resolve => {
                iframe.onload = resolve;
            });

            const transport = new WindowPostMessageTransport({
                remote: iframe.contentWindow!,
                origin: '*',
            });

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
            document.body.removeChild(iframe);
        });

        it('should handle cleanup function calls after transport close', () => {
            const transport = new WindowPostMessageTransport({
                remote: window,
                origin: '*',
            });

            const cleanup = transport.onMessage(() => {});

            transport.close();

            expect(() => cleanup()).not.toThrow();
            expect(() => cleanup()).not.toThrow();
        });
    });

    describe('Performance', () => {
        it('should handle rapid message sequences', async () => {
            const iframe = document.createElement('iframe');
            iframe.srcdoc = `
                <script>
                    window.addEventListener("message", e => 
                        e.source.postMessage("Response: " + e.data, "*")
                    );
                </script>
            `;
            document.body.appendChild(iframe);

            await new Promise(resolve => {
                iframe.onload = resolve;
            });

            const transport = new WindowPostMessageTransport({
                remote: iframe.contentWindow!,
                origin: '*',
            });

            const messages: unknown[] = [];
            const cleanup = transport.onMessage(data => {
                messages.push(data);
            });

            const messageCount = 50;
            const expectedMessages = Array.from({ length: messageCount }, (_, i) => `Response: message-${i}`);

            for (let i = 0; i < messageCount; i++) {
                transport.send(`message-${i}`);
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            expect(messages).toHaveLength(messageCount);
            expectedMessages.forEach(msg => {
                expect(messages).toContain(msg);
            });

            cleanup();
            transport.close();
            document.body.removeChild(iframe);
        });
    });
});

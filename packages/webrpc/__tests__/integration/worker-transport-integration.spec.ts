import { WorkerTransport } from '../../src/transports/WorkerTransport';
import { testDataFixtures } from '../fixtures/data';

describe('WorkerTransport Integration Tests', () => {
    describe('Worker Communication', () => {
        it('should support communication with Worker', async () => {
            const workerScript = `
                self.onmessage = function(e) {
                    self.postMessage('Echo: ' + e.data);
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            const transport = new WorkerTransport({ target: worker });

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

            const transport = new WorkerTransport({ target: worker });

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

            const transport = new WorkerTransport({ target: worker });

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
    });

    describe('Resource Management', () => {
        it('should properly clean up resources on close', async () => {
            const workerScript = `
                self.onmessage = function(e) {
                    self.postMessage('Echo: ' + e.data);
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            const transport = new WorkerTransport({ target: worker });

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

        it('should handle cleanup function calls after transport close', () => {
            const workerScript = `
                self.onmessage = function(e) {
                    self.postMessage(e.data);
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            const transport = new WorkerTransport({ target: worker });

            const cleanup = transport.onMessage(() => {});

            transport.close();

            expect(() => cleanup()).not.toThrow();
            expect(() => cleanup()).not.toThrow();

            worker.terminate();
        });
    });
});

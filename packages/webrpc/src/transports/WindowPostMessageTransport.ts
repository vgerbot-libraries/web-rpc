import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type WindowPostMessageOptions = {
    remote: Window;
    origin?: string;
    source?: Window;
};

/**
 * WindowPostMessageTransport provides a Transport implementation for Window-to-Window communication.
 *
 * This transport enables secure communication between different window contexts such as iframes, popups,
 * and parent-child windows. It includes origin-based security filtering to prevent unauthorized
 * cross-origin communication and supports transferable objects for efficient data transfer.
 *
 * @example
 * ```typescript
 * // Parent window communicating with iframe
 * const iframe = document.createElement('iframe');
 * iframe.src = 'https://trusted-domain.com/child.html';
 * document.body.appendChild(iframe);
 *
 * // Wait for iframe to load
 * iframe.onload = () => {
 *   const transport = new WindowPostMessageTransport({
 *     remote: iframe.contentWindow!,
 *     origin: 'https://trusted-domain.com'
 *   });
 *
 *   const webRPC = new WebRPC('parent', transport);
 *
 *   // Register parent services
 *   webRPC.register('parentAPI', {
 *     getUserData: () => ({ id: 1, name: 'John' }),
 *     saveData: (data: any) => localStorage.setItem('data', JSON.stringify(data))
 *   });
 *
 *   // Get child services
 *   const childAPI = webRPC.get<{
 *     processData: (data: any) => Promise<any>;
 *   }>('childAPI');
 *
 *   const result = await childAPI.processData({ test: 'data' });
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Child window/iframe communicating with parent
 * const transport = new WindowPostMessageTransport({
 *   remote: window.parent,
 *   origin: 'https://parent-domain.com'
 * });
 *
 * const webRPC = new WebRPC('child', transport);
 *
 * // Register child services
 * webRPC.register('childAPI', {
 *   processData: (data: any) => {
 *     return { processed: true, original: data };
 *   }
 * });
 *
 * // Get parent services
 * const parentAPI = webRPC.get<{
 *   getUserData: () => Promise<{ id: number; name: string }>;
 *   saveData: (data: any) => Promise<void>;
 * }>('parentAPI');
 *
 * const userData = await parentAPI.getUserData();
 * ```
 *
 * @example
 * ```typescript
 * // Parent window communicating with popup
 * const popup = window.open('https://trusted-domain.com/popup.html', 'popup');
 *
 * if (popup) {
 *   const transport = new WindowPostMessageTransport({
 *     remote: popup,
 *     origin: 'https://trusted-domain.com'
 *   });
 *
 *   const webRPC = new WebRPC('main', transport);
 *
 *   const popupAPI = webRPC.get<{
 *     authenticate: (credentials: any) => Promise<string>;
 *   }>('authAPI');
 *
 *   const token = await popupAPI.authenticate({ username: 'user', password: 'pass' });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Popup window communicating with parent
 * const transport = new WindowPostMessageTransport({
 *   remote: window.opener,
 *   origin: 'https://main-domain.com'
 * });
 *
 * const webRPC = new WebRPC('popup', transport);
 *
 * webRPC.register('authAPI', {
 *   authenticate: async (credentials: any) => {
 *     // Perform authentication
 *     return 'auth-token-123';
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using transferable objects for efficient data transfer
 * const transport = new WindowPostMessageTransport({
 *   remote: iframe.contentWindow!,
 *   origin: 'https://trusted-domain.com'
 * });
 *
 * const buffer = new ArrayBuffer(1024);
 * transport.send({ type: 'process-buffer', buffer }, [buffer]);
 * // buffer ownership is transferred to the iframe
 * ```
 *
 * @example
 * ```typescript
 * // Allowing any origin (NOT recommended for production)
 * const transport = new WindowPostMessageTransport({
 *   remote: targetWindow,
 *   origin: '*'  // Use only for development or trusted environments
 * });
 * ```
 */
export class WindowPostMessageTransport implements Transport {
    private readonly remote: Window;
    private readonly origin: string;
    private readonly source: Window;
    private listener?: (event: MessageEvent) => void;

    constructor(options: WindowPostMessageOptions) {
        this.remote = options.remote;
        this.origin = options.origin ?? '*';
        this.source = options.source ?? window;
    }

    send(data: SerializableData, transfer?: Transferable[]): void {
        this.remote.postMessage(data, this.origin, transfer);
    }

    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = (event: MessageEvent) => {
            if (this.origin !== '*' && event.origin !== this.origin) {
                return;
            }
            if (event.source !== this.remote) {
                return;
            }
            callback(event.data);
        };

        this.source.addEventListener('message', this.listener);

        return () => {
            if (this.listener) {
                this.source.removeEventListener('message', this.listener);
                this.listener = undefined;
            }
        };
    }

    close(): void {
        if (this.listener) {
            this.source.removeEventListener('message', this.listener);
            this.listener = undefined;
        }
    }
}

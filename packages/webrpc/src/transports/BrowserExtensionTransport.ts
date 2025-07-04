import type browser from 'webextension-polyfill';

import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type BrowserExtensionTransportOptions = {
    port: browser.Runtime.Port;
};

/**
 * BrowserExtensionTransport provides a Transport implementation for browser extension communication.
 *
 * This transport enables communication between different components of a browser extension such as
 * background scripts, content scripts, popup scripts, options pages, and DevTools pages. It uses
 * the browser extension's runtime.Port API for reliable bidirectional communication.
 *
 * **Limitations**:
 * - Does not support transferable objects
 * - Requires webextension-polyfill or native browser.runtime API
 * - Port must be established before creating the transport
 *
 * @example
 * ```typescript
 * // Background script (service provider)
 * // manifest.json: "background": { "service_worker": "background.js" }
 * chrome.runtime.onConnect.addListener((port) => {
 *   if (port.name === 'webRPC') {
 *     const transport = new BrowserExtensionTransport({ port });
 *     const webRPC = new WebRPC('background', transport);
 *
 *     // Register background services
 *     webRPC.register('storage', {
 *       getData: async (key: string) => {
 *         const result = await chrome.storage.sync.get(key);
 *         return result[key];
 *       },
 *       setData: async (key: string, value: any) => {
 *         await chrome.storage.sync.set({ [key]: value });
 *         return true;
 *       }
 *     });
 *
 *     webRPC.register('tabs', {
 *       createTab: async (url: string) => {
 *         const tab = await chrome.tabs.create({ url });
 *         return tab;
 *       },
 *       getCurrentTab: async () => {
 *         const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
 *         return tab;
 *       }
 *     });
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Content script (service consumer)
 * // manifest.json: "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"] }]
 * const port = chrome.runtime.connect({ name: 'webRPC' });
 * const transport = new BrowserExtensionTransport({ port });
 * const webRPC = new WebRPC('content', transport);
 *
 * // Get background services
 * const storage = webRPC.get<{
 *   getData: (key: string) => Promise<any>;
 *   setData: (key: string, value: any) => Promise<boolean>;
 * }>('storage');
 *
 * const tabs = webRPC.get<{
 *   createTab: (url: string) => Promise<chrome.tabs.Tab>;
 *   getCurrentTab: () => Promise<chrome.tabs.Tab>;
 * }>('tabs');
 *
 * // Use the services
 * const userData = await storage.getData('user');
 * await storage.setData('lastVisit', new Date().toISOString());
 * const currentTab = await tabs.getCurrentTab();
 * ```
 *
 * @example
 * ```typescript
 * // Popup script (service consumer)
 * // manifest.json: "action": { "default_popup": "popup.html" }
 * // popup.html: <script src="popup.js"></script>
 * const port = chrome.runtime.connect({ name: 'webRPC' });
 * const transport = new BrowserExtensionTransport({ port });
 * const webRPC = new WebRPC('popup', transport);
 *
 * const storage = webRPC.get<{
 *   getData: (key: string) => Promise<any>;
 *   setData: (key: string, value: any) => Promise<boolean>;
 * }>('storage');
 *
 * // Popup UI interactions
 * document.getElementById('saveButton')?.addEventListener('click', async () => {
 *   const input = document.getElementById('userInput') as HTMLInputElement;
 *   await storage.setData('userPreference', input.value);
 *   console.log('Preference saved!');
 * });
 *
 * // Load data on popup open
 * window.addEventListener('load', async () => {
 *   const preference = await storage.getData('userPreference');
 *   const input = document.getElementById('userInput') as HTMLInputElement;
 *   input.value = preference || '';
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Content script with page interaction services
 * const port = chrome.runtime.connect({ name: 'webRPC' });
 * const transport = new BrowserExtensionTransport({ port });
 * const webRPC = new WebRPC('content', transport);
 *
 * // Register content script services (accessible from popup/background)
 * webRPC.register('pageInteraction', {
 *   getPageTitle: () => document.title,
 *   getPageUrl: () => window.location.href,
 *   highlightText: (text: string) => {
 *     const elements = document.querySelectorAll('*');
 *     elements.forEach(el => {
 *       if (el.textContent?.includes(text)) {
 *         el.style.backgroundColor = 'yellow';
 *       }
 *     });
 *   },
 *   extractData: (selector: string) => {
 *     const elements = document.querySelectorAll(selector);
 *     return Array.from(elements).map(el => el.textContent);
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Background script consuming content script services
 * chrome.runtime.onConnect.addListener((port) => {
 *   if (port.name === 'webRPC') {
 *     const transport = new BrowserExtensionTransport({ port });
 *     const webRPC = new WebRPC('background', transport);
 *
 *     // Get content script services
 *     const pageInteraction = webRPC.get<{
 *       getPageTitle: () => Promise<string>;
 *       getPageUrl: () => Promise<string>;
 *       highlightText: (text: string) => Promise<void>;
 *       extractData: (selector: string) => Promise<string[]>;
 *     }>('pageInteraction');
 *
 *     // Use content script services
 *     chrome.action.onClicked.addListener(async (tab) => {
 *       const title = await pageInteraction.getPageTitle();
 *       const url = await pageInteraction.getPageUrl();
 *       console.log(`Tab clicked: ${title} (${url})`);
 *
 *       await pageInteraction.highlightText('important');
 *     });
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Options page (service consumer)
 * // manifest.json: "options_page": "options.html"
 * const port = chrome.runtime.connect({ name: 'webRPC' });
 * const transport = new BrowserExtensionTransport({ port });
 * const webRPC = new WebRPC('options', transport);
 *
 * const storage = webRPC.get<{
 *   getData: (key: string) => Promise<any>;
 *   setData: (key: string, value: any) => Promise<boolean>;
 * }>('storage');
 *
 * // Options page settings management
 * const form = document.getElementById('optionsForm') as HTMLFormElement;
 * form.addEventListener('submit', async (e) => {
 *   e.preventDefault();
 *   const formData = new FormData(form);
 *   const settings = Object.fromEntries(formData);
 *
 *   await storage.setData('extensionSettings', settings);
 *   console.log('Settings saved!');
 * });
 * ```
 *
 * @example
 * ```typescript
 * // DevTools page communication
 * // manifest.json: "devtools_page": "devtools.html"
 * const port = chrome.runtime.connect({ name: 'webRPC' });
 * const transport = new BrowserExtensionTransport({ port });
 * const webRPC = new WebRPC('devtools', transport);
 *
 * const pageInteraction = webRPC.get<{
 *   extractData: (selector: string) => Promise<string[]>;
 *   getPageTitle: () => Promise<string>;
 * }>('pageInteraction');
 *
 * // Create DevTools panel
 * chrome.devtools.panels.create('My Extension', 'icon.png', 'panel.html', (panel) => {
 *   panel.onShown.addListener(async () => {
 *     const title = await pageInteraction.getPageTitle();
 *     const links = await pageInteraction.extractData('a');
 *     console.log(`Inspecting: ${title}, Found ${links.length} links`);
 *   });
 * });
 * ```
 */
export class BrowserExtensionTransport implements Transport {
    private readonly port: browser.Runtime.Port;
    private listener?: (message: unknown, port: browser.Runtime.Port) => void;

    constructor(options: BrowserExtensionTransportOptions) {
        this.port = options.port;
    }

    send(data: SerializableData, transfer?: Transferable[]): void {
        if (transfer?.length) {
            console.warn('BrowserExtensionTransport does not support transferable objects.');
        }
        this.port.postMessage(data);
    }

    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = message => {
            callback(message as SerializableData);
        };

        this.port.onMessage.addListener(this.listener);

        return () => {
            if (this.listener) {
                this.port.onMessage.removeListener(this.listener);
                this.listener = undefined;
            }
        };
    }

    close(): void {
        if (this.listener) {
            this.port.onMessage.removeListener(this.listener);
            this.listener = undefined;
        }
        this.port.disconnect();
    }
}

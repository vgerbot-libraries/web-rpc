import type { Transport } from '../core/Transport';
import type { SerializableData } from '../protocol/SerializableData';

export type BroadcastChannelTransportOptions = {
    channel: BroadcastChannel | string;
};

/**
 * BroadcastChannelTransport provides a Transport implementation for cross-tab/cross-context communication.
 *
 * This transport enables communication between multiple browser contexts (tabs, workers, etc.) using
 * the same BroadcastChannel name. It follows a service provider/consumer pattern where typically
 * one context registers services and multiple other contexts consume them.
 *
 * **Important**: BroadcastChannel should generally have services registered in only ONE context,
 * with other contexts acting as consumers. Registering the same service in multiple contexts
 * can lead to conflicts and unpredictable behavior.
 *
 * **Limitations**:
 * - Does not support transferable objects
 * - All contexts must use the same channel name
 * - Messages are broadcast to all contexts, not point-to-point
 *
 * @example
 * ```typescript
 * // Main tab (service provider) - registers services
 * const transport = new BroadcastChannelTransport({ channel: 'my-app-channel' });
 * const webRPC = new WebRPC('main-tab', transport);
 *
 * // Register shared services that other tabs can use
 * webRPC.register('appState', {
 *   getUser: () => ({ id: 1, name: 'John', email: 'john@example.com' }),
 *   updateUser: (userData: any) => {
 *     // Update user data
 *     localStorage.setItem('user', JSON.stringify(userData));
 *     return userData;
 *   },
 *   logout: () => {
 *     localStorage.removeItem('user');
 *     // Broadcast logout to all tabs
 *     return { success: true };
 *   }
 * });
 *
 * webRPC.register('notifications', {
 *   showNotification: (message: string) => {
 *     // Show notification in main tab
 *     new Notification(message);
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Other tabs (service consumers) - consume services from main tab
 * const transport = new BroadcastChannelTransport({ channel: 'my-app-channel' });
 * const webRPC = new WebRPC('secondary-tab', transport);
 *
 * // Get services from main tab
 * const appState = webRPC.get<{
 *   getUser: () => Promise<{ id: number; name: string; email: string }>;
 *   updateUser: (userData: any) => Promise<any>;
 *   logout: () => Promise<{ success: boolean }>;
 * }>('appState');
 *
 * const notifications = webRPC.get<{
 *   showNotification: (message: string) => Promise<void>;
 * }>('notifications');
 *
 * // Use the services
 * const user = await appState.getUser();
 * await appState.updateUser({ ...user, name: 'Jane' });
 * await notifications.showNotification('Profile updated!');
 * ```
 *
 * @example
 * ```typescript
 * // Shopping cart synchronization across tabs
 * // Main tab (service provider)
 * const transport = new BroadcastChannelTransport({ channel: 'shopping-cart' });
 * const webRPC = new WebRPC('cart-main', transport);
 *
 * let cartItems: any[] = [];
 *
 * webRPC.register('cart', {
 *   addItem: (item: any) => {
 *     cartItems.push(item);
 *     localStorage.setItem('cart', JSON.stringify(cartItems));
 *     return cartItems;
 *   },
 *   removeItem: (itemId: string) => {
 *     cartItems = cartItems.filter(item => item.id !== itemId);
 *     localStorage.setItem('cart', JSON.stringify(cartItems));
 *     return cartItems;
 *   },
 *   getItems: () => cartItems
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Product page tab (service consumer)
 * const transport = new BroadcastChannelTransport({ channel: 'shopping-cart' });
 * const webRPC = new WebRPC('product-page', transport);
 *
 * const cart = webRPC.get<{
 *   addItem: (item: any) => Promise<any[]>;
 *   removeItem: (itemId: string) => Promise<any[]>;
 *   getItems: () => Promise<any[]>;
 * }>('cart');
 *
 * // Add item to cart from product page
 * const updatedCart = await cart.addItem({
 *   id: 'product-123',
 *   name: 'Wireless Headphones',
 *   price: 99.99
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using with existing BroadcastChannel instance
 * const existingChannel = new BroadcastChannel('my-channel');
 * const transport = new BroadcastChannelTransport({ channel: existingChannel });
 *
 * // Note: When using existing channel, make sure to close it properly
 * // transport.close() will also close the underlying channel
 * ```
 *
 * @example
 * ```typescript
 * // Real-time theme synchronization
 * // Main tab
 * const transport = new BroadcastChannelTransport({ channel: 'theme-sync' });
 * const webRPC = new WebRPC('theme-main', transport);
 *
 * webRPC.register('themeManager', {
 *   changeTheme: (theme: 'light' | 'dark') => {
 *     document.body.className = theme;
 *     localStorage.setItem('theme', theme);
 *     return theme;
 *   },
 *   getTheme: () => localStorage.getItem('theme') || 'light'
 * });
 *
 * // Other tabs automatically sync theme changes
 * const themeManager = webRPC.get<{
 *   changeTheme: (theme: 'light' | 'dark') => Promise<string>;
 *   getTheme: () => Promise<string>;
 * }>('themeManager');
 * ```
 */
export class BroadcastChannelTransport implements Transport {
    private readonly channel: BroadcastChannel;
    private listener?: (event: MessageEvent) => void;

    constructor(options: BroadcastChannelTransportOptions) {
        if (typeof options.channel === 'string') {
            this.channel = new BroadcastChannel(options.channel);
        } else {
            this.channel = options.channel;
        }
    }

    send(data: SerializableData, transfer?: Transferable[]): void {
        if (transfer?.length) {
            console.warn('BroadcastChannelTransport does not support transferable objects.');
        }
        this.channel.postMessage(data);
    }

    onMessage(callback: (data: SerializableData) => void): () => void {
        this.listener = (event: MessageEvent) => {
            callback(event.data);
        };

        this.channel.addEventListener('message', this.listener);

        return () => {
            if (this.listener) {
                this.channel.removeEventListener('message', this.listener);
                this.listener = undefined;
            }
        };
    }

    close(): void {
        if (this.listener) {
            this.channel.removeEventListener('message', this.listener);
            this.listener = undefined;
        }
        this.channel.close();
    }
}

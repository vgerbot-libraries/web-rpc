# web-rpc

[![CI](https://github.com/y1j2x34/tsup-vitest-monorepo-boilerplate/actions/workflows/ci.yml/badge.svg)](https://github.com/y1j2x34/tsup-vitest-monorepo-boilerplate/actions/workflows/ci.yml)
[![Release](https://github.com/y1j2x34/tsup-vitest-monorepo-boilerplate/actions/workflows/release.yml/badge.svg)](https://github.com/y1j2x34/tsup-vitest-monorepo-boilerplate/actions/workflows/release.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/5651fd01442f4fe197ed3c8a748a352e)](https://app.codacy.com/gh/vgerbot-libraries/web-rpc/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/5651fd01442f4fe197ed3c8a748a352e)](https://app.codacy.com/gh/vgerbot-libraries/web-rpc/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)

A TypeScript library that provides type-safe Remote Procedure Call (RPC) communication between different JavaScript contexts using various transport mechanisms.

## ✨ Features

- 🔒 **Type-Safe**: Full TypeScript support with type inference for remote methods
- 🚀 **Multiple Transports**: Support for various communication channels
- 🔄 **Bidirectional**: Two-way communication between different JavaScript contexts
- 📦 **Transferable Objects**: Efficient transfer of ArrayBuffers and other transferable objects
- 🎯 **Callbacks**: Support for callback functions in remote calls
- ⚡ **Async/Await**: Promise-based API with async method support
- 🛡️ **Error Handling**: Proper error propagation across contexts

## 📦 Installation

```bash
npm install @vgerbot/web-rpc
```

## 🚀 Quick Start

### Basic Usage with MessageChannel

```typescript
import { WebRPC, PostMessageTransport } from '@vgerbot/web-rpc';

// Create a message channel
const channel = new MessageChannel();

// Server side
const serverTransport = new PostMessageTransport(channel.port1);
const server = new WebRPC('math-service', serverTransport);

// Register an implementation
const mathAPI = {
  sum: (numbers: number[]) => numbers.reduce((a, b) => a + b, 0),
  multiply: async (a: number, b: number) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    return a * b;
  }
};

server.register('math', mathAPI);

// transfer channel.port2 from server side to client side

// Client side
const clientTransport = new PostMessageTransport(channel.port2);
const client = new WebRPC('math-service', clientTransport);

// Get typed remote implementation
const remoteMath = client.get<typeof mathAPI>('math');

// Use remote methods with full type safety
const result1 = await remoteMath.sum([1, 2, 3, 4]); // 10
const result2 = await remoteMath.multiply(5, 6);     // 30
```

> **Important**: The `clientId` parameter (first argument in `new WebRPC()`) must be **identical** on both ends of the communication. This identifier is used to route messages correctly between contexts. Different clientIds will result in messages being ignored.

### Custom Message Handling

Besides using built-in transports, WebRPC also supports custom message handling where you control the message passing mechanism:

```typescript
// Side A - Custom sender function
const rpcA = new WebRPC('my-service', (message, transferables) => {
  // Send message to other context using your custom logic
  otherContext.postMessage({ type: 'rpc', data: message }, transferables);
});

// Register API
const myAPI = {
  getValue: () => 'Hello from A',
  calculate: (a: number, b: number) => a + b
};
rpcA.register('api', myAPI);

// Listen for messages from other context
someContext.addEventListener('message', (event) => {
  if (event.data.type === 'rpc') {
    rpcA.receive(event.data.data); // Forward message to WebRPC
  }
});

// Side B - Custom sender function  
const rpcB = new WebRPC('my-service', (message, transferables) => {
  // Send message back to context A
  contextA.postMessage({ type: 'rpc', data: message }, transferables);
});

// Use remote API
const remoteAPI = rpcB.get<typeof myAPI>('api');
const result = await remoteAPI.getValue(); // 'Hello from A'

// Listen for messages from context A
anotherContext.addEventListener('message', (event) => {
  if (event.data.type === 'rpc') {
    rpcB.receive(event.data.data); // Forward message to WebRPC
  }
});
```

This approach is useful when:

- Integrating with existing message systems
- Adding custom message routing logic
- Working with non-standard communication channels
- Implementing custom protocols on top of WebRPC

#### Real Example: Custom iframe Communication

```typescript
// Parent window
const iframe = document.querySelector('iframe');
const parentRPC = new WebRPC('iframe-service', (message, transferables) => {
  // Send to iframe with custom protocol
  iframe.contentWindow.postMessage({
    source: 'parent-rpc',
    payload: message
  }, 'https://trusted-domain.com', transferables);
});

// Parent API
const parentAPI = {
  getUserData: () => ({ name: 'John', role: 'admin' }),
  saveSettings: (settings: object) => {
    localStorage.setItem('settings', JSON.stringify(settings));
    return 'saved';
  }
};
parentRPC.register('parent', parentAPI);

// Listen for iframe messages
window.addEventListener('message', (event) => {
  if (event.origin === 'https://trusted-domain.com' && 
      event.data.source === 'iframe-rpc') {
    parentRPC.receive(event.data.payload);
  }
});

// Iframe content
const iframeRPC = new WebRPC('iframe-service', (message, transferables) => {
  // Send to parent with custom protocol  
  window.parent.postMessage({
    source: 'iframe-rpc',
    payload: message
  }, 'https://parent-domain.com', transferables);
});

// Use parent API
const remoteParent = iframeRPC.get<typeof parentAPI>('parent');
const userData = await remoteParent.getUserData();
await remoteParent.saveSettings({ theme: 'dark' });

// Listen for parent messages
window.addEventListener('message', (event) => {
  if (event.origin === 'https://parent-domain.com' && 
      event.data.source === 'parent-rpc') {
    iframeRPC.receive(event.data.payload);
  }
});
```

## 🛠️ Available Transports

### PostMessageTransport

For communication via MessagePort, BroadcastChannel, ServiceWorker, or DedicatedWorkerGlobalScope:

```typescript
import { PostMessageTransport } from '@vgerbot/web-rpc';

// With MessageChannel
const transport = new PostMessageTransport(messagePort);

// With BroadcastChannel
const channel = new BroadcastChannel('my-channel');
const transport = new PostMessageTransport(channel);
```

### PostMessageTransport for Workers

For communication with Web Workers using PostMessageTransport:

```typescript
import { PostMessageTransport } from '@vgerbot/web-rpc';

// Main thread
const worker = new Worker('./worker.js');
const transport = new PostMessageTransport(worker);

// Worker thread (worker.js)
const transport = new PostMessageTransport(self);
```

### PostMessageTransport (BroadcastChannel)

For cross-tab communication:

```typescript
import { PostMessageTransport } from '@vgerbot/web-rpc';

const transport = new PostMessageTransport(new BroadcastChannel('my-channel'));
```

### WindowPostMessageTransport

For iframe and popup communication:

```typescript
import { WindowPostMessageTransport } from '@vgerbot/web-rpc';

// Parent window
const transport = new WindowPostMessageTransport(
  iframe.contentWindow,
  'https://trusted-origin.com'
);

// Child window/iframe
const transport = new WindowPostMessageTransport(window.parent, '*');
```

### BrowserExtensionTransport

For browser extension communication:

```typescript
import { BrowserExtensionTransport } from '@vgerbot/web-rpc';

// Content script or popup
const transport = new BrowserExtensionTransport();
```

## 🎯 Advanced Features

### Callback Functions

```typescript
// Server side
const eventAPI = {
  onUserAction: (callback: (action: string) => void) => {
    // Simulate events
    setTimeout(() => callback('click'), 100);
    setTimeout(() => callback('scroll'), 200);
  }
};

server.register('events', eventAPI);

// Client side
const remoteEvents = client.get<typeof eventAPI>('events');

remoteEvents.onUserAction((action) => {
  console.log('User action:', action);
});
```

### Transferable Objects

```typescript
// Server side
const bufferAPI = {
  processBuffer: (buffer: ArrayBuffer) => {
    const view = new Uint8Array(buffer);
    // Process the buffer...
    return buffer.byteLength;
  }
};

server.register('buffer', bufferAPI);

// Client side
const remoteBuffer = client.get<typeof bufferAPI>('buffer');

const buffer = new ArrayBuffer(1024);
const result = await remoteBuffer.processBuffer(buffer);
// Buffer is transferred, original is neutered
```

### Getter Properties

```typescript
// Server side
const configAPI = {
  getConfig: () => ({
    get version() {
      return '1.0.0';
    },
    get features() {
      return ['feature1', 'feature2'];
    }
  })
};

server.register('config', configAPI);

// Client side
const remoteConfig = client.get<typeof configAPI>('config');
const config = await remoteConfig.getConfig();
const version = await config.version; // '1.0.0'
```

### Error Handling

```typescript
// Server side
const apiWithErrors = {
  riskyOperation: (shouldFail: boolean) => {
    if (shouldFail) {
      throw new Error('Operation failed');
    }
    return 'success';
  }
};

server.register('risky', apiWithErrors);

// Client side
const remoteRisky = client.get<typeof apiWithErrors>('risky');

try {
  await remoteRisky.riskyOperation(true);
} catch (error) {
  console.error('Remote error:', error.message); // 'Operation failed'
}
```

## 🌐 Real-World Examples

### Web Worker Communication

```typescript
// main.ts
import { WebRPC, PostMessageTransport } from '@vgerbot/web-rpc';

const worker = new Worker('./calculation-worker.js');
const transport = new PostMessageTransport(worker);
const client = new WebRPC('calculator-service', transport);

const calculator = client.get<{
  fibonacci: (n: number) => number;
  isPrime: (n: number) => boolean;
}>('calculator');

const fib10 = await calculator.fibonacci(10);
const isPrime17 = await calculator.isPrime(17);
```

```typescript
// calculation-worker.js
import { WebRPC, PostMessageTransport } from '@vgerbot/web-rpc';

const transport = new PostMessageTransport(self);
const server = new WebRPC('calculator-service', transport);

const calculatorImpl = {
  fibonacci: (n: number): number => {
    if (n <= 1) return n;
    return calculatorImpl.fibonacci(n - 1) + calculatorImpl.fibonacci(n - 2);
  },
  
  isPrime: (n: number): boolean => {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  }
};

server.register('calculator', calculatorImpl);
```

### Cross-Tab Communication

```typescript
// Tab 1 - Server
import { WebRPC, PostMessageTransport } from '@vgerbot/web-rpc';

const transport = new PostMessageTransport(new BroadcastChannel('shared-state'));
const server = new WebRPC('state-service', transport);

const stateManager = {
  state: { count: 0 },
  increment: () => ++stateManager.state.count,
  getState: () => stateManager.state
};

server.register('state', stateManager);

// Tab 2 - Client
const transport2 = new PostMessageTransport(new BroadcastChannel('shared-state'));
const client = new WebRPC('state-service', transport2);

const remoteState = client.get<typeof stateManager>('state');
await remoteState.increment(); // Updates state in tab 1
const currentState = await remoteState.getState();
```

## 🔧 API Reference

### WebRPC

```typescript
class WebRPC {
  constructor(
    clientId: string, 
    transport: Transport | ((data: SerializableData, transferables: Transferable[]) => void)
  )
  
  register<T>(id: string, instance: T): void
  get<T>(id: string): T
  receive(data: unknown): void  // For custom message handling
  close(): void
}
```

### Transport Interface

```typescript
interface Transport {
  send(data: SerializableData, transfer?: Transferable[]): void
  onMessage(callback: (data: SerializableData) => void): () => void
  close(): void
}
```

## 📋 Requirements

- ES2017+ environment
- TypeScript 4.0+ (for full type safety)
- Modern browser or Node.js environment

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes with conventional commits
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC License - see the [LICENSE](LICENSE) file for details.

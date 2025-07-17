export * from './core/WebRPC';
export * from './transports';
export * from './core/Transport';
export * from './core/SendFunctionTransport';

import { WebRPC } from './core/WebRPC';
import * as transports from './transports';

Object.assign(WebRPC, transports, { WebRPC });

export default WebRPC;

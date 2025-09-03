# @vgerbot/web-rpc

## 3.0.0

### Major Changes

- 999189a: Align message schema with JSON-RPC 2.0.
    - Message structure now follows JSON-RPC 2.0 terminology and semantics
        - Rename `invocationId` → `id` (string identifier)
        - Add `_webrpc` meta object; move `action` and `timestamp` into it
        - Rename `args` → `params`
        - Remove `status`; determine outcome by property existence: `'result' in message` or `'error' in message`
    - Error handling
        - `ErrorInfo.code` added with `JSONRPCErrorCode` union covering -32700, -32600..-32603, -32000..-32099 (with comments)
    - Identifier constraints
        - `clientId` and `portId` must not contain `/`

    BREAKING CHANGES
    - Schema changes: `invocationId` → `id`; `args` → `params`; `status` removed; `action`/`timestamp` moved under `_webrpc`
    - IDs must not contain `/` in their client and port segments

    IMPORTANT
    - Both ends of communication must use the same version to ensure protocol compatibility
    - This is an internal protocol change; ensure all connected clients and servers are updated together

## 2.0.1

### Patch Changes

- 5e268c5: add CDN installation support and restructure README documentation

## 2.0.0

### Major Changes

- b48bce6: Initial release of web-rpc library with complete RPC functionality

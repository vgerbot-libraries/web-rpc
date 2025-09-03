// Type for clientId and portId that cannot contain forward slashes
export type SafeId = string & { __brand: 'SafeId' };

// Helper function to validate and create SafeId
export function createSafeId(id: string): SafeId {
    if (id.includes('/')) {
        throw new Error(`ID cannot contain forward slashes: ${id}`);
    }
    return id as SafeId;
}

// Helper function to create InvocationId from validated components
export function createInvocationId(clientId: SafeId, portId: SafeId, id: string): InvocationId {
    return `${clientId}/${portId}/${id}` as InvocationId;
}

// Helper function to parse InvocationId into its components
export function parseInvocationId(invocationId: InvocationId): {
    clientId: SafeId;
    portId: SafeId;
    id: string;
} {
    const parts = invocationId.split('/');
    if (parts.length !== 3) {
        throw new Error(`Invalid InvocationId format: ${invocationId}`);
    }

    const [clientId, portId, id] = parts;

    // Validate that clientId and portId don't contain forward slashes (shouldn't happen with valid InvocationId)
    return {
        clientId: createSafeId(clientId),
        portId: createSafeId(portId),
        id,
    };
}

export type InvocationId = `${string}/${string}/${string}`;

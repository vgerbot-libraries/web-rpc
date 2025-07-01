/**
 * Test data fixtures for different data types
 */
export const testDataFixtures = {
    primitives: {
        string: 'test string',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
    },
    complexData: {
        array: [1, 2, 3, 'test', true, null],
        object: {
            nested: {
                value: 'test',
                number: 123,
                array: [1, 2, 3],
            },
            metadata: {
                timestamp: Date.now(),
                version: '1.0.0',
            },
        },
        deeplyNested: {
            level1: {
                level2: {
                    level3: {
                        level4: {
                            value: 'deep value',
                            array: [{ nested: 'object' }],
                        },
                    },
                },
            },
        },
    },
    transferables: {
        arrayBuffer: new ArrayBuffer(1024),
        uint8Array: new Uint8Array([1, 2, 3, 4, 5]),
        imageData: typeof ImageData !== 'undefined' ? new ImageData(100, 100) : null,
    },
    edgeCases: {
        emptyString: '',
        emptyArray: [],
        emptyObject: {},
        largeNumber: Number.MAX_SAFE_INTEGER,
        unicode: '🚀 Unicode test 中文 العربية',
        specialChars: '\\n\\t\\r"\'`',
    },
};

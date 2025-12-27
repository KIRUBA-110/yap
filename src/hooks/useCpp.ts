/**
 * useCpp Hook
 * 
 * React hook for executing C/C++ code using JSCPP interpreter.
 * Uses JSCPP's built-in debugger API for step-by-step execution tracing.
 */

import { useState, useCallback } from 'react';
import type { TraceResult, ExecutionFrame, SerializedValue, VariableMap } from '../types/types';

// JSCPP Debugger interface based on documentation
interface JSCPPDebugger {
    next: () => false | { v: number }; // Returns false if more to do, or exit code when done
    continue: () => false | { v: number };
    nextNode: () => { sLine: number; eLine: number; sColumn: number; eColumn: number; sOffset: number; eOffset: number } | null;
    nextLine: () => string;
    variable: (name?: string) => any; // Without args returns all variables
    type: (typeName: string) => any;
    done: boolean;
    src: string;
    prevNode: any;
}

interface JSCPPConfig {
    stdio?: {
        write?: (s: string) => void;
        drain?: () => string;
    };
    debug?: boolean;
    unsigned_overflow?: 'error' | 'warn' | 'ignore';
}

interface JSCPPModule {
    run: (code: string, input: string, config?: JSCPPConfig) => JSCPPDebugger | number;
}

// Module-level cache for JSCPP
let JSCPP: JSCPPModule | null = null;

// Lazy load JSCPP
async function loadJSCPP(): Promise<JSCPPModule> {
    if (JSCPP) return JSCPP;

    // Dynamic import for the module
    const module = await import('JSCPP');
    JSCPP = module.default || module;
    return JSCPP as JSCPPModule;
}

export interface UseCppReturn {
    isLoading: boolean;
    isReady: boolean;
    error: string | null;
    runCode: (code: string) => Promise<TraceResult>;
    frames: ExecutionFrame[] | null;
}

/**
 * Serialize a C/C++ value to our standard format
 */
function serializeValue(value: any, type: string = 'unknown'): SerializedValue {
    const id = Math.floor(Math.random() * 1000000000);

    try {
        // Handle null/undefined
        if (value === null || value === undefined) {
            return { value: null, type: 'null', id };
        }

        // Handle functions - skip them
        if (typeof value === 'function') {
            return { value: '[function]', type: 'function', id };
        }

        // Handle JSCPP runtime values (they have a 'v' property)
        if (typeof value === 'object' && value !== null && 'v' in value) {
            const actualValue = value.v;
            // Skip if the value is a function
            if (typeof actualValue === 'function') {
                return { value: '[function]', type: 'function', id };
            }
            const actualType = value.t?.name || type;
            return serializeValue(actualValue, actualType);
        }

        // Handle arrays
        if (Array.isArray(value)) {
            const items = value.map((item, idx) => {
                let itemValue = item;
                // Unwrap JSCPP value wrapper
                if (typeof item === 'object' && item !== null && 'v' in item) {
                    itemValue = item.v;
                }
                return {
                    value: itemValue,
                    type: typeof itemValue === 'number' ? (Number.isInteger(itemValue) ? 'int' : 'float') : typeof itemValue,
                    id: id + idx + 1,
                };
            });

            return {
                value: items,
                type: 'array',
                id,
                length: value.length,
            };
        }

        // Handle primitives
        if (typeof value === 'number') {
            return {
                value,
                type: Number.isInteger(value) ? 'int' : 'float',
                id,
            };
        }

        if (typeof value === 'string') {
            return {
                value,
                type: 'char*',
                id,
            };
        }

        if (typeof value === 'boolean') {
            return {
                value: value ? 1 : 0,
                type: 'bool',
                id,
            };
        }

        // Handle objects (could be structs or arrays in JSCPP)
        if (typeof value === 'object') {
            // Check if it's an array-like object
            if (value.target && Array.isArray(value.target)) {
                return serializeValue(value.target, 'array');
            }

            // Safe JSON stringify with error handling
            let jsonStr = '{}';
            try {
                jsonStr = JSON.stringify(value, (_key, val) => {
                    // Skip functions during stringify
                    if (typeof val === 'function') return '[function]';
                    return val;
                });
            } catch {
                jsonStr = '[object]';
            }

            return {
                value: jsonStr,
                type: 'struct',
                id,
            };
        }

        return {
            value: String(value),
            type: type || 'unknown',
            id,
        };
    } catch (err) {
        // Fallback for any serialization errors
        return {
            value: '[error]',
            type: 'error',
            id,
        };
    }
}

export function useCpp(): UseCppReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [isReady] = useState(true); // JSCPP is always ready (pure JS)
    const [error, setError] = useState<string | null>(null);
    const [frames, setFrames] = useState<ExecutionFrame[] | null>(null);

    const runCode = useCallback(async (code: string): Promise<TraceResult> => {
        setIsLoading(true);
        setError(null);

        const capturedFrames: ExecutionFrame[] = [];
        let stepCount = 0;
        const MAX_STEPS = 1000;
        let output = '';
        let lastLine = 0;

        try {
            const jscpp = await loadJSCPP();

            // Create debugger instance with debug mode enabled
            const result = jscpp.run(code, '', {
                debug: true,
                stdio: {
                    write: (s: string) => {
                        output += s;
                    },
                },
            });

            // If debug mode returns a debugger, use it
            if (typeof result === 'object' && result !== null && 'next' in result) {
                const debuggerInstance = result as JSCPPDebugger;

                // Step through execution
                let stepResult: false | { v: number } = false;

                do {
                    stepResult = debuggerInstance.next();
                    stepCount++;

                    if (stepCount > MAX_STEPS) {
                        break;
                    }

                    // Get current node info
                    const node = debuggerInstance.nextNode();
                    const currentLine = node ? node.sLine : lastLine;
                    if (node) lastLine = node.sLine;

                    // Capture all variables
                    const variables: VariableMap = {};

                    // C standard library functions to exclude
                    const STDLIB_FUNCTIONS = new Set([
                        'printf', 'sprintf', 'fprintf', 'snprintf',
                        'scanf', 'sscanf', 'fscanf',
                        'getchar', 'putchar', 'gets', 'puts',
                        'malloc', 'calloc', 'realloc', 'free',
                        'strlen', 'strcpy', 'strcat', 'strcmp', 'strncpy',
                        'memset', 'memcpy', 'memmove',
                        'abs', 'sqrt', 'pow', 'floor', 'ceil',
                        'rand', 'srand', 'exit', 'atoi', 'atof',
                        'cout', 'cin', 'endl', 'cerr', 'clog',
                        'std', 'using', 'namespace'
                    ]);

                    /**
                     * Check if a JSCPP variable is a function (not a user variable)
                     */
                    const isFunction = (varData: any): boolean => {
                        if (!varData || typeof varData !== 'object') return false;

                        // Check if it has a 'v' property that is a function
                        if ('v' in varData && typeof varData.v === 'function') return true;

                        // Check if it's a function wrapper with 'name' property
                        if ('name' in varData && typeof varData.name === 'string') {
                            // It's likely a C stdlib function like {name: "printf"}
                            return true;
                        }

                        // Check the type info
                        if ('t' in varData && varData.t) {
                            const typeInfo = varData.t;
                            if (typeInfo.type === 'function' || typeInfo.name?.includes('function')) {
                                return true;
                            }
                        }

                        return false;
                    };

                    try {
                        const allVars = debuggerInstance.variable();

                        if (allVars && typeof allVars === 'object') {
                            for (const [name, varData] of Object.entries(allVars)) {
                                // Skip internal variables and C standard library functions
                                if (name.startsWith('_') || name === 'this') continue;
                                if (STDLIB_FUNCTIONS.has(name)) continue;

                                // Skip functions
                                if (isFunction(varData)) continue;

                                try {
                                    const serialized = serializeValue(varData);

                                    // Skip if it serialized to an empty or function-like struct
                                    if (serialized.type === 'struct' && typeof serialized.value === 'string') {
                                        const strValue = serialized.value;
                                        if (strValue.includes('function') ||
                                            strValue === '{}' ||
                                            strValue.includes('"name"')) {
                                            continue;
                                        }
                                    }

                                    // Skip null/undefined values
                                    if (serialized.type === 'null') continue;

                                    variables[name] = serialized;
                                } catch {
                                    // Skip problematic variables
                                }
                            }
                        }
                    } catch {
                        // Variable access failed, continue without variables
                    }

                    // Only add frame if we have meaningful data
                    if (currentLine > 0 || Object.keys(variables).length > 0) {
                        capturedFrames.push({
                            step: stepCount,
                            line: currentLine,
                            event: 'line',
                            function: 'main',
                            depth: 1,
                            variables,
                        });
                    }

                } while (stepResult === false && !debuggerInstance.done);

                // Add final frame with output if any
                if (output) {
                    capturedFrames.push({
                        step: stepCount + 1,
                        line: 0,
                        event: 'return',
                        function: 'main',
                        depth: 0,
                        variables: {},
                        return_value: {
                            value: output.trim(),
                            type: 'stdout',
                            id: 0,
                        },
                    });
                }
            } else {
                // Debug mode not available, just run normally
                return {
                    success: false,
                    error: 'Debug mode is not available. Check JSCPP configuration.',
                    frames: [],
                };
            }

            setFrames(capturedFrames);

            return {
                success: true,
                error: null,
                frames: capturedFrames,
            };

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error running C code';
            setError(errorMessage);
            setFrames(capturedFrames);

            return {
                success: false,
                error: errorMessage,
                frames: capturedFrames,
            };

        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        isReady,
        error,
        runCode,
        frames,
    };
}

export default useCpp;

/**
 * usePyodide Hook
 * 
 * React hook for initializing Pyodide and running Python code with tracing.
 * Handles:
 * - Loading Pyodide from CDN
 * - Injecting the tracer script
 * - Executing user code and returning execution frames
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TRACER_SCRIPT } from '../python/tracerScript';
import type { TraceResult, ExecutionFrame } from '../types/types';

// Pyodide CDN URL - using a stable version
const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/';

// Type for the Pyodide instance
interface PyodideInstance {
    runPython: (code: string) => any;
    runPythonAsync: (code: string) => Promise<any>;
    loadPackage: (packages: string | string[]) => Promise<void>;
    globals: any;
}

// Extend window to include loadPyodide
declare global {
    interface Window {
        loadPyodide: (config: { indexURL: string }) => Promise<PyodideInstance>;
    }
}

export interface UsePyodideReturn {
    /** Whether Pyodide is currently loading */
    isLoading: boolean;
    /** Whether Pyodide is ready to execute code */
    isReady: boolean;
    /** Error message if initialization or execution failed */
    error: string | null;
    /** Execute Python code and return execution trace */
    runCode: (code: string) => Promise<TraceResult>;
    /** Current execution frames (null if not run yet) */
    frames: ExecutionFrame[] | null;
    /** Re-initialize Pyodide if needed */
    reinitialize: () => Promise<void>;
}

/**
 * Load the Pyodide script from CDN
 */
function loadPyodideScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.loadPyodide) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `${PYODIDE_CDN}pyodide.js`;
        script.async = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide script'));

        document.head.appendChild(script);
    });
}

export function usePyodide(): UsePyodideReturn {
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [frames, setFrames] = useState<ExecutionFrame[] | null>(null);

    // Store Pyodide instance in a ref to persist across renders
    const pyodideRef = useRef<PyodideInstance | null>(null);
    const initializingRef = useRef(false);

    /**
     * Initialize Pyodide
     */
    const initialize = useCallback(async () => {
        // Prevent multiple initializations
        if (initializingRef.current || pyodideRef.current) {
            return;
        }

        initializingRef.current = true;
        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Load the Pyodide script
            await loadPyodideScript();

            // Step 2: Initialize Pyodide
            const pyodide = await window.loadPyodide({
                indexURL: PYODIDE_CDN,
            });

            // Step 3: Inject the tracer script into Pyodide
            pyodide.runPython(TRACER_SCRIPT);

            // Store the instance
            pyodideRef.current = pyodide;
            setIsReady(true);

            console.log('✅ Pyodide initialized successfully');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error initializing Pyodide';
            setError(errorMessage);
            console.error('❌ Failed to initialize Pyodide:', err);
        } finally {
            setIsLoading(false);
            initializingRef.current = false;
        }
    }, []);

    /**
     * Run user code with tracing
     */
    const runCode = useCallback(async (code: string): Promise<TraceResult> => {
        if (!pyodideRef.current) {
            return {
                success: false,
                error: 'Pyodide is not initialized',
                frames: [],
            };
        }

        try {
            // Escape the code for Python string
            const escapedCode = code
                .replace(/\\/g, '\\\\')
                .replace(/"""/g, '\\"\\"\\"')
                .replace(/\n/g, '\\n');

            // Call the trace_code function with the user's code
            const pythonCall = `trace_code("""${escapedCode}""")`;
            const resultJson = pyodideRef.current.runPython(pythonCall);

            // Parse the JSON result
            const result: TraceResult = JSON.parse(resultJson);

            // Store frames in state
            setFrames(result.frames);

            return result;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error running code';
            return {
                success: false,
                error: errorMessage,
                frames: [],
            };
        }
    }, []);

    /**
     * Re-initialize Pyodide (useful after errors)
     */
    const reinitialize = useCallback(async () => {
        pyodideRef.current = null;
        initializingRef.current = false;
        setIsReady(false);
        setFrames(null);
        await initialize();
    }, [initialize]);

    // Initialize on mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    return {
        isLoading,
        isReady,
        error,
        runCode,
        frames,
        reinitialize,
    };
}

export default usePyodide;

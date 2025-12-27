/**
 * useCodeRunner Hook
 * 
 * Unified hook for running code in multiple languages.
 * Routes execution to the appropriate engine based on language selection.
 */

import { useMemo } from 'react';
import { usePyodide } from './usePyodide';
import { useCpp } from './useCpp';
import type { TraceResult, ExecutionFrame } from '../types/types';

export type Language = 'python' | 'c';

export interface UseCodeRunnerReturn {
    /** Whether any engine is loading */
    isLoading: boolean;
    /** Engine readiness status by language */
    engineStatus: {
        python: { isLoading: boolean; isReady: boolean; error: string | null };
        c: { isLoading: boolean; isReady: boolean; error: string | null };
    };
    /** Execute code in the specified language */
    runCode: (code: string, language: Language) => Promise<TraceResult>;
    /** Current execution frames */
    frames: ExecutionFrame[] | null;
}

export function useCodeRunner(): UseCodeRunnerReturn {
    const pyodide = usePyodide();
    const cpp = useCpp();

    const engineStatus = useMemo(() => ({
        python: {
            isLoading: pyodide.isLoading,
            isReady: pyodide.isReady,
            error: pyodide.error,
        },
        c: {
            isLoading: cpp.isLoading,
            isReady: cpp.isReady,
            error: cpp.error,
        },
    }), [pyodide.isLoading, pyodide.isReady, pyodide.error, cpp.isLoading, cpp.isReady, cpp.error]);

    const runCode = async (code: string, language: Language): Promise<TraceResult> => {
        if (language === 'python') {
            if (!pyodide.isReady) {
                return {
                    success: false,
                    error: 'Python engine (Pyodide) is not ready yet. Please wait...',
                    frames: [],
                };
            }
            return pyodide.runCode(code);
        } else {
            return cpp.runCode(code);
        }
    };

    // Return frames from whichever engine was last used
    const frames = pyodide.frames || cpp.frames;

    return {
        isLoading: pyodide.isLoading || cpp.isLoading,
        engineStatus,
        runCode,
        frames,
    };
}

export default useCodeRunner;

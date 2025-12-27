/**
 * Type Definitions for the Code Visualization Tool
 * 
 * These interfaces define the structure of execution frames
 * captured by the Python tracer.
 */

/**
 * Represents a serialized variable value from Python
 */
export interface SerializedValue {
    value: any;
    type: string;
    id: number;
    length?: number;      // For collections (list, dict, set)
    truncated?: boolean;  // True if value was truncated
}

/**
 * Variables captured at a single execution step
 * Maps variable names to their serialized values
 */
export type VariableMap = Record<string, SerializedValue>;

/**
 * Represents exception information when an error occurs
 */
export interface ExceptionInfo {
    type: string;
    message: string;
}

/**
 * A single frame in the execution trace
 */
export interface ExecutionFrame {
    step: number;           // Sequential step number (1-indexed)
    line: number;           // Line number in the user's code
    event: 'call' | 'line' | 'return' | 'exception';
    function: string;       // Name of the current function
    depth: number;          // Call stack depth
    variables: VariableMap; // Local variables at this step
    return_value?: SerializedValue;  // Present on 'return' events
    exception?: ExceptionInfo;        // Present on 'exception' events
}

/**
 * The complete result from tracing code execution
 */
export interface TraceResult {
    success: boolean;
    error: string | null;
    frames: ExecutionFrame[];
}

/**
 * State for the execution timeline (for Zustand store)
 */
export interface TimelineState {
    frames: ExecutionFrame[];
    currentStep: number;
    isPlaying: boolean;
    playbackSpeed: number; // ms between steps
}

/**
 * Actions for the timeline store
 */
export interface TimelineActions {
    setFrames: (frames: ExecutionFrame[]) => void;
    goToStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    goToStart: () => void;
    goToEnd: () => void;
    play: () => void;
    pause: () => void;
    setPlaybackSpeed: (speed: number) => void;
    reset: () => void;
}

/**
 * Complete timeline store type
 */
export type TimelineStore = TimelineState & TimelineActions;

/**
 * Props for the variable visualizer component
 */
export interface VariableVisualizerProps {
    variables: VariableMap;
    previousVariables?: VariableMap; // For highlighting changes
}

/**
 * Props for rendering a single variable
 */
export interface SingleVariableProps {
    name: string;
    value: SerializedValue;
    previousValue?: SerializedValue;
    isPointer?: boolean;           // Is this an index variable?
    pointsToArray?: string;        // Name of array it points to
    pointsToIndex?: number;        // Index in that array
}

/**
 * Props for rendering an array/list
 */
export interface ArrayVisualizerProps {
    name: string;
    value: SerializedValue;
    previousValue?: SerializedValue;
    pointers?: Array<{
        name: string;
        index: number;
        color: string;
    }>;
}

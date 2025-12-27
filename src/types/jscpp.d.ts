// Type declarations for JSCPP module
declare module 'JSCPP' {
    interface JSCPPDebugger {
        next: () => boolean;
        nextLine: () => number;
        nextNode: () => any;
        variable: (name: string) => { v: any; t: any } | undefined;
        type: (name: string) => string | undefined;
        src: () => string;
    }

    interface JSCPPConfig {
        debug?: boolean;
        stdio?: {
            write?: (s: string) => void;
            drain?: () => string;
        };
    }

    interface JSCPP {
        run(code: string, input: string, config?: JSCPPConfig): JSCPPDebugger | any;
    }

    const JSCPP: JSCPP;
    export default JSCPP;
}

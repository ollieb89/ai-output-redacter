export type Severity = 'critical' | 'high' | 'medium' | 'low';
export interface Pattern {
    name: string;
    description: string;
    regex: RegExp;
    severity: Severity;
    luhnCheck?: boolean;
}
export declare const BUILTIN_PATTERNS: Pattern[];
export declare function getPatternByName(name: string): Pattern | undefined;
export declare function getPatternsBySeverity(severity: Severity): Pattern[];

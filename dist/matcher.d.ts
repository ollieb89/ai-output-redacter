import { Pattern, Severity } from './patterns/builtin';
export interface Match {
    rule: string;
    severity: Severity;
    line: number;
    column: number;
    length: number;
    maskedPreview: string;
}
export interface MatchResult {
    source: string;
    matches: Match[];
}
/**
 * Build a safe masked preview — NEVER expose the raw value.
 * Format: first 6 chars + *** + [N chars remaining]
 */
export declare function maskValue(value: string): string;
/** Luhn check for credit card validation */
export declare function luhnCheck(num: string): boolean;
export declare function matchPattern(text: string, pattern: Pattern): Match[];
export declare function matchAll(text: string, patterns: Pattern[]): Match[];
export declare function matchText(text: string, patterns: Pattern[], source?: string): MatchResult;

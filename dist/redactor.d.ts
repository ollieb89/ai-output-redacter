import { Pattern } from './patterns/builtin';
export interface RedactResult {
    original: string;
    redacted: string;
    count: number;
}
export declare function redactText(text: string, patterns: Pattern[]): RedactResult;
export declare function countRedactions(text: string, patterns: Pattern[]): number;
/**
 * Safe output only — returns the redacted string, never the original.
 */
export declare function safeRedact(text: string, patterns: Pattern[]): string;

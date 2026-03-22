import { Severity, Pattern } from './patterns/builtin';
export type Mode = 'report' | 'redact' | 'enforce';
export type FailOn = 'any' | 'high' | 'none';
export interface CustomRule {
    name: string;
    pattern: string;
    severity: Severity;
    description?: string;
}
export interface RedacterConfig {
    mode: Mode;
    failOn: FailOn;
    scanPaths: string[];
    ignorePaths: string[];
    customRules: CustomRule[];
    disabledRules: string[];
}
export declare const DEFAULT_CONFIG: RedacterConfig;
export declare function parseConfig(raw: Record<string, unknown>): RedacterConfig;
export declare function loadConfig(configPath: string): RedacterConfig;
export declare function buildPatternsFromConfig(config: RedacterConfig, builtins: Pattern[]): Pattern[];
export declare function shouldFail(config: RedacterConfig, matches: Array<{
    severity: Severity;
}>): boolean;

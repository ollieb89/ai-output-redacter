import { Match } from './matcher';
import { ScanSummary } from './scanner';
export interface ReportOptions {
    mode: string;
    scanPaths: string[];
}
export interface JsonReport {
    timestamp: string;
    mode: string;
    violationsFound: boolean;
    violationCount: number;
    rulesTriggered: string[];
    results: Array<{
        source: string;
        count: number;
        matches: Array<{
            rule: string;
            severity: string;
            line: number;
            column: number;
            maskedPreview: string;
        }>;
    }>;
}
/**
 * Safe line format — NEVER echoes raw matched content.
 * Format: ⚠️  rule-name  →  file.txt:L12  →  sk-ant-***[18 chars]
 */
export declare function formatMatchLine(match: Match, source: string): string;
export declare function formatTextReport(summary: ScanSummary, opts: ReportOptions): string;
export declare function formatMarkdownReport(summary: ScanSummary, opts: ReportOptions): string;
export declare function buildJsonReport(summary: ScanSummary, opts: ReportOptions): JsonReport;

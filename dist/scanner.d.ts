import { Pattern } from './patterns/builtin';
import { MatchResult } from './matcher';
export interface ScanOptions {
    patterns: Pattern[];
    ignorePaths?: string[];
    maxFileSizeBytes?: number;
}
export interface ScanSummary {
    filesScanned: number;
    totalMatches: number;
    results: MatchResult[];
    errors: string[];
}
export declare function shouldIgnore(filePath: string, ignorePaths: string[]): boolean;
export declare function scanFile(filePath: string, opts: ScanOptions): MatchResult | null;
export declare function scanDirectory(dirPath: string, opts: ScanOptions): ScanSummary;
export declare function scanText(text: string, patterns: Pattern[], source?: string): MatchResult;

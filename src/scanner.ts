import * as fs from 'fs';
import * as path from 'path';
import { Pattern } from './patterns/builtin';
import { matchText, MatchResult } from './matcher';

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

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico',
  '.zip', '.gz', '.tar', '.tgz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.woff', '.woff2', '.ttf', '.eot',
  '.lock', '.map',
]);

export function shouldIgnore(filePath: string, ignorePaths: string[]): boolean {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (BINARY_EXTENSIONS.has(ext)) return true;
  if (basename === 'node_modules' || filePath.includes('/node_modules/')) return true;
  if (basename === '.git' || filePath.includes('/.git/')) return true;
  if (basename === 'dist' || filePath.includes('/dist/')) return true;

  for (const pattern of ignorePaths) {
    if (filePath.includes(pattern) || basename === pattern) return true;
    if (pattern.startsWith('*.') && filePath.endsWith(pattern.slice(1))) return true;
  }

  return false;
}

export function scanFile(filePath: string, opts: ScanOptions): MatchResult | null {
  if (shouldIgnore(filePath, opts.ignorePaths ?? [])) return null;

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    if (stat.size > (opts.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE)) return null;

    const content = fs.readFileSync(filePath, 'utf8');
    return matchText(content, opts.patterns, filePath);
  } catch {
    return null;
  }
}

export function scanDirectory(dirPath: string, opts: ScanOptions): ScanSummary {
  const results: MatchResult[] = [];
  const errors: string[] = [];
  let filesScanned = 0;

  if (!fs.existsSync(dirPath)) {
    return { filesScanned: 0, totalMatches: 0, results: [], errors: ['Directory not found: ' + dirPath] };
  }

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      errors.push('Cannot read dir: ' + dir);
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (shouldIgnore(full, opts.ignorePaths ?? [])) continue;
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const result = scanFile(full, opts);
        if (result) {
          filesScanned++;
          if (result.matches.length > 0) results.push(result);
        }
      }
    }
  }

  walk(dirPath);

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
  return { filesScanned, totalMatches, results, errors };
}

export function scanText(text: string, patterns: Pattern[], source = 'stdin'): MatchResult {
  return matchText(text, patterns, source);
}

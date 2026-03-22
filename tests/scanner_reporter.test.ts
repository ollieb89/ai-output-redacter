import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { shouldIgnore, scanFile, scanDirectory, scanText } from '../src/scanner';
import { formatMatchLine, formatTextReport, formatMarkdownReport, buildJsonReport } from '../src/reporter';
import { maskValue, luhnCheck } from '../src/matcher';
import { BUILTIN_PATTERNS } from '../src/patterns/builtin';

function tmpDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aor-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

describe('maskValue', () => {
  it('masks long values with first 6 chars + ***', () => {
    const masked = maskValue('sk-ant-api03-abcdefghijklmnopqrstuvwxyz');
    expect(masked).toContain('sk-ant');
    expect(masked).toContain('***');
    expect(masked).not.toContain('abcdefghijklmnopqrstuvwxyz');
  });

  it('handles short values (all masked)', () => {
    const masked = maskValue('abc');
    expect(masked).toContain('[3 chars]');
    expect(masked).not.toContain('abc');
  });
});

describe('luhnCheck', () => {
  it('passes valid Luhn number', () => {
    expect(luhnCheck('4111111111111111')).toBe(true);
  });
  it('fails invalid Luhn number', () => {
    expect(luhnCheck('4111111111111112')).toBe(false);
  });
  it('fails short numbers', () => {
    expect(luhnCheck('12345')).toBe(false);
  });
});

describe('shouldIgnore', () => {
  it('ignores binary file extensions', () => {
    expect(shouldIgnore('/path/to/image.png', [])).toBe(true);
    expect(shouldIgnore('/path/to/archive.zip', [])).toBe(true);
  });

  it('ignores node_modules', () => {
    expect(shouldIgnore('/project/node_modules/module/index.js', [])).toBe(true);
  });

  it('ignores .git directory', () => {
    expect(shouldIgnore('/project/.git/config', [])).toBe(true);
  });

  it('does not ignore regular source files', () => {
    expect(shouldIgnore('/project/src/index.ts', [])).toBe(false);
  });

  it('respects custom ignore paths', () => {
    expect(shouldIgnore('/project/test.ts', ['test.ts'])).toBe(true);
  });

  it('respects wildcard ignore', () => {
    expect(shouldIgnore('/project/file.log', ['*.log'])).toBe(true);
  });
});

describe('scanText', () => {
  const patterns = [BUILTIN_PATTERNS.find(p => p.name === 'pii-email')!];

  it('returns matches from text with sensitive data', () => {
    const result = scanText('Contact: user@example.com', patterns, 'stdin');
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.source).toBe('stdin');
  });

  it('returns no matches for clean text', () => {
    const result = scanText('hello world', patterns, 'stdin');
    expect(result.matches).toHaveLength(0);
  });
});

describe('scanFile', () => {
  it('returns null for ignored file', () => {
    const dir = tmpDir({ 'test.png': 'fake png data' });
    const result = scanFile(path.join(dir, 'test.png'), { patterns: BUILTIN_PATTERNS });
    expect(result).toBeNull();
  });

  it('scans a clean file and returns empty matches', () => {
    const dir = tmpDir({ 'readme.md': '# Hello World\nThis is a clean file.' });
    const result = scanFile(path.join(dir, 'readme.md'), { patterns: BUILTIN_PATTERNS });
    expect(result).not.toBeNull();
    expect(result!.matches).toHaveLength(0);
  });
});

describe('scanDirectory', () => {
  it('returns error when directory not found', () => {
    const result = scanDirectory('/nonexistent/path', { patterns: BUILTIN_PATTERNS });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('scans clean directory with no matches', () => {
    const dir = tmpDir({
      'readme.md': '# Clean project',
      'config.yml': 'mode: production\nversion: 1.0',
    });
    const result = scanDirectory(dir, { patterns: BUILTIN_PATTERNS });
    expect(result.filesScanned).toBeGreaterThan(0);
    expect(result.totalMatches).toBe(0);
  });
});

describe('reporter', () => {
  const emptyMatch = { rule: 'pii-email', severity: 'medium' as const, line: 5, column: 10, length: 20, maskedPreview: 'user@e***[12 chars]' };
  const summary = { filesScanned: 3, totalMatches: 1, results: [{ source: 'test.txt', matches: [emptyMatch] }], errors: [] };
  const emptySummary = { filesScanned: 5, totalMatches: 0, results: [], errors: [] };
  const opts = { mode: 'report', scanPaths: ['.'] };

  it('formatMatchLine never exposes raw value', () => {
    const line = formatMatchLine(emptyMatch, 'test.txt');
    expect(line).toContain('pii-email');
    expect(line).toContain('L5');
    // maskedPreview is included but raw is not
    expect(line).not.toContain('user@example.com');
    expect(line).toContain('user@e***');
  });

  it('formatTextReport shows correct stats', () => {
    const text = formatTextReport(summary, opts);
    expect(text).toContain('Files scanned: 3');
    expect(text).toContain('Total violations: 1');
  });

  it('formatTextReport clean summary shows no violations', () => {
    const text = formatTextReport(emptySummary, opts);
    expect(text).toContain('No violations found');
  });

  it('formatMarkdownReport shows violations table', () => {
    const md = formatMarkdownReport(summary, opts);
    expect(md).toContain('Violations');
    expect(md).toContain('pii-email');
    expect(md).toContain('user@e***');
  });

  it('formatMarkdownReport shows clean result when no violations', () => {
    const md = formatMarkdownReport(emptySummary, opts);
    expect(md).toContain('No sensitive patterns detected');
  });

  it('buildJsonReport includes all required fields', () => {
    const report = buildJsonReport(summary, opts);
    expect(report.violationsFound).toBe(true);
    expect(report.violationCount).toBe(1);
    expect(report.rulesTriggered).toContain('pii-email');
    expect(report.results[0].matches[0].maskedPreview).toBeTruthy();
  });

  it('buildJsonReport never includes raw matched values', () => {
    const report = buildJsonReport(summary, opts);
    const asJson = JSON.stringify(report);
    // The JSON report should not contain the fake sensitive value we created
    expect(asJson).not.toContain('user@example.com');
  });
});

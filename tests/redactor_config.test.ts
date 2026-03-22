import { redactText, safeRedact, countRedactions } from '../src/redactor';
import { parseConfig, loadConfig, buildPatternsFromConfig, shouldFail, DEFAULT_CONFIG } from '../src/config';
import { BUILTIN_PATTERNS } from '../src/patterns/builtin';
import * as path from 'path';

describe('redactText', () => {
  const emailPattern = BUILTIN_PATTERNS.find(p => p.name === 'pii-email')!;

  it('replaces matches with [REDACTED:rule-name]', () => {
    const result = redactText('Email: user@example.com in the text', [emailPattern]);
    expect(result.redacted).toContain('[REDACTED:pii-email]');
    expect(result.count).toBe(1);
  });

  it('does not modify text with no matches', () => {
    const result = redactText('no sensitive data here', [emailPattern]);
    expect(result.count).toBe(0);
    expect(result.redacted).toBe('no sensitive data here');
  });

  it('redacts multiple matches', () => {
    const result = redactText('a@b.com and c@d.com', [emailPattern]);
    expect(result.count).toBe(2);
    expect(result.redacted).not.toContain('@');
  });

  it('safeRedact returns redacted string only', () => {
    const redacted = safeRedact('user@example.com', [emailPattern]);
    expect(redacted).toBe('[REDACTED:pii-email]');
  });

  it('countRedactions returns correct count', () => {
    expect(countRedactions('a@b.com x@y.com', [emailPattern])).toBe(2);
  });

  it('applies Luhn check for credit cards — rejects invalid', () => {
    const ccPattern = BUILTIN_PATTERNS.find(p => p.name === 'credit-card')!;
    // 4111111111111112 fails Luhn — should NOT be redacted
    const result = redactText('4111111111111112', [ccPattern]);
    expect(result.count).toBe(0);
  });

  it('applies Luhn check for credit cards — passes valid', () => {
    const ccPattern = BUILTIN_PATTERNS.find(p => p.name === 'credit-card')!;
    const result = redactText('4111111111111111', [ccPattern]);
    expect(result.count).toBe(1);
    expect(result.redacted).toContain('[REDACTED:credit-card]');
  });
});

describe('parseConfig', () => {
  it('defaults to report mode', () => {
    expect(parseConfig({}).mode).toBe('report');
  });

  it('parses mode', () => {
    expect(parseConfig({ mode: 'enforce' }).mode).toBe('enforce');
    expect(parseConfig({ mode: 'redact' }).mode).toBe('redact');
  });

  it('defaults invalid mode to report', () => {
    expect(parseConfig({ mode: 'skynet' }).mode).toBe('report');
  });

  it('parses fail-on', () => {
    expect(parseConfig({ 'fail-on': 'high' }).failOn).toBe('high');
    expect(parseConfig({ 'fail-on': 'none' }).failOn).toBe('none');
  });

  it('parses scan-paths', () => {
    expect(parseConfig({ 'scan-paths': ['src/', 'logs/'] }).scanPaths).toContain('src/');
  });

  it('parses ignore-paths', () => {
    expect(parseConfig({ 'ignore-paths': ['*.test.ts'] }).ignorePaths).toContain('*.test.ts');
  });

  it('parses custom-rules', () => {
    const cfg = parseConfig({
      'custom-rules': [{ name: 'my-rule', pattern: 'SECRET-[0-9]+', severity: 'high' }]
    });
    expect(cfg.customRules).toHaveLength(1);
    expect(cfg.customRules[0].name).toBe('my-rule');
    expect(cfg.customRules[0].severity).toBe('high');
  });

  it('skips custom rules with invalid regex', () => {
    // invalid regex won't throw — handled in buildPatternsFromConfig
    const cfg = parseConfig({ 'custom-rules': [{ name: 'bad', pattern: '[invalid', severity: 'low' }] });
    expect(cfg.customRules).toHaveLength(1);
  });

  it('parses disabled-rules', () => {
    expect(parseConfig({ 'disabled-rules': ['pii-email'] }).disabledRules).toContain('pii-email');
  });
});

describe('buildPatternsFromConfig', () => {
  it('includes all builtins by default', () => {
    const cfg = parseConfig({});
    const patterns = buildPatternsFromConfig(cfg, BUILTIN_PATTERNS);
    expect(patterns.length).toBe(BUILTIN_PATTERNS.length);
  });

  it('excludes disabled rules', () => {
    const cfg = parseConfig({ 'disabled-rules': ['pii-email', 'pii-phone'] });
    const patterns = buildPatternsFromConfig(cfg, BUILTIN_PATTERNS);
    expect(patterns.find(p => p.name === 'pii-email')).toBeUndefined();
    expect(patterns.find(p => p.name === 'pii-phone')).toBeUndefined();
  });

  it('adds custom rules', () => {
    const cfg = parseConfig({ 'custom-rules': [{ name: 'my-id', pattern: 'ID-[0-9]+', severity: 'medium' }] });
    const patterns = buildPatternsFromConfig(cfg, BUILTIN_PATTERNS);
    expect(patterns.find(p => p.name === 'my-id')).toBeTruthy();
  });

  it('skips custom rules with invalid regex', () => {
    const cfg = parseConfig({ 'custom-rules': [{ name: 'broken', pattern: '[[[', severity: 'low' }] });
    const patterns = buildPatternsFromConfig(cfg, BUILTIN_PATTERNS);
    expect(patterns.find(p => p.name === 'broken')).toBeUndefined();
  });
});

describe('shouldFail', () => {
  it('does not fail in report mode', () => {
    const cfg = { ...DEFAULT_CONFIG, mode: 'report' as const };
    expect(shouldFail(cfg, [{ severity: 'critical' as const }])).toBe(false);
  });

  it('fails in enforce mode with any matches when fail-on=any', () => {
    const cfg = { ...DEFAULT_CONFIG, mode: 'enforce' as const, failOn: 'any' as const };
    expect(shouldFail(cfg, [{ severity: 'low' as const }])).toBe(true);
  });

  it('does not fail with no matches even in enforce mode', () => {
    const cfg = { ...DEFAULT_CONFIG, mode: 'enforce' as const, failOn: 'any' as const };
    expect(shouldFail(cfg, [])).toBe(false);
  });

  it('fails in enforce mode when high/critical found and fail-on=high', () => {
    const cfg = { ...DEFAULT_CONFIG, mode: 'enforce' as const, failOn: 'high' as const };
    expect(shouldFail(cfg, [{ severity: 'critical' as const }])).toBe(true);
    expect(shouldFail(cfg, [{ severity: 'high' as const }])).toBe(true);
  });

  it('does not fail in enforce mode for medium/low when fail-on=high', () => {
    const cfg = { ...DEFAULT_CONFIG, mode: 'enforce' as const, failOn: 'high' as const };
    expect(shouldFail(cfg, [{ severity: 'medium' as const }])).toBe(false);
    expect(shouldFail(cfg, [{ severity: 'low' as const }])).toBe(false);
  });

  it('never fails when fail-on=none', () => {
    const cfg = { ...DEFAULT_CONFIG, mode: 'enforce' as const, failOn: 'none' as const };
    expect(shouldFail(cfg, [{ severity: 'critical' as const }])).toBe(false);
  });
});

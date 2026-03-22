import * as fs from 'fs';
import * as yaml from 'js-yaml';
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

export const DEFAULT_CONFIG: RedacterConfig = {
  mode: 'report',
  failOn: 'any',
  scanPaths: ['.'],
  ignorePaths: [],
  customRules: [],
  disabledRules: [],
};

export function parseConfig(raw: Record<string, unknown>): RedacterConfig {
  const validModes: Mode[] = ['report', 'redact', 'enforce'];
  const validFailOn: FailOn[] = ['any', 'high', 'none'];
  const validSeverities: Severity[] = ['critical', 'high', 'medium', 'low'];

  const mode = validModes.includes(raw.mode as Mode) ? raw.mode as Mode : 'report';
  const failOn = validFailOn.includes(raw['fail-on'] as FailOn) ? raw['fail-on'] as FailOn : 'any';

  const scanPaths = Array.isArray(raw['scan-paths']) ? raw['scan-paths'] as string[] : ['.'];
  const ignorePaths = Array.isArray(raw['ignore-paths']) ? raw['ignore-paths'] as string[] : [];
  const disabledRules = Array.isArray(raw['disabled-rules']) ? raw['disabled-rules'] as string[] : [];

  const customRules: CustomRule[] = [];
  if (Array.isArray(raw['custom-rules'])) {
    for (const r of raw['custom-rules'] as Record<string, unknown>[]) {
      if (typeof r.name === 'string' && typeof r.pattern === 'string') {
        customRules.push({
          name: r.name,
          pattern: r.pattern,
          severity: validSeverities.includes(r.severity as Severity) ? r.severity as Severity : 'medium',
          description: typeof r.description === 'string' ? r.description : undefined,
        });
      }
    }
  }

  return { mode, failOn, scanPaths, ignorePaths, customRules, disabledRules };
}

export function loadConfig(configPath: string): RedacterConfig {
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };
  try {
    const raw = yaml.load(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>;
    return parseConfig(raw);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function buildPatternsFromConfig(config: RedacterConfig, builtins: Pattern[]): Pattern[] {
  const active = builtins.filter(p => !config.disabledRules.includes(p.name));

  for (const rule of config.customRules) {
    try {
      active.push({
        name: rule.name,
        description: rule.description ?? rule.name,
        regex: new RegExp(rule.pattern, 'g'),
        severity: rule.severity,
      });
    } catch { /* skip invalid regex */ }
  }

  return active;
}

export function shouldFail(config: RedacterConfig, matches: Array<{ severity: Severity }>): boolean {
  if (config.mode !== 'enforce') return false;
  if (config.failOn === 'none') return false;
  if (config.failOn === 'any') return matches.length > 0;
  if (config.failOn === 'high') {
    return matches.some(m => m.severity === 'critical' || m.severity === 'high');
  }
  return false;
}

#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { BUILTIN_PATTERNS } from '../patterns/builtin';
import { loadConfig, buildPatternsFromConfig, parseConfig, shouldFail, DEFAULT_CONFIG } from '../config';
import { scanDirectory, scanText } from '../scanner';
import { redactText } from '../redactor';
import { buildJsonReport, formatMarkdownReport, formatTextReport } from '../reporter';

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { args[key] = true; }
      else { args[key] = next; i++; }
    } else if (!arg.startsWith('-')) {
      args._path = arg;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log('ai-output-redacter [path]\n\nOptions:\n  --mode <report|redact|enforce>\n  --fail-on <any|high|none>\n  --config <path>\n  --format <text|markdown>\n  --help');
    process.exit(0);
  }

  const scanPath = typeof args._path === 'string' ? args._path : '.';
  const configPath = typeof args.config === 'string' ? args.config : '.ai-output-redacter.yml';
  const config = loadConfig(configPath);
  if (typeof args.mode === 'string') config.mode = args.mode as typeof config.mode;
  if (typeof args['fail-on'] === 'string') config.failOn = args['fail-on'] as typeof config.failOn;

  const patterns = buildPatternsFromConfig(config, BUILTIN_PATTERNS);
  const summary = scanDirectory(scanPath, { patterns, ignorePaths: config.ignorePaths });

  if (config.mode === 'redact') {
    for (const result of summary.results) {
      if (!fs.existsSync(result.source)) continue;
      const content = fs.readFileSync(result.source, 'utf8');
      const { redacted } = redactText(content, patterns);
      fs.writeFileSync(result.source, redacted);
    }
  }

  const opts = { mode: config.mode, scanPaths: [scanPath] };
  const format = typeof args.format === 'string' ? args.format : 'text';
  if (format === 'markdown') console.log(formatMarkdownReport(summary, opts));
  else console.log(formatTextReport(summary, opts));

  const allMatches = summary.results.flatMap(r => r.matches);
  if (shouldFail(config, allMatches)) {
    console.error('\n✗ ' + summary.totalMatches + ' violation(s) found');
    process.exit(1);
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(2); });

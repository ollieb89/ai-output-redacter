import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { BUILTIN_PATTERNS } from './patterns/builtin';
import { loadConfig, buildPatternsFromConfig, shouldFail } from './config';
import { scanDirectory, scanText, ScanSummary } from './scanner';
import { redactText } from './redactor';
import { buildJsonReport, formatMarkdownReport, formatTextReport } from './reporter';

async function run(): Promise<void> {
  try {
    const scanPathsInput = core.getInput('scan-paths') || '.';
    const configPath = core.getInput('config-path') || '.ai-output-redacter.yml';
    const modeInput = core.getInput('mode') || 'report';
    const scanStdin = core.getBooleanInput('scan-stdin');
    const ignorePathsInput = core.getInput('ignore-paths');

    const config = loadConfig(configPath);
    if (modeInput && modeInput !== 'report') config.mode = modeInput as typeof config.mode;

    const ignorePaths = [...config.ignorePaths];
    if (ignorePathsInput) ignorePaths.push(...ignorePathsInput.split(',').map(s => s.trim()));

    const patterns = buildPatternsFromConfig(config, BUILTIN_PATTERNS);
    core.info('ai-output-redacter — mode: ' + config.mode + ', patterns: ' + patterns.length);

    const summaries: ScanSummary[] = [];
    const scanPaths = scanPathsInput.split(',').map(s => s.trim()).filter(Boolean);

    for (const scanPath of scanPaths) {
      const summary = scanDirectory(scanPath, { patterns, ignorePaths });
      summaries.push(summary);
    }

    if (scanStdin && process.stdin.isTTY === false) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk as Buffer));
      const input = Buffer.concat(chunks).toString('utf8');
      const result = scanText(input, patterns, 'stdin');
      summaries.push({
        filesScanned: 1,
        totalMatches: result.matches.length,
        results: result.matches.length > 0 ? [result] : [],
        errors: [],
      });
    }

    // Merge summaries
    const merged: ScanSummary = {
      filesScanned: summaries.reduce((s, x) => s + x.filesScanned, 0),
      totalMatches: summaries.reduce((s, x) => s + x.totalMatches, 0),
      results: summaries.flatMap(x => x.results),
      errors: summaries.flatMap(x => x.errors),
    };

    // Redact mode
    if (config.mode === 'redact') {
      for (const result of merged.results) {
        if (!fs.existsSync(result.source)) continue;
        const content = fs.readFileSync(result.source, 'utf8');
        const { redacted } = redactText(content, patterns);
        fs.writeFileSync(result.source, redacted, 'utf8');
        core.info('Redacted: ' + result.source);
      }
    }

    const opts = { mode: config.mode, scanPaths };
    const report = buildJsonReport(merged, opts);
    const artifactPath = path.join(process.env.RUNNER_TEMP ?? '/tmp', 'ai-output-redacter-report.json');
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2));

    core.summary.addRaw(formatMarkdownReport(merged, opts)).write();
    core.info('\n' + formatTextReport(merged, opts));

    core.setOutput('violations-found', String(report.violationsFound));
    core.setOutput('violation-count', String(report.violationCount));
    core.setOutput('rules-triggered', report.rulesTriggered.join(','));
    core.setOutput('report-path', artifactPath);

    const allMatches = merged.results.flatMap(r => r.matches);
    if (shouldFail(config, allMatches)) {
      core.setFailed('ai-output-redacter: ' + report.violationCount + ' violation(s) found — enforce mode');
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();

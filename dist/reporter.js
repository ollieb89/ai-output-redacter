"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMatchLine = formatMatchLine;
exports.formatTextReport = formatTextReport;
exports.formatMarkdownReport = formatMarkdownReport;
exports.buildJsonReport = buildJsonReport;
/**
 * Safe line format — NEVER echoes raw matched content.
 * Format: ⚠️  rule-name  →  file.txt:L12  →  sk-ant-***[18 chars]
 */
function formatMatchLine(match, source) {
    const severity = match.severity === 'critical' ? '🔴' :
        match.severity === 'high' ? '⚠️' :
            match.severity === 'medium' ? '🟡' : 'ℹ️';
    return severity + '  ' + match.rule + '  →  ' + source + ':L' + match.line + '  →  ' + match.maskedPreview;
}
function formatTextReport(summary, opts) {
    const lines = [
        'ai-output-redacter',
        '===================',
        'Mode: ' + opts.mode,
        'Files scanned: ' + summary.filesScanned,
        'Total violations: ' + summary.totalMatches,
        '',
    ];
    if (summary.totalMatches === 0) {
        lines.push('✅ No violations found.');
    }
    else {
        for (const result of summary.results) {
            lines.push('📄 ' + result.source + ' (' + result.matches.length + ' match' + (result.matches.length !== 1 ? 'es' : '') + ')');
            for (const match of result.matches) {
                lines.push('   ' + formatMatchLine(match, result.source));
            }
            lines.push('');
        }
    }
    return lines.join('\n');
}
function formatMarkdownReport(summary, opts) {
    const lines = [];
    const overallIcon = summary.totalMatches === 0 ? '✅' : '🔴';
    lines.push('## ' + overallIcon + ' ai-output-redacter Results');
    lines.push('');
    lines.push('**Mode:** ' + opts.mode + '  ');
    lines.push('**Files scanned:** ' + summary.filesScanned + '  ');
    lines.push('**Violations found:** ' + summary.totalMatches);
    lines.push('');
    if (summary.totalMatches === 0) {
        lines.push('✅ No sensitive patterns detected.');
    }
    else {
        lines.push('### Violations');
        lines.push('');
        lines.push('| Severity | Rule | Source | Line | Preview |');
        lines.push('|----------|------|--------|------|---------|');
        for (const result of summary.results) {
            for (const match of result.matches) {
                const sev = match.severity;
                const icon = sev === 'critical' ? '🔴' : sev === 'high' ? '⚠️' : sev === 'medium' ? '🟡' : 'ℹ️';
                // maskedPreview is ALWAYS safe — never the raw value
                lines.push('| ' + icon + ' ' + sev + ' | `' + match.rule + '` | `' + result.source + '` | L' + match.line + ' | `' + match.maskedPreview + '` |');
            }
        }
    }
    lines.push('');
    lines.push('---');
    lines.push('*Powered by [ai-output-redacter](https://github.com/ollieb89/ai-output-redacter)*');
    return lines.join('\n');
}
function buildJsonReport(summary, opts) {
    const rulesTriggered = [...new Set(summary.results.flatMap(r => r.matches.map(m => m.rule)))];
    return {
        timestamp: new Date().toISOString(),
        mode: opts.mode,
        violationsFound: summary.totalMatches > 0,
        violationCount: summary.totalMatches,
        rulesTriggered,
        results: summary.results.map(r => ({
            source: r.source,
            count: r.matches.length,
            matches: r.matches.map(m => ({
                rule: m.rule,
                severity: m.severity,
                line: m.line,
                column: m.column,
                maskedPreview: m.maskedPreview, // NEVER raw value
            })),
        })),
    };
}

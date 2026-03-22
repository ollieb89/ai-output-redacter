"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const builtin_1 = require("./patterns/builtin");
const config_1 = require("./config");
const scanner_1 = require("./scanner");
const redactor_1 = require("./redactor");
const reporter_1 = require("./reporter");
async function run() {
    try {
        const scanPathsInput = core.getInput('scan-paths') || '.';
        const configPath = core.getInput('config-path') || '.ai-output-redacter.yml';
        const modeInput = core.getInput('mode') || 'report';
        const scanStdin = core.getBooleanInput('scan-stdin');
        const ignorePathsInput = core.getInput('ignore-paths');
        const config = (0, config_1.loadConfig)(configPath);
        if (modeInput && modeInput !== 'report')
            config.mode = modeInput;
        const ignorePaths = [...config.ignorePaths];
        if (ignorePathsInput)
            ignorePaths.push(...ignorePathsInput.split(',').map(s => s.trim()));
        const patterns = (0, config_1.buildPatternsFromConfig)(config, builtin_1.BUILTIN_PATTERNS);
        core.info('ai-output-redacter — mode: ' + config.mode + ', patterns: ' + patterns.length);
        const summaries = [];
        const scanPaths = scanPathsInput.split(',').map(s => s.trim()).filter(Boolean);
        for (const scanPath of scanPaths) {
            const summary = (0, scanner_1.scanDirectory)(scanPath, { patterns, ignorePaths });
            summaries.push(summary);
        }
        if (scanStdin && process.stdin.isTTY === false) {
            const chunks = [];
            for await (const chunk of process.stdin)
                chunks.push(Buffer.from(chunk));
            const input = Buffer.concat(chunks).toString('utf8');
            const result = (0, scanner_1.scanText)(input, patterns, 'stdin');
            summaries.push({
                filesScanned: 1,
                totalMatches: result.matches.length,
                results: result.matches.length > 0 ? [result] : [],
                errors: [],
            });
        }
        // Merge summaries
        const merged = {
            filesScanned: summaries.reduce((s, x) => s + x.filesScanned, 0),
            totalMatches: summaries.reduce((s, x) => s + x.totalMatches, 0),
            results: summaries.flatMap(x => x.results),
            errors: summaries.flatMap(x => x.errors),
        };
        // Redact mode
        if (config.mode === 'redact') {
            for (const result of merged.results) {
                if (!fs.existsSync(result.source))
                    continue;
                const content = fs.readFileSync(result.source, 'utf8');
                const { redacted } = (0, redactor_1.redactText)(content, patterns);
                fs.writeFileSync(result.source, redacted, 'utf8');
                core.info('Redacted: ' + result.source);
            }
        }
        const opts = { mode: config.mode, scanPaths };
        const report = (0, reporter_1.buildJsonReport)(merged, opts);
        const artifactPath = path.join(process.env.RUNNER_TEMP ?? '/tmp', 'ai-output-redacter-report.json');
        fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
        fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2));
        core.summary.addRaw((0, reporter_1.formatMarkdownReport)(merged, opts)).write();
        core.info('\n' + (0, reporter_1.formatTextReport)(merged, opts));
        core.setOutput('violations-found', String(report.violationsFound));
        core.setOutput('violation-count', String(report.violationCount));
        core.setOutput('rules-triggered', report.rulesTriggered.join(','));
        core.setOutput('report-path', artifactPath);
        const allMatches = merged.results.flatMap(r => r.matches);
        if ((0, config_1.shouldFail)(config, allMatches)) {
            core.setFailed('ai-output-redacter: ' + report.violationCount + ' violation(s) found — enforce mode');
        }
    }
    catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}
run();

#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const builtin_1 = require("../patterns/builtin");
const config_1 = require("../config");
const scanner_1 = require("../scanner");
const redactor_1 = require("../redactor");
const reporter_1 = require("../reporter");
function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = argv[i + 1];
            if (!next || next.startsWith('--')) {
                args[key] = true;
            }
            else {
                args[key] = next;
                i++;
            }
        }
        else if (!arg.startsWith('-')) {
            args._path = arg;
        }
    }
    return args;
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || args.h) {
        console.log('ai-output-redacter [path]\n\nOptions:\n  --mode <report|redact|enforce>\n  --fail-on <any|high|none>\n  --config <path>\n  --format <text|markdown>\n  --help');
        process.exit(0);
    }
    const scanPath = typeof args._path === 'string' ? args._path : '.';
    const configPath = typeof args.config === 'string' ? args.config : '.ai-output-redacter.yml';
    const config = (0, config_1.loadConfig)(configPath);
    if (typeof args.mode === 'string')
        config.mode = args.mode;
    if (typeof args['fail-on'] === 'string')
        config.failOn = args['fail-on'];
    const patterns = (0, config_1.buildPatternsFromConfig)(config, builtin_1.BUILTIN_PATTERNS);
    const summary = (0, scanner_1.scanDirectory)(scanPath, { patterns, ignorePaths: config.ignorePaths });
    if (config.mode === 'redact') {
        for (const result of summary.results) {
            if (!fs.existsSync(result.source))
                continue;
            const content = fs.readFileSync(result.source, 'utf8');
            const { redacted } = (0, redactor_1.redactText)(content, patterns);
            fs.writeFileSync(result.source, redacted);
        }
    }
    const opts = { mode: config.mode, scanPaths: [scanPath] };
    const format = typeof args.format === 'string' ? args.format : 'text';
    if (format === 'markdown')
        console.log((0, reporter_1.formatMarkdownReport)(summary, opts));
    else
        console.log((0, reporter_1.formatTextReport)(summary, opts));
    const allMatches = summary.results.flatMap(r => r.matches);
    if ((0, config_1.shouldFail)(config, allMatches)) {
        console.error('\n✗ ' + summary.totalMatches + ' violation(s) found');
        process.exit(1);
    }
}
main().catch(err => { console.error('Fatal:', err.message); process.exit(2); });

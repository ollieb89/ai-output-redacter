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
exports.DEFAULT_CONFIG = void 0;
exports.parseConfig = parseConfig;
exports.loadConfig = loadConfig;
exports.buildPatternsFromConfig = buildPatternsFromConfig;
exports.shouldFail = shouldFail;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
exports.DEFAULT_CONFIG = {
    mode: 'report',
    failOn: 'any',
    scanPaths: ['.'],
    ignorePaths: [],
    customRules: [],
    disabledRules: [],
};
function parseConfig(raw) {
    const validModes = ['report', 'redact', 'enforce'];
    const validFailOn = ['any', 'high', 'none'];
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    const mode = validModes.includes(raw.mode) ? raw.mode : 'report';
    const failOn = validFailOn.includes(raw['fail-on']) ? raw['fail-on'] : 'any';
    const scanPaths = Array.isArray(raw['scan-paths']) ? raw['scan-paths'] : ['.'];
    const ignorePaths = Array.isArray(raw['ignore-paths']) ? raw['ignore-paths'] : [];
    const disabledRules = Array.isArray(raw['disabled-rules']) ? raw['disabled-rules'] : [];
    const customRules = [];
    if (Array.isArray(raw['custom-rules'])) {
        for (const r of raw['custom-rules']) {
            if (typeof r.name === 'string' && typeof r.pattern === 'string') {
                customRules.push({
                    name: r.name,
                    pattern: r.pattern,
                    severity: validSeverities.includes(r.severity) ? r.severity : 'medium',
                    description: typeof r.description === 'string' ? r.description : undefined,
                });
            }
        }
    }
    return { mode, failOn, scanPaths, ignorePaths, customRules, disabledRules };
}
function loadConfig(configPath) {
    if (!fs.existsSync(configPath))
        return { ...exports.DEFAULT_CONFIG };
    try {
        const raw = yaml.load(fs.readFileSync(configPath, 'utf8'));
        return parseConfig(raw);
    }
    catch {
        return { ...exports.DEFAULT_CONFIG };
    }
}
function buildPatternsFromConfig(config, builtins) {
    const active = builtins.filter(p => !config.disabledRules.includes(p.name));
    for (const rule of config.customRules) {
        try {
            active.push({
                name: rule.name,
                description: rule.description ?? rule.name,
                regex: new RegExp(rule.pattern, 'g'),
                severity: rule.severity,
            });
        }
        catch { /* skip invalid regex */ }
    }
    return active;
}
function shouldFail(config, matches) {
    if (config.mode !== 'enforce')
        return false;
    if (config.failOn === 'none')
        return false;
    if (config.failOn === 'any')
        return matches.length > 0;
    if (config.failOn === 'high') {
        return matches.some(m => m.severity === 'critical' || m.severity === 'high');
    }
    return false;
}

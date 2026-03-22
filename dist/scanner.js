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
exports.shouldIgnore = shouldIgnore;
exports.scanFile = scanFile;
exports.scanDirectory = scanDirectory;
exports.scanText = scanText;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const matcher_1 = require("./matcher");
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
function shouldIgnore(filePath, ignorePaths) {
    const basename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext))
        return true;
    if (basename === 'node_modules' || filePath.includes('/node_modules/'))
        return true;
    if (basename === '.git' || filePath.includes('/.git/'))
        return true;
    if (basename === 'dist' || filePath.includes('/dist/'))
        return true;
    for (const pattern of ignorePaths) {
        if (filePath.includes(pattern) || basename === pattern)
            return true;
        if (pattern.startsWith('*.') && filePath.endsWith(pattern.slice(1)))
            return true;
    }
    return false;
}
function scanFile(filePath, opts) {
    if (shouldIgnore(filePath, opts.ignorePaths ?? []))
        return null;
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile())
            return null;
        if (stat.size > (opts.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE))
            return null;
        const content = fs.readFileSync(filePath, 'utf8');
        return (0, matcher_1.matchText)(content, opts.patterns, filePath);
    }
    catch {
        return null;
    }
}
function scanDirectory(dirPath, opts) {
    const results = [];
    const errors = [];
    let filesScanned = 0;
    if (!fs.existsSync(dirPath)) {
        return { filesScanned: 0, totalMatches: 0, results: [], errors: ['Directory not found: ' + dirPath] };
    }
    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch (err) {
            errors.push('Cannot read dir: ' + dir);
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (shouldIgnore(full, opts.ignorePaths ?? []))
                continue;
            if (entry.isDirectory()) {
                walk(full);
            }
            else if (entry.isFile()) {
                const result = scanFile(full, opts);
                if (result) {
                    filesScanned++;
                    if (result.matches.length > 0)
                        results.push(result);
                }
            }
        }
    }
    walk(dirPath);
    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
    return { filesScanned, totalMatches, results, errors };
}
function scanText(text, patterns, source = 'stdin') {
    return (0, matcher_1.matchText)(text, patterns, source);
}

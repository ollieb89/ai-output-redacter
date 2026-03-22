"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskValue = maskValue;
exports.luhnCheck = luhnCheck;
exports.matchPattern = matchPattern;
exports.matchAll = matchAll;
exports.matchText = matchText;
/**
 * Build a safe masked preview — NEVER expose the raw value.
 * Format: first 6 chars + *** + [N chars remaining]
 */
function maskValue(value) {
    const PREFIX_LEN = 6;
    if (value.length <= PREFIX_LEN) {
        return '*'.repeat(value.length) + '[' + value.length + ' chars]';
    }
    const remaining = value.length - PREFIX_LEN;
    return value.slice(0, PREFIX_LEN) + '***[' + remaining + ' chars]';
}
/** Luhn check for credit card validation */
function luhnCheck(num) {
    const digits = num.replace(/\D/g, '');
    if (digits.length < 13)
        return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i], 10);
        if (alt) {
            n *= 2;
            if (n > 9)
                n -= 9;
        }
        sum += n;
        alt = !alt;
    }
    return sum % 10 === 0;
}
function getLineAndColumn(text, index) {
    const lines = text.slice(0, index).split('\n');
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}
function matchPattern(text, pattern) {
    const matches = [];
    // Reset lastIndex to avoid stateful regex issues
    const re = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
        const value = m[0];
        // Skip credit cards that fail Luhn check
        if (pattern.luhnCheck && !luhnCheck(value))
            continue;
        const { line, column } = getLineAndColumn(text, m.index);
        matches.push({
            rule: pattern.name,
            severity: pattern.severity,
            line,
            column,
            length: value.length,
            maskedPreview: maskValue(value),
        });
        // Prevent infinite loop on zero-length matches
        if (m.index === re.lastIndex)
            re.lastIndex++;
    }
    return matches;
}
function matchAll(text, patterns) {
    const all = [];
    for (const pattern of patterns) {
        all.push(...matchPattern(text, pattern));
    }
    // Sort by line, then column
    return all.sort((a, b) => a.line !== b.line ? a.line - b.line : a.column - b.column);
}
function matchText(text, patterns, source = 'stdin') {
    return { source, matches: matchAll(text, patterns) };
}

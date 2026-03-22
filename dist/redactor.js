"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactText = redactText;
exports.countRedactions = countRedactions;
exports.safeRedact = safeRedact;
const matcher_1 = require("./matcher");
function redactText(text, patterns) {
    let redacted = text;
    let count = 0;
    for (const pattern of patterns) {
        const re = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g');
        redacted = redacted.replace(re, (match) => {
            if (pattern.luhnCheck && !(0, matcher_1.luhnCheck)(match))
                return match;
            count++;
            return '[REDACTED:' + pattern.name + ']';
        });
    }
    return { original: text, redacted, count };
}
function countRedactions(text, patterns) {
    return redactText(text, patterns).count;
}
/**
 * Safe output only — returns the redacted string, never the original.
 */
function safeRedact(text, patterns) {
    return redactText(text, patterns).redacted;
}

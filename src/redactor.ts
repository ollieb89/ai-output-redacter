import { Pattern } from './patterns/builtin';
import { luhnCheck } from './matcher';

export interface RedactResult {
  original: string;       // NEVER exposed externally — internal only
  redacted: string;       // safe for output
  count: number;
}

export function redactText(text: string, patterns: Pattern[]): RedactResult {
  let redacted = text;
  let count = 0;

  for (const pattern of patterns) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g');
    redacted = redacted.replace(re, (match) => {
      if (pattern.luhnCheck && !luhnCheck(match)) return match;
      count++;
      return '[REDACTED:' + pattern.name + ']';
    });
  }

  return { original: text, redacted, count };
}

export function countRedactions(text: string, patterns: Pattern[]): number {
  return redactText(text, patterns).count;
}

/**
 * Safe output only — returns the redacted string, never the original.
 */
export function safeRedact(text: string, patterns: Pattern[]): string {
  return redactText(text, patterns).redacted;
}

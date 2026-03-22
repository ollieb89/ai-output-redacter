export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Pattern {
  name: string;
  description: string;
  regex: RegExp;
  severity: Severity;
  luhnCheck?: boolean; // for credit cards
}

export const BUILTIN_PATTERNS: Pattern[] = [
  // API Keys / Tokens
  {
    name: 'api-key-openai',
    description: 'OpenAI API key',
    regex: /sk-[a-zA-Z0-9]{20,60}/g,
    severity: 'critical',
  },
  {
    name: 'api-key-anthropic',
    description: 'Anthropic API key',
    regex: /sk-ant-[a-zA-Z0-9_-]{20,80}/g,
    severity: 'critical',
  },
  {
    name: 'api-key-github',
    description: 'GitHub personal access token',
    regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    severity: 'critical',
  },
  {
    name: 'api-key-aws-access',
    description: 'AWS access key ID',
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
  },
  {
    name: 'api-key-aws-secret',
    description: 'AWS secret access key',
    regex: /(?<=[Aa]ws[_\-\s]?[Ss]ecret[_\-\s]?[Kk]ey[_\-\s]?[:=]\s*)["']?[A-Za-z0-9/+]{40}["']?/g,
    severity: 'critical',
  },
  {
    name: 'api-key-gcp',
    description: 'Google Cloud / GCP API key',
    regex: /AIza[0-9A-Za-z_-]{35}/g,
    severity: 'critical',
  },
  {
    name: 'api-key-azure',
    description: 'Azure SAS / connection string token',
    regex: /[Ss]ig=[A-Za-z0-9%+/]{43,}={0,2}/g,
    severity: 'high',
  },
  // Bearer / Authorization headers
  {
    name: 'bearer-token',
    description: 'HTTP Authorization Bearer token',
    regex: /[Bb]earer\s+[A-Za-z0-9\-._~+/]+=*/g,
    severity: 'high',
  },
  // Private keys
  {
    name: 'private-key-pem',
    description: 'PEM private key block',
    regex: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----[\s\S]{10,}/g,
    severity: 'critical',
  },
  // JWTs
  {
    name: 'jwt-token',
    description: 'JSON Web Token',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    severity: 'high',
  },
  // PII — Email
  {
    name: 'pii-email',
    description: 'Email address',
    regex: /[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,253}\.[a-zA-Z]{2,10}/g,
    severity: 'medium',
  },
  // PII — Phone (E.164 and common US formats)
  {
    name: 'pii-phone',
    description: 'Phone number (E.164 or US format)',
    regex: /(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    severity: 'medium',
  },
  // PII — US SSN
  {
    name: 'pii-ssn',
    description: 'US Social Security Number',
    regex: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g,
    severity: 'critical',
  },
  // Private IP ranges
  {
    name: 'private-ip',
    description: 'Private IP address (RFC 1918)',
    regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
    severity: 'low',
  },
  // Credit cards (major networks, Luhn check applied separately)
  {
    name: 'credit-card',
    description: 'Credit card number',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
    severity: 'critical',
    luhnCheck: true,
  },
];

export function getPatternByName(name: string): Pattern | undefined {
  return BUILTIN_PATTERNS.find(p => p.name === name);
}

export function getPatternsBySeverity(severity: Severity): Pattern[] {
  return BUILTIN_PATTERNS.filter(p => p.severity === severity);
}

import { matchPattern } from '../src/matcher';
import { BUILTIN_PATTERNS, getPatternByName } from '../src/patterns/builtin';

function getPattern(name: string) {
  const p = getPatternByName(name);
  if (!p) throw new Error('Pattern not found: ' + name);
  return p;
}

// SAFETY: test inputs use deliberately malformed/fake values that cannot be used as real credentials

describe('api-key-openai', () => {
  const p = getPattern('api-key-openai');
  it('matches a valid-format OpenAI key', () => {
    const matches = matchPattern('sk-abcdefghijklmnopqrstuvwxyz1234567890abcd', p);
    expect(matches.length).toBe(1);
    expect(matches[0].maskedPreview).toContain('***');
    expect(matches[0].maskedPreview).not.toContain('abcdefghijklmnopqrstuvwxyz');
  });
  it('does not match short strings', () => {
    expect(matchPattern('sk-abc', p)).toHaveLength(0);
  });
  it('does not match unrelated text', () => {
    expect(matchPattern('hello world', p)).toHaveLength(0);
  });
});

describe('api-key-anthropic', () => {
  const p = getPattern('api-key-anthropic');
  it('matches an Anthropic-format key', () => {
    const matches = matchPattern('sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890', p);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].maskedPreview).not.toContain('api03');
  });
  it('does not match unrelated text', () => {
    expect(matchPattern('nothing here', p)).toHaveLength(0);
  });
});

describe('api-key-github', () => {
  const p = getPattern('api-key-github');
  it('matches a GitHub PAT format', () => {
    const matches = matchPattern('ghp_abcdefghijklmnopqrstuvwxyz123456789012', p);
    expect(matches.length).toBeGreaterThan(0);
  });
  it('matches ghs_ prefix', () => {
    expect(matchPattern('ghs_abcdefghijklmnopqrstuvwxyz123456789012', p).length).toBeGreaterThan(0);
  });
  it('does not match regular text', () => {
    expect(matchPattern('hello world', p)).toHaveLength(0);
  });
});

describe('api-key-aws-access', () => {
  const p = getPattern('api-key-aws-access');
  it('matches AWS access key ID format', () => {
    const matches = matchPattern('AKIAIOSFODNN7EXAMPLE1', p);
    expect(matches.length).toBeGreaterThan(0);
  });
  it('does not match non-AKIA strings', () => {
    expect(matchPattern('BKIAIOSFODNN7EXAMPLE1', p)).toHaveLength(0);
  });
});

describe('api-key-gcp', () => {
  const p = getPattern('api-key-gcp');
  it('matches GCP AIza key format', () => {
    const matches = matchPattern('AIzaSyAbcdefghijklmnopqrstuvwxyz1234567', p);
    expect(matches.length).toBeGreaterThan(0);
  });
  it('does not match non-AIza text', () => {
    expect(matchPattern('hello world', p)).toHaveLength(0);
  });
});

describe('bearer-token', () => {
  const p = getPattern('bearer-token');
  it('matches Bearer token in authorization header', () => {
    const matches = matchPattern('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', p);
    expect(matches.length).toBeGreaterThan(0);
    // maskedPreview must not contain the full token
    expect(matches[0].maskedPreview.length).toBeLessThan(50);
  });
  it('does not match plain text', () => {
    expect(matchPattern('hello world', p)).toHaveLength(0);
  });
});

describe('jwt-token', () => {
  const p = getPattern('jwt-token');
  it('matches a JWT-format token', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const matches = matchPattern(jwt, p);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].maskedPreview).not.toContain('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  });
  it('does not match non-JWT text', () => {
    expect(matchPattern('eyJnot.areal.jwt', p)).toHaveLength(0);
  });
});

describe('pii-email', () => {
  const p = getPattern('pii-email');
  it('matches an email address', () => {
    const matches = matchPattern('user@example.com', p);
    expect(matches.length).toBeGreaterThan(0);
    // masked preview must not expose full email
    expect(matches[0].maskedPreview).toContain('***');
  });
  it('does not match plain text', () => {
    expect(matchPattern('hello world', p)).toHaveLength(0);
  });
  it('matches email embedded in text', () => {
    const matches = matchPattern('Contact us at info@company.org for help', p);
    expect(matches.length).toBeGreaterThan(0);
  });
});

describe('pii-phone', () => {
  const p = getPattern('pii-phone');
  it('matches US phone number format', () => {
    const matches = matchPattern('Call 555-867-5309 today', p);
    expect(matches.length).toBeGreaterThan(0);
  });
  it('matches parenthesized format', () => {
    expect(matchPattern('(555) 867-5309', p).length).toBeGreaterThan(0);
  });
});

describe('pii-ssn', () => {
  const p = getPattern('pii-ssn');
  it('matches SSN format', () => {
    const matches = matchPattern('SSN: 123-45-6789', p);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].maskedPreview).not.toContain('123-45-6789');
  });
  it('does not match 000-xx-xxxx (invalid SSN prefix)', () => {
    expect(matchPattern('000-45-6789', p)).toHaveLength(0);
  });
});

describe('private-ip', () => {
  const p = getPattern('private-ip');
  it('matches 10.x.x.x range', () => {
    expect(matchPattern('10.0.0.1', p).length).toBeGreaterThan(0);
  });
  it('matches 192.168.x.x range', () => {
    expect(matchPattern('192.168.1.100', p).length).toBeGreaterThan(0);
  });
  it('matches 172.16.x.x range', () => {
    expect(matchPattern('172.16.0.1', p).length).toBeGreaterThan(0);
  });
  it('does not match public IP', () => {
    expect(matchPattern('8.8.8.8', p)).toHaveLength(0);
  });
  it('does not match 172.15.x.x (outside range)', () => {
    expect(matchPattern('172.15.0.1', p)).toHaveLength(0);
  });
});

describe('credit-card (Luhn check)', () => {
  const p = getPattern('credit-card');
  it('matches valid Visa-format number (passes Luhn)', () => {
    // 4111111111111111 is a classic Luhn-valid test number
    const matches = matchPattern('4111111111111111', p);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].maskedPreview).toContain('***');
  });
  it('rejects number that fails Luhn', () => {
    expect(matchPattern('4111111111111112', p)).toHaveLength(0);
  });
});

describe('masked preview safety', () => {
  it('never exposes full value in preview', () => {
    const pattern = getPattern('api-key-openai');
    const longKey = 'sk-' + 'a'.repeat(40);
    const matches = matchPattern(longKey, pattern);
    expect(matches.length).toBeGreaterThan(0);
    const preview = matches[0].maskedPreview;
    // preview must be much shorter than original
    expect(preview.length).toBeLessThan(longKey.length);
    expect(preview).toContain('***');
    expect(preview).not.toBe(longKey);
  });
});

describe('builtin patterns coverage', () => {
  it('all patterns have required fields', () => {
    for (const p of BUILTIN_PATTERNS) {
      expect(p.name).toBeTruthy();
      expect(p.regex).toBeInstanceOf(RegExp);
      expect(['critical', 'high', 'medium', 'low']).toContain(p.severity);
    }
  });
  it('getPatternByName returns undefined for unknown', () => {
    expect(getPatternByName('does-not-exist')).toBeUndefined();
  });
});

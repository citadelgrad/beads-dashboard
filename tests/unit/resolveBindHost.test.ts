import { describe, it, expect } from 'vitest';
import { resolveBindHost } from '@server/utils/resolveBindHost';

describe('resolveBindHost', () => {
  it('defaults to 127.0.0.1 when no flag or env var is set', () => {
    expect(resolveBindHost({}, {})).toBe('127.0.0.1');
  });

  it('uses BEADS_HOST when no --host flag is given', () => {
    expect(resolveBindHost({}, { BEADS_HOST: '0.0.0.0' })).toBe('0.0.0.0');
  });

  it('prefers the --host flag over BEADS_HOST', () => {
    expect(resolveBindHost({ host: '192.168.1.5' }, { BEADS_HOST: '0.0.0.0' })).toBe('192.168.1.5');
  });

  it('falls back to the default when --host is an empty string', () => {
    expect(resolveBindHost({ host: '' }, {})).toBe('127.0.0.1');
  });
});

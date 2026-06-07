import {describe, expect, it} from 'vitest';

import {normalizedTagKey, normalizeTagInput} from './tagName';

describe('tag name helpers', () => {
  it('trims and collapses whitespace for display input', () => {
    expect(normalizeTagInput('  Foo   Bar  ')).toBe('Foo Bar');
  });

  it('uses a lowercase normalized key for matching', () => {
    expect(normalizedTagKey('  Foo   Bar  ')).toBe('foo bar');
  });

  it('normalizes unicode whitespace consistently', () => {
    expect(normalizeTagInput('客户　 A')).toBe('客户 A');
  });
});

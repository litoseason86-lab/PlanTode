import {describe, expect, it} from 'vitest';

import {calculateFocusRingOffset, formatFocusElapsed} from './useFocusController';

describe('useFocusController helpers', () => {
  it('formats elapsed seconds as hh:mm:ss', () => {
    expect(formatFocusElapsed(3661)).toBe('01:01:01');
  });

  it('keeps the ring offset within one hour progress', () => {
    expect(calculateFocusRingOffset(1800)).toBeCloseTo(326.5, 1);
    expect(calculateFocusRingOffset(3600)).toBeCloseTo(653, 1);
  });
});

import {describe, expect, it} from 'vitest';

import {getNextCategorySortOrder} from './useCategoriesController';

describe('getNextCategorySortOrder', () => {
  it('returns max sort order plus ten when categories exist', () => {
    expect(
      getNextCategorySortOrder([
        {
          id: 1,
          userId: 1,
          name: '工作',
          color: '#ef4444',
          sortOrder: 20,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 2,
          userId: 1,
          name: '学习',
          color: '#3b82f6',
          sortOrder: 35,
          createdAt: '',
          updatedAt: '',
        },
      ]),
    ).toBe(45);
  });

  it('returns default sort order when list is empty', () => {
    expect(getNextCategorySortOrder([])).toBe(10);
  });
});

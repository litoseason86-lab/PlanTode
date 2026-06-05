import {useMemo} from 'react';

import type {Category} from '../../../../shared/domain/entities';

export function getNextCategorySortOrder(categories: Category[]): number {
  if (categories.length === 0) {
    return 10;
  }

  return Math.max(...categories.map((category) => category.sortOrder)) + 10;
}

export function useCategoriesController(categories: Category[]) {
  const nextSortOrder = useMemo(() => getNextCategorySortOrder(categories), [categories]);

  return {
    nextSortOrder,
  };
}

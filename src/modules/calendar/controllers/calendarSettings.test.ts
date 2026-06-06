import {afterEach, describe, expect, it, vi} from 'vitest';

import {
  CALENDAR_SETTINGS_STORAGE_KEY,
  DEFAULT_CALENDAR_SETTINGS,
  filterTasksForCalendar,
  loadCalendarSettings,
  saveCalendarSettings,
} from './calendarSettings';

describe('calendarSettings', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('uses explicit default settings', () => {
    expect(DEFAULT_CALENDAR_SETTINGS).toEqual({
      visibleCategoryIds: [],
      showCompleted: true,
      colorMode: 'category',
      showFocusSessions: true,
    });
  });

  it('filters completed tasks and hidden categories', () => {
    const tasks = [
      {id: 1, categoryId: 1, status: 'DONE'},
      {id: 2, categoryId: 2, status: 'TODO'},
      {id: 3, categoryId: 3, status: 'TODO'},
    ] as never;

    expect(filterTasksForCalendar(tasks, {
      ...DEFAULT_CALENDAR_SETTINGS,
      showCompleted: false,
      visibleCategoryIds: [2],
    })).toEqual([{id: 2, categoryId: 2, status: 'TODO'}]);
  });

  it('persists settings in localStorage', () => {
    saveCalendarSettings({
      visibleCategoryIds: [1, 2],
      showCompleted: false,
      colorMode: 'category',
      showFocusSessions: false,
    });

    expect(localStorage.getItem(CALENDAR_SETTINGS_STORAGE_KEY)).toContain('"visibleCategoryIds":[1,2]');
    expect(loadCalendarSettings()).toEqual({
      visibleCategoryIds: [1, 2],
      showCompleted: false,
      colorMode: 'category',
      showFocusSessions: false,
    });
  });

  it('falls back to defaults when storage is corrupt', () => {
    localStorage.setItem(CALENDAR_SETTINGS_STORAGE_KEY, '{bad json');
    expect(loadCalendarSettings()).toEqual(DEFAULT_CALENDAR_SETTINGS);
  });
});

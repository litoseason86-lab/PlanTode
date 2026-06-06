export const CALENDAR_SETTINGS_STORAGE_KEY = 'plantodo.calendar.settings';

export interface CalendarSettings {
  visibleCategoryIds: number[];
  showCompleted: boolean;
  colorMode: 'category';
  showFocusSessions: boolean;
}

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  visibleCategoryIds: [],
  showCompleted: true,
  colorMode: 'category',
  showFocusSessions: true,
};

export function filterTasksForCalendar<T extends {categoryId: number; status: string}>(
  tasks: T[],
  settings: CalendarSettings,
): T[] {
  return tasks.filter((task) => {
    if (!settings.showCompleted && task.status === 'DONE') return false;
    if (settings.visibleCategoryIds.length > 0 && !settings.visibleCategoryIds.includes(task.categoryId)) return false;
    return true;
  });
}

export function loadCalendarSettings(): CalendarSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_CALENDAR_SETTINGS;
  }

  const raw = window.localStorage.getItem(CALENDAR_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_CALENDAR_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CalendarSettings>;
    return {
      visibleCategoryIds: Array.isArray(parsed.visibleCategoryIds)
        ? parsed.visibleCategoryIds.filter((id): id is number => typeof id === 'number')
        : [],
      showCompleted: typeof parsed.showCompleted === 'boolean' ? parsed.showCompleted : true,
      colorMode: 'category',
      showFocusSessions: typeof parsed.showFocusSessions === 'boolean' ? parsed.showFocusSessions : true,
    };
  } catch {
    return DEFAULT_CALENDAR_SETTINGS;
  }
}

export function saveCalendarSettings(settings: CalendarSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CALENDAR_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

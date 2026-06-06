import {act, renderHook, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {calendarApi} from '../api/calendarApi';
import {useCalendarController} from './useCalendarController';

vi.mock('../api/calendarApi', () => ({
  calendarApi: {
    getCalendarTasks: vi.fn(),
    getFocusSessions: vi.fn(),
    createCalendarTask: vi.fn(),
    updateTaskSchedule: vi.fn(),
  },
}));

describe('useCalendarController', () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('defaults to week view and recalculates range when view changes', async () => {
    vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
    vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);

    const {result} = renderHook(() => useCalendarController({
      categories: [],
      initialDate: '2026-06-06',
      showToast: vi.fn(),
    }));

    expect(result.current.view).toBe('week');
    expect(result.current.range).toEqual({dateFrom: '2026-06-01', dateTo: '2026-06-07'});

    act(() => result.current.setView('month'));

    expect(result.current.range).toEqual({dateFrom: '2026-06-01', dateTo: '2026-06-30'});
    await waitFor(() => expect(calendarApi.getCalendarTasks).toHaveBeenCalled());
  });

  it('updates an all-day task schedule then refreshes', async () => {
    vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
    vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);
    vi.mocked(calendarApi.updateTaskSchedule).mockResolvedValue({id: 1} as never);

    const {result} = renderHook(() => useCalendarController({
      categories: [],
      initialDate: '2026-06-06',
      showToast: vi.fn(),
    }));

    await act(async () => {
      await result.current.scheduleTaskForDate(1, '2026-06-08');
    });

    expect(calendarApi.updateTaskSchedule).toHaveBeenCalledWith(1, {
      plannedDate: '2026-06-08',
      plannedEndDate: undefined,
      startAt: undefined,
      endAt: undefined,
      allDay: true,
    });
  });

  it('creates an all-day task from a date cell', async () => {
    vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
    vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);
    vi.mocked(calendarApi.createCalendarTask).mockResolvedValue({id: 1} as never);

    const {result} = renderHook(() => useCalendarController({
      categories: [{id: 8, userId: 1, name: '工作', color: '#ef4444', sortOrder: 1, createdAt: '', updatedAt: ''}],
      initialDate: '2026-06-06',
      showToast: vi.fn(),
    }));

    await act(async () => {
      await result.current.createAllDayTask('2026-06-08', '新任务');
    });

    expect(calendarApi.createCalendarTask).toHaveBeenCalledWith({
      title: '新任务',
      categoryId: 8,
      plannedDate: '2026-06-08',
      allDay: true,
    });
  });
});

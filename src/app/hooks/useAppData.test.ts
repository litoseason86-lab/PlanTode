import {act, renderHook, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import type {Task, TaskExecutionSession} from '../../../shared/domain/entities';
import {focusApi} from '../../modules/focus/api/focusApi';
import {tasksApi} from '../../modules/tasks/api/tasksApi';
import {useAppData} from './useAppData';

vi.mock('../../modules/categories/api/categoriesApi', () => ({
  categoriesApi: {
    getCategories: vi.fn(),
  },
}));

vi.mock('../../modules/focus/api/focusApi', () => ({
  focusApi: {
    getSessions: vi.fn(),
  },
}));

vi.mock('../../modules/tasks/api/tasksApi', () => ({
  tasksApi: {
    getTasks: vi.fn(),
  },
}));

function task(id: number, title: string, plannedDate: string): Task {
  return {
    id,
    userId: 1,
    categoryId: 1,
    title,
    plannedDate,
    allDay: true,
    status: 'TODO',
    createdAt: '',
    updatedAt: '',
  };
}

function session(id: number, taskId: number): TaskExecutionSession {
  return {
    id,
    taskId,
    userId: 1,
    startedAt: '2026-06-07T01:00:00.000Z',
    durationSeconds: 300,
    status: 'COMPLETED',
    createdAt: '',
  };
}

describe('useAppData', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('ignores stale selected-date task and session responses', async () => {
    let resolveOldSessions: (value: TaskExecutionSession[]) => void = () => {};
    const oldTasks = [task(1, '旧日期任务', '2026-06-07')];
    const newTasks = [task(2, '新日期任务', '2026-06-08')];
    const newSessions = [session(2, 2)];

    vi.mocked(tasksApi.getTasks)
      .mockResolvedValueOnce(oldTasks)
      .mockResolvedValueOnce(newTasks);
    vi.mocked(focusApi.getSessions)
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveOldSessions = resolve;
      }))
      .mockResolvedValueOnce(newSessions);

    const {result} = renderHook(() => useAppData());

    await act(async () => {
      result.current.setSelectedDate('2026-06-07');
    });
    void result.current.loadTasksForSelectedDate();
    await waitFor(() => expect(focusApi.getSessions).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.setSelectedDate('2026-06-08');
    });
    await act(async () => {
      await result.current.loadTasksForSelectedDate();
    });

    await waitFor(() => expect(result.current.tasks).toEqual(newTasks));
    expect(result.current.selectedDateSessions).toEqual(newSessions);

    await act(async () => {
      resolveOldSessions([session(1, 1)]);
    });

    expect(result.current.tasks).toEqual(newTasks);
    expect(result.current.selectedDateSessions).toEqual(newSessions);
  });

  it('does not let stale metadata loading overwrite tasks after the selected date changes', async () => {
    let resolveCategories: (value: never[]) => void = () => {};
    const oldTasks = [task(1, '旧日期任务', '2026-06-07')];
    const newTasks = [task(2, '新日期任务', '2026-06-08')];

    const {categoriesApi} = await import('../../modules/categories/api/categoriesApi');
    vi.mocked(categoriesApi.getCategories).mockReturnValueOnce(new Promise((resolve) => {
      resolveCategories = resolve;
    }));
    vi.mocked(tasksApi.getTasks)
      .mockResolvedValueOnce(newTasks)
      .mockResolvedValueOnce(oldTasks)
      .mockResolvedValueOnce([]);
    vi.mocked(focusApi.getSessions).mockResolvedValue([]);

    const {result} = renderHook(() => useAppData());

    await act(async () => {
      result.current.setSelectedDate('2026-06-07');
    });
    let metadataPromise: Promise<unknown> | undefined;
    act(() => {
      metadataPromise = result.current.loadMetaData();
    });

    await act(async () => {
      result.current.setSelectedDate('2026-06-08');
    });
    await act(async () => {
      await result.current.loadTasksForSelectedDate();
    });
    expect(result.current.tasks).toEqual(newTasks);

    await act(async () => {
      resolveCategories([]);
      await metadataPromise;
    });

    expect(result.current.tasks).toEqual(newTasks);
  });
});

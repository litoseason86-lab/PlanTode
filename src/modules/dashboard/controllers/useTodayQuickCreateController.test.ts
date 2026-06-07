import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {tasksApi} from '../../tasks/api/tasksApi';
import {useTodayQuickCreateController} from './useTodayQuickCreateController';

vi.mock('../../tasks/api/tasksApi', () => ({
  tasksApi: {
    createTask: vi.fn(),
  },
}));

const categories = [
  {id: 1, userId: 1, name: '工作', color: '#ef4444', sortOrder: 1, createdAt: '', updatedAt: ''},
];

function createDeferredTask() {
  let resolve!: (value: never) => void;
  const promise = new Promise<never>((nextResolve) => {
    resolve = nextResolve;
  });
  return {promise, resolve};
}

describe('useTodayQuickCreateController', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates today tasks with empty metadata', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({id: 1} as never);
    const refreshAllTasks = vi.fn().mockResolvedValue([]);
    const loadTasksForSelectedDate = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() => useTodayQuickCreateController({
      categories,
      selectedDate: '2026-06-07',
      setLoading: vi.fn(),
      showToast: vi.fn(),
      refreshAllTasks,
      loadTasksForSelectedDate,
    }));

    await act(async () => {
      await result.current.createTodayTask({title: '复盘', categoryId: 1});
    });

    expect(tasksApi.createTask).toHaveBeenCalledWith(expect.objectContaining({
      title: '复盘',
      categoryId: 1,
      plannedDate: '2026-06-07',
      tagIds: [],
      priority: null,
    }));
    expect(refreshAllTasks).toHaveBeenCalled();
    expect(loadTasksForSelectedDate).toHaveBeenCalled();
  });

  it('blocks duplicate creates while a create request is in flight', async () => {
    const deferredTask = createDeferredTask();
    vi.mocked(tasksApi.createTask).mockReturnValue(deferredTask.promise);
    const {result} = renderHook(() => useTodayQuickCreateController({
      categories,
      selectedDate: '2026-06-07',
      setLoading: vi.fn(),
      showToast: vi.fn(),
      refreshAllTasks: vi.fn().mockResolvedValue([]),
      loadTasksForSelectedDate: vi.fn().mockResolvedValue(undefined),
    }));

    const firstCreate = result.current.createTodayTask({title: '复盘', categoryId: 1});
    const secondCreate = result.current.createTodayTask({title: '复盘', categoryId: 1});

    expect(tasksApi.createTask).toHaveBeenCalledOnce();

    await act(async () => {
      deferredTask.resolve({id: 1} as never);
      await Promise.all([firstCreate, secondCreate]);
    });
  });

  it('separates refresh failures from create failures after a task is created', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({id: 1} as never);
    const showToast = vi.fn();
    const refreshAllTasks = vi.fn().mockRejectedValue(new Error('all tasks failed'));
    const loadTasksForSelectedDate = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() => useTodayQuickCreateController({
      categories,
      selectedDate: '2026-06-07',
      setLoading: vi.fn(),
      showToast,
      refreshAllTasks,
      loadTasksForSelectedDate,
    }));

    await act(async () => {
      await result.current.createTodayTask({title: '复盘', categoryId: 1});
    });

    expect(refreshAllTasks).toHaveBeenCalled();
    expect(loadTasksForSelectedDate).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('任务已创建，但刷新列表失败', 'error');
    expect(showToast).not.toHaveBeenCalledWith('生成行动项失败', 'error');
  });
});

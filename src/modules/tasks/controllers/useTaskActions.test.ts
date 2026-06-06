import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import type {Category, Task} from '../../../../shared/domain/entities';
import {tasksApi} from '../api/tasksApi';
import {useTaskActions} from './useTaskActions';

vi.mock('../api/tasksApi', () => ({
  tasksApi: {
    createTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

const categories: Category[] = [
  {
    id: 1,
    userId: 1,
    name: '工作',
    color: '#ef4444',
    sortOrder: 1,
    createdAt: '',
    updatedAt: '',
  },
];

const createdTask: Task = {
  id: 10,
  userId: 1,
  categoryId: 1,
  title: '新任务',
  plannedDate: '2026-06-07',
  allDay: true,
  status: 'TODO',
  createdAt: '',
  updatedAt: '',
};

function renderActions(overrides: Partial<Parameters<typeof useTaskActions>[0]> = {}) {
  return renderHook(() => useTaskActions({
    categories,
    allTasks: [],
    selectedDate: '2026-06-07',
    activeTab: 'today',
    runningSession: null,
    lastFinishedSessionTask: null,
    setRunningSession: vi.fn(),
    setLastFinishedSessionTask: vi.fn(),
    setLoading: vi.fn(),
    showToast: vi.fn(),
    loadTasksForSelectedDate: vi.fn().mockResolvedValue({tasks: [], sessions: []}),
    refreshAllTasks: vi.fn().mockResolvedValue([]),
    loadDailyStats: vi.fn().mockResolvedValue(undefined),
    loadWeeklyStats: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }));
}

describe('useTaskActions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a task with an explicit planned date override instead of the task form date', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue(createdTask);
    const refreshAllTasks = vi.fn().mockResolvedValue([]);
    const loadTasksForSelectedDate = vi.fn().mockResolvedValue({tasks: [], sessions: []});
    const {result} = renderActions({refreshAllTasks, loadTasksForSelectedDate});

    act(() => {
      result.current.setTaskFormTitle('新任务');
      result.current.setTaskFormCategory(1);
      result.current.setTaskFormDate('2026-06-01');
      result.current.setTaskFormUnscheduled(true);
    });

    await act(async () => {
      await result.current.handleCreateTask(undefined, {
        plannedDate: '2026-06-07',
        unscheduled: false,
      });
    });

    expect(tasksApi.createTask).toHaveBeenCalledWith({
      title: '新任务',
      categoryId: 1,
      plannedDate: '2026-06-07',
    });
    expect(refreshAllTasks).toHaveBeenCalledOnce();
    expect(loadTasksForSelectedDate).toHaveBeenCalledOnce();
  });

  it('keeps task form scheduling semantics when no override is provided', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({...createdTask, plannedDate: undefined});
    const loadTasksForSelectedDate = vi.fn().mockResolvedValue({tasks: [], sessions: []});
    const {result} = renderActions({loadTasksForSelectedDate});

    act(() => {
      result.current.setTaskFormTitle('放进储备池');
      result.current.setTaskFormCategory(1);
      result.current.setTaskFormDate('2026-06-07');
      result.current.setTaskFormUnscheduled(true);
    });

    await act(async () => {
      await result.current.handleCreateTask();
    });

    expect(tasksApi.createTask).toHaveBeenCalledWith({
      title: '放进储备池',
      categoryId: 1,
      plannedDate: undefined,
    });
    expect(loadTasksForSelectedDate).not.toHaveBeenCalled();
  });
});

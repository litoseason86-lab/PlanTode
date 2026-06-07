import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {Category, Tag, Task} from '../../../../shared/domain/entities';
import {useTasksPanelController} from './useTasksPanelController';

const categories: Category[] = [{
  id: 1,
  userId: 1,
  name: '工作',
  color: '#ef4444',
  sortOrder: 1,
  createdAt: '',
  updatedAt: '',
}];

const allTasks: Task[] = [{
  id: 1,
  userId: 1,
  categoryId: 1,
  title: '今日任务',
  plannedDate: '2026-06-03',
  allDay: true,
  status: 'TODO',
  priority: null,
  tagIds: [],
  createdAt: '',
  updatedAt: '',
}];

function renderController() {
  return renderHook(() => useTasksPanelController({
    categories,
    tags: [] as Tag[],
    allTasks,
    today: '2026-06-03',
    setLoading: vi.fn(),
    showToast: vi.fn(),
    refreshTags: vi.fn().mockResolvedValue([]),
    refreshAllTasks: vi.fn().mockResolvedValue([]),
    loadTasksForSelectedDate: vi.fn().mockResolvedValue(undefined),
    stopRunningSessionForTask: vi.fn().mockResolvedValue(undefined),
    refreshReports: vi.fn().mockResolvedValue(undefined),
    updateTaskStatus: vi.fn(),
    startSession: vi.fn(),
  }));
}

describe('useTasksPanelController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the task-library today anchor for today scope and create defaults', () => {
    const {result} = renderController();

    expect(result.current.filters.dateScope).toBe('today');
    expect(result.current.filteredTaskItems.map((task) => task.title)).toEqual(['今日任务']);
    expect(result.current.createDraft.unscheduled).toBe(false);
    expect(result.current.createDraft.plannedDate).toBe('2026-06-03');
  });

  it('makes unscheduled scope default new tasks to unscheduled without clearing other filters', () => {
    const {result} = renderController();

    act(() => {
      result.current.filters.setQuery('今日');
      result.current.filters.setDateScope('unscheduled');
    });

    expect(result.current.filters.query).toBe('今日');
    expect(result.current.createDraft.unscheduled).toBe(true);
  });

  it('does not overwrite manually touched create schedule when scope changes', () => {
    const {result} = renderController();

    act(() => {
      result.current.createDraft.setPlannedDate('2026-06-06');
      result.current.filters.setDateScope('unscheduled');
    });

    expect(result.current.createDraft.plannedDate).toBe('2026-06-06');
    expect(result.current.createDraft.unscheduled).toBe(false);
  });
});

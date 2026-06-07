import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {calendarApi} from '../modules/calendar/api/calendarApi';
import {categoriesApi} from '../modules/categories/api/categoriesApi';
import {focusApi} from '../modules/focus/api/focusApi';
import {tagsApi} from '../modules/tags/api/tagsApi';
import {tasksApi} from '../modules/tasks/api/tasksApi';
import AppShell from './AppShell';

vi.mock('../modules/tasks/api/tasksApi', () => ({
  tasksApi: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    updateTaskSchedule: vi.fn(),
    updateTaskDetails: vi.fn(),
    deleteTask: vi.fn(),
    batchScheduleDate: vi.fn(),
  },
}));

vi.mock('../modules/categories/api/categoriesApi', () => ({
  categoriesApi: {
    getCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

vi.mock('../modules/tags/api/tagsApi', () => ({
  tagsApi: {
    getTags: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}));

vi.mock('../modules/focus/api/focusApi', () => ({
  focusApi: {
    getRunningSession: vi.fn(),
    getSessions: vi.fn(),
    getSessionsByTask: vi.fn(),
    startSession: vi.fn(),
    stopSession: vi.fn(),
    pauseSession: vi.fn(),
    resumeSession: vi.fn(),
  },
}));

vi.mock('../modules/calendar/api/calendarApi', () => ({
  calendarApi: {
    getCalendarTasks: vi.fn(),
    getFocusSessions: vi.fn(),
    getUnscheduledTasks: vi.fn(),
    getAllDayWithoutTimeTasks: vi.fn(),
    updateTaskSchedule: vi.fn(),
    batchScheduleDate: vi.fn(),
    batchUnschedule: vi.fn(),
    createCalendarTask: vi.fn(),
  },
}));

describe('AppShell task library calendar navigation', () => {
  it('opens the full calendar from the task library action', async () => {
    vi.mocked(categoriesApi.getCategories).mockResolvedValue([{
      id: 1,
      userId: 1,
      name: '工作',
      color: '#ef4444',
      sortOrder: 1,
      createdAt: '',
      updatedAt: '',
    }]);
    vi.mocked(tagsApi.getTags).mockResolvedValue([]);
    vi.mocked(tasksApi.getTasks).mockResolvedValue([{
      id: 1,
      userId: 1,
      categoryId: 1,
      title: '写周报',
      plannedDate: '2026-06-03',
      allDay: true,
      status: 'TODO',
      priority: null,
      tagIds: [],
      createdAt: '',
      updatedAt: '',
    }]);
    vi.mocked(focusApi.getRunningSession).mockResolvedValue({session: null});
    vi.mocked(focusApi.getSessions).mockResolvedValue([]);
    vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
    vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);
    vi.mocked(calendarApi.getUnscheduledTasks).mockResolvedValue([]);
    vi.mocked(calendarApi.getAllDayWithoutTimeTasks).mockResolvedValue([]);

    render(<AppShell />);

    fireEvent.click(screen.getByRole('button', {name: '任务库'}));
    fireEvent.click(await screen.findByRole('button', {name: '去日历安排'}));

    await waitFor(() => expect(screen.getByRole('heading', {name: '日历'})).toBeInTheDocument());
    expect(screen.getByRole('heading', {name: '安排任务'})).toBeInTheDocument();
  });
});

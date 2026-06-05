import {describe, expect, it, vi} from 'vitest';

import {FocusService} from './service';

describe('FocusService', () => {
  it('marks task IN_PROGRESS when a session starts and resets it on stop', () => {
    const task = {
      id: 1,
      userId: 1,
      categoryId: 1,
      title: '任务',
      plannedDate: '2026-06-05',
      status: 'TODO' as const,
      createdAt: '',
      updatedAt: '',
    };
    const updateStatus = vi.fn((_taskId: number, _userId: number, status: 'TODO' | 'IN_PROGRESS') => {
      const updatedTask = {
        ...task,
        status,
      };
      Object.assign(task, updatedTask);
      return updatedTask;
    });
    const tasks = {
      getById: vi.fn(() => task),
      updateStatus,
    };
    const sessions = {
      getRunningByUser: vi
        .fn()
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({
          id: 1,
          taskId: 1,
          userId: 1,
          startedAt: '2026-06-05T00:00:00.000Z',
          status: 'RUNNING' as const,
          createdAt: '2026-06-05T00:00:00.000Z',
        }),
      listByDateRange: vi.fn(),
      listByTask: vi.fn(),
      createRunning: vi.fn(() => ({
        id: 1,
        taskId: 1,
        userId: 1,
        startedAt: '2026-06-05T00:00:00.000Z',
        status: 'RUNNING' as const,
        createdAt: '2026-06-05T00:00:00.000Z',
      })),
      stop: vi.fn(() => ({
        id: 1,
        taskId: 1,
        userId: 1,
        startedAt: '2026-06-05T00:00:00.000Z',
        endedAt: '2026-06-05T00:30:00.000Z',
        durationSeconds: 1800,
        status: 'COMPLETED' as const,
        createdAt: '2026-06-05T00:00:00.000Z',
      })),
    };

    const service = new FocusService(tasks, sessions);
    const started = service.start({taskId: 1, userId: 1});
    const stopped = service.stop({sessionId: 1, userId: 1});

    expect(started.status).toBe('RUNNING');
    expect(stopped.status).toBe('COMPLETED');
    expect(updateStatus).toHaveBeenNthCalledWith(1, 1, 1, 'IN_PROGRESS');
    expect(updateStatus).toHaveBeenNthCalledWith(2, 1, 1, 'TODO');
  });
});

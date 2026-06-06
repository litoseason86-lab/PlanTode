import type {FocusSessionRepository} from '../focus/repository';
import {AppError} from '../../shared/errors/appError';
import type {CategoryRepository} from '../categories/repository';
import type {
  BatchTaskScheduleInput,
  CreateTaskInput,
  ScheduledFilter,
  TaskRepository,
  UpdateTaskScheduleInput,
} from './repository';
import {TASK_STATUSES, type TaskStatus} from '../../../shared/domain/status';
import {normalizeTaskSchedule, type TaskScheduleRuleInput} from './scheduleRules';

interface TaskListFilters {
  userId: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: TaskStatus;
  categoryId?: number;
  scheduled?: ScheduledFilter;
  query?: string;
}

export class TasksService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly categories: Pick<CategoryRepository, 'getById'>,
    private readonly focusSessions: Pick<FocusSessionRepository, 'getRunningByUser' | 'stop'>,
  ) {}

  list(filters: TaskListFilters) {
    return this.tasks.listByFilters({
      userId: filters.userId,
      plannedDate: filters.date,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      status: filters.status,
      categoryId: filters.categoryId,
      scheduled: filters.scheduled,
      query: filters.query,
    });
  }

  private normalizeSchedule(input: {taskId: number; userId: number} & TaskScheduleRuleInput): UpdateTaskScheduleInput {
    return {
      taskId: input.taskId,
      userId: input.userId,
      ...normalizeTaskSchedule(input, {
        allowMissingPlannedDate: true,
        requireAllDay: false,
      }),
    };
  }

  private assertPositiveTaskIds(taskIds: number[]): void {
    if (taskIds.length === 0) {
      throw new AppError(400, 'taskIds must be a non-empty array');
    }
    if (taskIds.some((taskId) => !Number.isSafeInteger(taskId) || taskId <= 0)) {
      throw new AppError(400, 'taskIds must contain positive integers');
    }
    if (new Set(taskIds).size !== taskIds.length) {
      throw new AppError(400, 'taskIds must be unique');
    }
  }

  private assertBatchTasksExist(userId: number, taskIds: number[]): void {
    this.assertPositiveTaskIds(taskIds);

    for (const taskId of taskIds) {
      const task = this.tasks.getById(taskId, userId);
      if (!task) {
        throw new AppError(404, 'Task not found');
      }
    }
  }

  create(input: CreateTaskInput) {
    const title = input.title.trim();
    if (!title) {
      throw new AppError(400, 'Task title is required');
    }

    const category = this.categories.getById(input.categoryId, input.userId);
    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    const scheduleInput = {
      taskId: 0,
      userId: input.userId,
      plannedDate: input.plannedDate,
      plannedEndDate: input.plannedEndDate,
      startAt: input.startAt,
      endAt: input.endAt,
      allDay: input.allDay,
    };
    const normalizedSchedule = this.normalizeSchedule(scheduleInput);

    return this.tasks.create({
      ...input,
      plannedDate: normalizedSchedule.plannedDate,
      plannedEndDate: normalizedSchedule.plannedEndDate,
      startAt: normalizedSchedule.startAt,
      endAt: normalizedSchedule.endAt,
      allDay: normalizedSchedule.allDay,
      title,
    });
  }

  updateSchedule(input: UpdateTaskScheduleInput) {
    const existing = this.tasks.getById(input.taskId, input.userId);
    if (!existing) {
      throw new AppError(404, 'Task not found');
    }

    const updated = this.tasks.updateSchedule(this.normalizeSchedule(input));
    if (!updated) {
      throw new AppError(404, 'Task not found');
    }

    return updated;
  }

  updateStatus(taskId: number, userId: number, status: TaskStatus) {
    if (!TASK_STATUSES.includes(status)) {
      throw new AppError(400, `Status must be one of: ${TASK_STATUSES.join(', ')}`);
    }

    const runningSession = this.focusSessions.getRunningByUser(userId);

    if (status === 'IN_PROGRESS') {
      if (!runningSession || runningSession.taskId !== taskId) {
        throw new AppError(409, 'Use the focus session start endpoint to mark a task as in progress.');
      }
    }

    if (runningSession && runningSession.taskId === taskId && status !== 'IN_PROGRESS') {
      this.focusSessions.stop({
        sessionId: runningSession.id,
        userId,
      });
    }

    const updated = this.tasks.updateStatus(taskId, userId, status);
    if (!updated) {
      throw new AppError(404, 'Task not found');
    }

    return updated;
  }

  delete(taskId: number, userId: number) {
    const removed = this.tasks.remove(taskId, userId);
    if (!removed) {
      throw new AppError(404, 'Task not found');
    }
  }

  batchScheduleDate(input: {userId: number; taskIds: number[]; plannedDate: string}) {
    this.assertBatchTasksExist(input.userId, input.taskIds);

    const updates: BatchTaskScheduleInput[] = input.taskIds.map((taskId) => {
      const update = this.normalizeSchedule({
        taskId,
        userId: input.userId,
        plannedDate: input.plannedDate,
        plannedEndDate: undefined,
        startAt: undefined,
        endAt: undefined,
        allDay: true,
      });
      return update;
    });

    return this.tasks.batchUpdateSchedules(updates);
  }

  batchUnschedule(input: {userId: number; taskIds: number[]}) {
    this.assertBatchTasksExist(input.userId, input.taskIds);

    const updates: BatchTaskScheduleInput[] = input.taskIds.map((taskId) => this.normalizeSchedule({
      taskId,
      userId: input.userId,
      plannedDate: undefined,
      plannedEndDate: undefined,
      startAt: undefined,
      endAt: undefined,
      allDay: true,
    }));

    return this.tasks.batchUpdateSchedules(updates);
  }
}

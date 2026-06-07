import type {
  CreateTaskInput,
  TaskFilters,
  TaskRepository,
  UpdateTaskDetailsInput,
  UpdateTaskScheduleInput,
} from '../../../modules/tasks/repository';
import type {Task, TaskTag} from '../../../../shared/domain/entities';
import type {TaskStatus} from '../../../../shared/domain/status';
import {taskIntersectsDateRange, toCanonicalTask} from '../../../../shared/lib/schedule';
import type {DatabaseSchema, StoredTask} from '../../databaseSchema';
import {JsonFileStore} from '../fileStore';

function buildTagIdsByTaskId(taskTags: TaskTag[], userId: number): Map<number, number[]> {
  const tagIdsByTaskId = new Map<number, number[]>();
  for (const taskTag of taskTags) {
    if (taskTag.userId !== userId) {
      continue;
    }
    const tagIds = tagIdsByTaskId.get(taskTag.taskId) ?? [];
    tagIds.push(taskTag.tagId);
    tagIdsByTaskId.set(taskTag.taskId, tagIds);
  }
  return tagIdsByTaskId;
}

function toTask(task: StoredTask, tagIdsByTaskId: Map<number, number[]>): Task {
  return toCanonicalTask({
    ...task,
    priority: task.priority ?? null,
    tagIds: tagIdsByTaskId.get(task.id) ?? [],
  });
}

function replaceTaskTags(data: DatabaseSchema, input: {taskId: number; userId: number; tagIds: number[]}): void {
  data.taskTags = data.taskTags.filter((item) => !(item.userId === input.userId && item.taskId === input.taskId));
  const now = new Date().toISOString();
  for (const tagId of input.tagIds) {
    data.taskTags.push({
      taskId: input.taskId,
      userId: input.userId,
      tagId,
      createdAt: now,
    });
  }
}

function matchesScheduledFilter(task: Task, scheduled: TaskFilters['scheduled']): boolean {
  if (!scheduled) return true;
  if (scheduled === 'unscheduled') return !task.plannedDate;
  if (scheduled === 'scheduled') return Boolean(task.plannedDate);
  return Boolean(task.plannedDate && task.allDay && !task.plannedEndDate && !task.startAt && !task.endAt);
}

function matchesQuery(task: Task, query: string | undefined): boolean {
  if (!query) return true;
  return task.title.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

function applyScheduleToTask(task: Task, input: UpdateTaskScheduleInput): void {
  task.plannedDate = input.plannedDate;
  task.plannedEndDate = input.plannedDate && input.allDay ? input.plannedEndDate : undefined;
  task.startAt = input.plannedDate && !input.allDay ? input.startAt : undefined;
  task.endAt = input.plannedDate && !input.allDay ? input.endAt : undefined;
  task.allDay = input.plannedDate ? input.allDay : true;
  task.updatedAt = new Date().toISOString();
}

export class TaskJsonRepository implements TaskRepository {
  constructor(private readonly store: JsonFileStore) {}

  listByFilters(filters: TaskFilters): Task[] {
    const data = this.store.read();
    const tagIdsByTaskId = buildTagIdsByTaskId(data.taskTags, filters.userId);
    return data
      .tasks.map((task) => toTask(task, tagIdsByTaskId))
      .filter((task) => {
        if (task.userId !== filters.userId) return false;
        if (filters.plannedDate && !taskIntersectsDateRange(task, filters.plannedDate, filters.plannedDate)) return false;
        if (filters.dateFrom && filters.dateTo && !taskIntersectsDateRange(task, filters.dateFrom, filters.dateTo)) return false;
        if (filters.status && task.status !== filters.status) return false;
        if (filters.categoryId && task.categoryId !== filters.categoryId) return false;
        if (filters.priority === 'none' && task.priority !== null) return false;
        if (filters.priority && filters.priority !== 'none' && task.priority !== filters.priority) return false;
        if (filters.tagIds?.length && !filters.tagIds.every((tagId) => task.tagIds.includes(tagId))) return false;
        if (!matchesScheduledFilter(task, filters.scheduled)) return false;
        if (!matchesQuery(task, filters.query)) return false;
        return true;
      })
      .sort((left, right) => {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      });
  }

  getById(taskId: number, userId: number): Task | undefined {
    const data = this.store.read();
    const task = data.tasks.find((item) => item.id === taskId && item.userId === userId);
    return task ? toTask(task, buildTagIdsByTaskId(data.taskTags, userId)) : undefined;
  }

  create(input: CreateTaskInput): Task {
    return this.store.update((data) => {
      data.sequences.tasks += 1;
      const now = new Date().toISOString();
      const task: StoredTask = {
        id: data.sequences.tasks,
        userId: input.userId,
        categoryId: input.categoryId,
        title: input.title.trim(),
        plannedDate: input.plannedDate,
        plannedEndDate: input.plannedDate && (input.allDay ?? true) ? input.plannedEndDate : undefined,
        startAt: input.plannedDate && input.allDay === false ? input.startAt : undefined,
        endAt: input.plannedDate && input.allDay === false ? input.endAt : undefined,
        allDay: input.plannedDate ? input.allDay ?? true : true,
        status: 'TODO',
        priority: input.priority ?? null,
        tagIds: [],
        createdAt: now,
        updatedAt: now,
      };
      data.tasks.push(task);
      replaceTaskTags(data, {taskId: task.id, userId: input.userId, tagIds: input.tagIds ?? []});
      return toTask(task, buildTagIdsByTaskId(data.taskTags, input.userId));
    });
  }

  updateDetails(input: UpdateTaskDetailsInput): Task | undefined {
    return this.store.update((data) => {
      const task = data.tasks.find((item) => item.id === input.taskId && item.userId === input.userId);
      if (!task) {
        return undefined;
      }

      task.title = input.title.trim();
      task.categoryId = input.categoryId;
      task.priority = input.priority;
      task.updatedAt = new Date().toISOString();
      replaceTaskTags(data, input);

      return toTask(task, buildTagIdsByTaskId(data.taskTags, input.userId));
    });
  }

  updateStatus(taskId: number, userId: number, status: TaskStatus): Task | undefined {
    return this.store.update((data) => {
      const task = data.tasks.find((item) => item.id === taskId && item.userId === userId);
      if (!task) {
        return undefined;
      }
      task.status = status;
      task.updatedAt = new Date().toISOString();
      return toTask(task, buildTagIdsByTaskId(data.taskTags, userId));
    });
  }

  updateSchedule(input: UpdateTaskScheduleInput): Task | undefined {
    return this.store.update((data) => {
      const task = data.tasks.find((item) => item.id === input.taskId && item.userId === input.userId);
      if (!task) {
        return undefined;
      }

      applyScheduleToTask(task, input);

      return toTask(task, buildTagIdsByTaskId(data.taskTags, input.userId));
    });
  }

  batchUpdateSchedules(inputs: UpdateTaskScheduleInput[]): Task[] {
    return this.store.update((data) => {
      const targets = inputs.map((input) => {
        const task = data.tasks.find((item) => item.id === input.taskId && item.userId === input.userId);
        if (!task) {
          throw new Error('Task not found');
        }
        return {task, input};
      });

      for (const {task, input} of targets) {
        applyScheduleToTask(task, input);
      }

      return targets.map(({task}) => toTask(task, buildTagIdsByTaskId(data.taskTags, task.userId)));
    });
  }

  remove(taskId: number, userId: number): boolean {
    return this.store.update((data) => {
      const index = data.tasks.findIndex((task) => task.id === taskId && task.userId === userId);
      if (index === -1) {
        return false;
      }

      data.tasks.splice(index, 1);
      data.taskExecutionSessions = data.taskExecutionSessions.filter((session) => {
        return !(session.taskId === taskId && session.userId === userId);
      });
      data.taskTags = data.taskTags.filter((taskTag) => {
        return !(taskTag.taskId === taskId && taskTag.userId === userId);
      });
      return true;
    });
  }
}

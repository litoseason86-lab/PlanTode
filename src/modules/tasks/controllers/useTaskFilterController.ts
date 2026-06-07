import {useMemo, useState} from 'react';

import type {Task} from '../../../../shared/domain/entities';
import type {TaskPriority, TaskStatus} from '../../../../shared/domain/status';
import {addIsoDateDays, getWeekStart, toIsoDate} from '../../../../shared/lib/date';

export type TaskFilterDateScope = 'today' | 'this-week' | 'all' | 'unscheduled';
export type TaskPriorityFilter = 'all' | 'none' | TaskPriority;

export interface TaskMetadataFilterState {
  category: string;
  status: 'all' | TaskStatus;
  dateScope: TaskFilterDateScope;
  today: string;
  tagIds: number[];
  priority: TaskPriorityFilter;
  query: string;
}

function isInCurrentWeek(plannedDate: string | undefined, today: string): boolean {
  if (!plannedDate) {
    return false;
  }
  const weekStart = getWeekStart(today);
  const weekEnd = addIsoDateDays(weekStart, 6);
  return plannedDate >= weekStart && plannedDate <= weekEnd;
}

export function filterTasksWithMetadata(tasks: Task[], filters: TaskMetadataFilterState): Task[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return tasks.filter((task) => {
    if (filters.category !== 'all' && task.categoryId !== Number(filters.category)) {
      return false;
    }

    if (filters.status !== 'all' && task.status !== filters.status) {
      return false;
    }

    if (filters.dateScope === 'today' && task.plannedDate !== filters.today) {
      return false;
    }

    if (filters.dateScope === 'unscheduled' && task.plannedDate) {
      return false;
    }

    if (filters.dateScope === 'this-week' && !isInCurrentWeek(task.plannedDate, filters.today)) {
      return false;
    }

    if (!filters.tagIds.every((tagId) => task.tagIds.includes(tagId))) {
      return false;
    }

    if (filters.priority === 'none' && task.priority !== null) {
      return false;
    }

    if (filters.priority !== 'all' && filters.priority !== 'none' && task.priority !== filters.priority) {
      return false;
    }

    return !query || task.title.toLocaleLowerCase().includes(query);
  });
}

export function useTaskFilterController(tasks: Task[], today = toIsoDate(new Date())) {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const [dateScope, setDateScope] = useState<TaskFilterDateScope>('today');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [priority, setPriority] = useState<TaskPriorityFilter>('all');
  const [query, setQuery] = useState('');

  const filteredTaskItems = useMemo(
    () => filterTasksWithMetadata(tasks, {
      category,
      status,
      dateScope,
      today,
      tagIds,
      priority,
      query,
    }),
    [category, dateScope, priority, query, status, tagIds, tasks, today],
  );

  return {
    filters: {
      category,
      status,
      dateScope,
      tagIds,
      priority,
      query,
      setCategory,
      setStatus,
      setDateScope,
      setTagIds,
      setPriority,
      setQuery,
    },
    filteredTaskItems,
  };
}

import {useMemo} from 'react';

import type {Task} from '../../../../shared/domain/entities';
import type {TaskStatus} from '../../../../shared/domain/status';
import {addIsoDateDays, getWeekStart} from '../../../../shared/lib/date';

export interface TaskFilterState {
  category: string;
  status: 'all' | TaskStatus;
  dateScope: 'today' | 'this-week' | 'all' | 'unscheduled';
  today: string;
}

export function filterTasks(tasks: Task[], filters: TaskFilterState): Task[] {
  return tasks.filter((task) => {
    if (filters.category !== 'all' && task.categoryId !== Number(filters.category)) {
      return false;
    }

    if (filters.status !== 'all' && task.status !== filters.status) {
      return false;
    }

    if (filters.dateScope === 'today') {
      return task.plannedDate === filters.today;
    }

    if (filters.dateScope === 'unscheduled') {
      return !task.plannedDate;
    }

    if (filters.dateScope === 'this-week') {
      if (!task.plannedDate) {
        return false;
      }
      const weekStart = getWeekStart(filters.today);
      const weekEnd = addIsoDateDays(weekStart, 6);
      return task.plannedDate >= weekStart && task.plannedDate <= weekEnd;
    }

    return true;
  });
}

export function useTasksController(tasks: Task[], filters: TaskFilterState) {
  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);

  return {
    filteredTasks,
  };
}

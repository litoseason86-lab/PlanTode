import {useCallback, useEffect, useState} from 'react';

import type {Task} from '../../../../shared/domain/entities';
import type {TaskPriority} from '../../../../shared/domain/status';
import {toIsoDate} from '../../../../shared/lib/date';

export interface TaskDetailsDraft {
  title: string;
  categoryId: number;
  tagIds: number[];
  priority: TaskPriority | null;
}

interface CreateScheduleDefaults {
  plannedDate: string;
  unscheduled: boolean;
}

interface UseTaskDraftControllerInput {
  defaultCategoryId: number;
}

function taskToDetailsDraft(task: Task): TaskDetailsDraft {
  return {
    title: task.title,
    categoryId: task.categoryId,
    tagIds: [...task.tagIds],
    priority: task.priority,
  };
}

export function useTaskDraftController({defaultCategoryId}: UseTaskDraftControllerInput) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [plannedDate, setPlannedDate] = useState(() => toIsoDate(new Date()));
  const [unscheduled, setUnscheduled] = useState(true);
  const [scheduleTouched, setScheduleTouched] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [details, setDetails] = useState<TaskDetailsDraft | null>(null);

  useEffect(() => {
    if (!categoryId && defaultCategoryId) {
      setCategoryId(defaultCategoryId);
    }
  }, [categoryId, defaultCategoryId]);

  function openEditTask(task: Task) {
    setEditingTask(task);
    setDetails(taskToDetailsDraft(task));
  }

  function closeEditTask() {
    setEditingTask(null);
    setDetails(null);
  }

  function updateDetails(patch: Partial<TaskDetailsDraft>) {
    setDetails((current) => current ? {...current, ...patch} : current);
  }

  const resetCreateDraft = useCallback((nextCategoryId = defaultCategoryId, scheduleDefaults?: CreateScheduleDefaults) => {
    setTitle('');
    setCategoryId(nextCategoryId);
    setTagIds([]);
    setPriority(null);
    if (scheduleDefaults) {
      setPlannedDate(scheduleDefaults.plannedDate);
      setUnscheduled(scheduleDefaults.unscheduled);
    }
    setScheduleTouched(false);
  }, [defaultCategoryId]);

  const setCreatePlannedDate = useCallback((value: string) => {
    setScheduleTouched(true);
    setPlannedDate(value);
  }, []);

  const setCreateUnscheduled = useCallback((value: boolean) => {
    setScheduleTouched(true);
    setUnscheduled(value);
  }, []);

  const applyScheduleDefaults = useCallback((defaults: CreateScheduleDefaults) => {
    if (scheduleTouched) {
      return;
    }
    setPlannedDate(defaults.plannedDate);
    setUnscheduled(defaults.unscheduled);
  }, [scheduleTouched]);

  return {
    createDraft: {
      title,
      categoryId,
      tagIds,
      priority,
      plannedDate,
      unscheduled,
      setTitle,
      setCategoryId,
      setTagIds,
      setPriority,
      setPlannedDate: setCreatePlannedDate,
      setUnscheduled: setCreateUnscheduled,
      applyScheduleDefaults,
      reset: resetCreateDraft,
    },
    editDraft: {
      task: editingTask,
      details,
      setTitle: (value: string) => updateDetails({title: value}),
      setCategoryId: (value: number) => updateDetails({categoryId: value}),
      setTagIds: (value: number[]) => updateDetails({tagIds: value}),
      setPriority: (value: TaskPriority | null) => updateDetails({priority: value}),
      setDetails,
    },
    openEditTask,
    closeEditTask,
  };
}

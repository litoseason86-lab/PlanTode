import {useCallback, useEffect, useMemo} from 'react';

import type {Category, Tag, Task} from '../../../../shared/domain/entities';
import type {TaskStatus} from '../../../../shared/domain/status';
import {toIsoDate} from '../../../../shared/lib/date';
import {getErrorMessage} from '../../../app/errors';
import {useTagActions} from '../../tags/controllers/useTagActions';
import {useTaskDraftController} from './useTaskDraftController';
import {type TaskFilterDateScope, useTaskFilterController} from './useTaskFilterController';
import {useTaskMutations} from './useTaskMutations';

interface UseTasksPanelControllerInput {
  categories: Category[];
  tags: Tag[];
  allTasks: Task[];
  today?: string;
  setLoading: (loading: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  refreshTags: () => Promise<Tag[]>;
  refreshAllTasks: () => Promise<Task[]>;
  loadTasksForSelectedDate: () => Promise<unknown>;
  stopRunningSessionForTask: (taskId: number) => Promise<void>;
  refreshReports: () => Promise<void>;
  updateTaskStatus: (taskId: number, status: TaskStatus) => void;
  startSession: (task: Task) => void;
}

function buildCreateScheduleDefaults(dateScope: TaskFilterDateScope, today: string) {
  return {
    plannedDate: today,
    unscheduled: dateScope === 'unscheduled',
  };
}

export function useTasksPanelController({
  categories,
  tags,
  allTasks,
  today,
  setLoading,
  showToast,
  refreshTags,
  refreshAllTasks,
  loadTasksForSelectedDate,
  stopRunningSessionForTask,
  refreshReports,
  updateTaskStatus,
  startSession,
}: UseTasksPanelControllerInput) {
  const defaultCategoryId = categories[0]?.id ?? 0;
  const taskLibraryToday = today ?? toIsoDate(new Date());
  const draftController = useTaskDraftController({defaultCategoryId});
  const applyScheduleDefaults = draftController.createDraft.applyScheduleDefaults;
  const filterController = useTaskFilterController(allTasks, taskLibraryToday);
  const createScheduleDefaults = useMemo(
    () => buildCreateScheduleDefaults(filterController.filters.dateScope, taskLibraryToday),
    [filterController.filters.dateScope, taskLibraryToday],
  );
  const tagActions = useTagActions({refreshTags, refreshAllTasks});
  const taskMutations = useTaskMutations({
    refreshAllTasks,
    loadTasksForSelectedDate,
    stopRunningSessionForTask,
    refreshReports,
  });

  useEffect(() => {
    applyScheduleDefaults(createScheduleDefaults);
  }, [applyScheduleDefaults, createScheduleDefaults]);

  const createTask = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    const title = draftController.createDraft.title.trim();
    if (!title) {
      showToast('行动主题不能留空啦', 'error');
      return;
    }

    const categoryId = draftController.createDraft.categoryId || defaultCategoryId;
    if (!categoryId) {
      showToast('请先新建至少一个分类板块', 'error');
      return;
    }

    try {
      setLoading(true);
      await taskMutations.createTask({
        title,
        categoryId,
        tagIds: draftController.createDraft.tagIds,
        priority: draftController.createDraft.priority,
        plannedDate: draftController.createDraft.unscheduled
          ? undefined
          : draftController.createDraft.plannedDate,
      });
      draftController.createDraft.reset(categoryId, createScheduleDefaults);
      showToast('任务已成功下派！');
    } catch (err) {
      showToast(getErrorMessage(err, '生成行动项失败'), 'error');
    } finally {
      setLoading(false);
    }
  }, [createScheduleDefaults, defaultCategoryId, draftController.createDraft, setLoading, showToast, taskMutations]);

  const updateTaskDetails = useCallback(async (details: {
    title: string;
    categoryId: number;
    tagIds: number[];
    priority: Task['priority'];
  }) => {
    const editingTask = draftController.editDraft.task;
    if (!editingTask) {
      return;
    }

    try {
      setLoading(true);
      await taskMutations.updateTaskDetails({
        taskId: editingTask.id,
        ...details,
      });
      draftController.closeEditTask();
      showToast('任务详情已更新');
    } catch (err) {
      showToast(getErrorMessage(err, '更新任务详情失败'), 'error');
    } finally {
      setLoading(false);
    }
  }, [draftController, setLoading, showToast, taskMutations]);

  const deleteTask = useCallback(async (taskId: number) => {
    const task = allTasks.find((item) => item.id === taskId);
    const title = task?.title ?? String(taskId);
    if (!window.confirm(`确定删除「${title}」？关联专注记录也会同步删除。`)) {
      return;
    }

    try {
      setLoading(true);
      await taskMutations.deleteTask(taskId);
      showToast('任务已删除');
    } catch (err) {
      showToast(getErrorMessage(err, '删除任务失败'), 'error');
    } finally {
      setLoading(false);
    }
  }, [allTasks, setLoading, showToast, taskMutations]);

  return {
    categories,
    tags,
    allTasks,
    createDraft: draftController.createDraft,
    editDraft: draftController.editDraft,
    filters: filterController.filters,
    filteredTaskItems: filterController.filteredTaskItems,
    mutations: {
      createTask,
      updateTaskDetails,
      deleteTask,
    },
    tagActions,
    statusActions: {
      updateTaskStatus,
      startSession,
    },
    openEditTask: draftController.openEditTask,
    closeEditTask: draftController.closeEditTask,
  };
}

export type TasksPanelController = ReturnType<typeof useTasksPanelController>;

import {useEffect, useRef, useState} from 'react';

import type {Category, Task} from '../../../../shared/domain/entities';
import {getErrorMessage} from '../../../app/errors';
import {tasksApi} from '../../tasks/api/tasksApi';

interface UseTodayQuickCreateControllerArgs {
  categories: Category[];
  selectedDate: string;
  setLoading: (loading: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  refreshAllTasks: () => Promise<Task[]>;
  loadTasksForSelectedDate: () => Promise<unknown>;
}

interface CreateTodayTaskInput {
  title?: string;
  categoryId?: number;
}

export interface TodayQuickCreateController {
  title: string;
  categoryId: number;
  isCreating: boolean;
  setTitle: (value: string) => void;
  setCategoryId: (value: number) => void;
  createTodayTask: (input?: CreateTodayTaskInput) => Promise<void>;
}

export function useTodayQuickCreateController({
  categories,
  selectedDate,
  setLoading,
  showToast,
  refreshAllTasks,
  loadTasksForSelectedDate,
}: UseTodayQuickCreateControllerArgs): TodayQuickCreateController {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingRef = useRef(false);

  useEffect(() => {
    if (categories.length === 0) {
      if (categoryId !== 0) {
        setCategoryId(0);
      }
      return;
    }

    if (!categories.some((category) => category.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  async function createTodayTask(input: CreateTodayTaskInput = {}) {
    if (isCreatingRef.current) {
      return;
    }

    const nextTitle = (input.title ?? title).trim();
    if (!nextTitle) {
      showToast('行动主题不能留空啦', 'error');
      return;
    }

    const nextCategoryId = input.categoryId ?? (categoryId || categories[0]?.id || 0);
    if (!nextCategoryId) {
      showToast('请先新建至少一个分类板块', 'error');
      return;
    }

    isCreatingRef.current = true;
    setIsCreating(true);
    setLoading(true);
    try {
      await tasksApi.createTask({
        title: nextTitle,
        categoryId: nextCategoryId,
        plannedDate: selectedDate,
        tagIds: [],
        priority: null,
      });
      setTitle('');
      const refreshResults = await Promise.allSettled([
        refreshAllTasks(),
        loadTasksForSelectedDate(),
      ]);
      const failedRefresh = refreshResults.find((result) => result.status === 'rejected');
      if (failedRefresh) {
        showToast('任务已创建，但刷新列表失败', 'error');
      } else {
        showToast('任务已成功下派！');
      }
    } catch (err) {
      showToast(getErrorMessage(err, '生成行动项失败'), 'error');
    } finally {
      isCreatingRef.current = false;
      setIsCreating(false);
      setLoading(false);
    }
  }

  return {
    title,
    categoryId,
    isCreating,
    setTitle,
    setCategoryId,
    createTodayTask,
  };
}

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {Category, Task, TaskExecutionSession} from '../../../../shared/domain/entities';
import {toIsoDate} from '../../../../shared/lib/date';
import {calendarApi} from '../api/calendarApi';
import {getCalendarRange, groupTasksByDate, type CalendarView} from './calendarLayout';
import {
  filterTasksForCalendar,
  loadCalendarSettings,
  saveCalendarSettings,
  type CalendarSettings,
} from './calendarSettings';

interface UseCalendarControllerArgs {
  categories: Category[];
  initialDate?: string;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export function useCalendarController({categories, initialDate, showToast}: UseCalendarControllerArgs) {
  const showToastRef = useRef(showToast);
  const [view, setView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(() => initialDate ?? toIsoDate(new Date()));
  const [settings, setSettingsState] = useState<CalendarSettings>(() => loadCalendarSettings());
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [focusSessions, setFocusSessions] = useState<TaskExecutionSession[]>([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => getCalendarRange(view, anchorDate), [view, anchorDate]);
  const tasks = useMemo(() => filterTasksForCalendar(rawTasks, settings), [rawTasks, settings]);
  const tasksByDate = useMemo(() => groupTasksByDate(tasks, range.dateFrom, range.dateTo), [tasks, range.dateFrom, range.dateTo]);

  const setSettings = useCallback((next: CalendarSettings) => {
    setSettingsState(next);
    saveCalendarSettings(next);
  }, []);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const refreshCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const categoryId = settings.visibleCategoryIds.length === 1 ? settings.visibleCategoryIds[0] : undefined;
      const [taskData, sessionData] = await Promise.all([
        calendarApi.getCalendarTasks({...range, categoryId}),
        settings.showFocusSessions ? calendarApi.getFocusSessions(range) : Promise.resolve([]),
      ]);
      setRawTasks(taskData);
      setFocusSessions(sessionData);
    } catch (error) {
      showToastRef.current(error instanceof Error ? error.message : '日历数据加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [range, settings.showFocusSessions, settings.visibleCategoryIds]);

  useEffect(() => {
    void refreshCalendarData();
  }, [refreshCalendarData]);

  async function scheduleTaskForDate(taskId: number, plannedDate: string) {
    await calendarApi.updateTaskSchedule(taskId, {
      plannedDate,
      plannedEndDate: undefined,
      startAt: undefined,
      endAt: undefined,
      allDay: true,
    });
    await refreshCalendarData();
  }

  async function createAllDayTask(plannedDate: string, title = '新任务') {
    const categoryId = categories[0]?.id;
    if (!categoryId) {
      showToast('请先创建分类', 'error');
      return;
    }

    await calendarApi.createCalendarTask({
      title,
      categoryId,
      plannedDate,
      allDay: true,
    });
    await refreshCalendarData();
  }

  return {
    view,
    setView,
    anchorDate,
    setAnchorDate,
    range,
    settings,
    setSettings,
    categories,
    rawTasks,
    tasks,
    tasksByDate,
    focusSessions,
    loading,
    refreshCalendarData,
    createAllDayTask,
    scheduleTaskForDate,
  };
}

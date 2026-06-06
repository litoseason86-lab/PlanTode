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
  const refreshSeqRef = useRef(0);
  const [view, setView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(() => initialDate ?? toIsoDate(new Date()));
  const [settings, setSettingsState] = useState<CalendarSettings>(() => loadCalendarSettings());
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [focusSessions, setFocusSessions] = useState<TaskExecutionSession[]>([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => getCalendarRange(view, anchorDate), [view, anchorDate]);
  const tasks = useMemo(() => filterTasksForCalendar(rawTasks, settings), [rawTasks, settings]);
  const tasksByDate = useMemo(() => groupTasksByDate(tasks, range.dateFrom, range.dateTo), [tasks, range.dateFrom, range.dateTo]);
  const rangeRef = useRef(range);
  const settingsRef = useRef(settings);

  rangeRef.current = range;
  settingsRef.current = settings;

  const setSettings = useCallback((next: CalendarSettings) => {
    setSettingsState(next);
    saveCalendarSettings(next);
  }, []);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const refreshCalendarData = useCallback(async () => {
    const refreshSeq = refreshSeqRef.current + 1;
    refreshSeqRef.current = refreshSeq;
    const currentRange = rangeRef.current;
    const currentSettings = settingsRef.current;
    setLoading(true);
    try {
      const categoryId = currentSettings.visibleCategoryIds.length === 1 ? currentSettings.visibleCategoryIds[0] : undefined;
      const [taskData, sessionData] = await Promise.all([
        calendarApi.getCalendarTasks({...currentRange, categoryId}),
        currentSettings.showFocusSessions ? calendarApi.getFocusSessions(currentRange) : Promise.resolve([]),
      ]);
      if (refreshSeq !== refreshSeqRef.current) {
        return;
      }
      setRawTasks(taskData);
      setFocusSessions(sessionData);
    } catch (error) {
      if (refreshSeq === refreshSeqRef.current) {
        showToastRef.current(error instanceof Error ? error.message : '日历数据加载失败', 'error');
      }
    } finally {
      if (refreshSeq === refreshSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshCalendarData();
  }, [refreshCalendarData, range, settings.showFocusSessions, settings.visibleCategoryIds]);

  async function scheduleTaskForDate(taskId: number, plannedDate: string) {
    try {
      await calendarApi.updateTaskSchedule(taskId, {
        plannedDate,
        plannedEndDate: undefined,
        startAt: undefined,
        endAt: undefined,
        allDay: true,
      });
      await refreshCalendarData();
    } catch (error) {
      showToastRef.current(error instanceof Error ? error.message : '任务排期失败', 'error');
    }
  }

  async function createAllDayTask(plannedDate: string, title = '新任务') {
    const categoryId = categories[0]?.id;
    if (!categoryId) {
      showToastRef.current('请先创建分类', 'error');
      return;
    }

    try {
      await calendarApi.createCalendarTask({
        title,
        categoryId,
        plannedDate,
        allDay: true,
      });
      await refreshCalendarData();
    } catch (error) {
      showToastRef.current(error instanceof Error ? error.message : '任务创建失败', 'error');
    }
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

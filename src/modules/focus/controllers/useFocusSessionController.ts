import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {Task, TaskExecutionSession} from '../../../../shared/domain/entities';
import {getErrorMessage} from '../../../app/errors';
import {focusApi} from '../api/focusApi';
import {calculateEffectiveFocusSeconds, calculateFocusRingOffset, formatFocusElapsed} from './useFocusController';

type AppTab = 'today' | 'tasks' | 'categories' | 'daily' | 'weekly' | 'focus';

interface UseFocusSessionControllerArgs {
  tasks: Task[];
  allTasks: Task[];
  setActiveTab: (tab: AppTab) => void;
  setLoading: (loading: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  loadTasksForSelectedDate: () => Promise<unknown>;
  refreshAllTasks: () => Promise<Task[]>;
}

export function useFocusSessionController({
  tasks,
  allTasks,
  setActiveTab,
  setLoading,
  showToast,
  loadTasksForSelectedDate,
  refreshAllTasks,
}: UseFocusSessionControllerArgs) {
  const [runningSession, setRunningSession] = useState<TaskExecutionSession | null>(null);
  const [focusTimeElapsed, setFocusTimeElapsed] = useState(0);
  const [lastFinishedSessionTask, setLastFinishedSessionTask] = useState<Task | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const checkRunningSession = useCallback(async () => {
    try {
      const res = await focusApi.getRunningSession();
      if (res.session) {
        setRunningSession(res.session);
        setActiveTab('focus');
      } else {
        setRunningSession(null);
      }
    } catch (err) {
      console.error('Check session state error', err);
    }
  }, [setActiveTab]);

  useEffect(() => {
    if (runningSession) {
      const calculateDiff = () => calculateEffectiveFocusSeconds(runningSession);
      setFocusTimeElapsed(calculateDiff());
      if (runningSession.status === 'PAUSED') {
        return undefined;
      }
      timerRef.current = setInterval(() => setFocusTimeElapsed(calculateDiff()), 1000);
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setFocusTimeElapsed(0);
    return undefined;
  }, [runningSession]);

  const handleStartSession = useCallback(async (task: Task) => {
    try {
      setLoading(true);
      const session = await focusApi.startSession(task.id);
      setRunningSession(session);
      setActiveTab('focus');
      showToast(`✨ 进入「${task.title}」深度聚焦空间`);
      await loadTasksForSelectedDate();
      await refreshAllTasks();
    } catch (err) {
      showToast(getErrorMessage(err, '无法启动心流计时器'), 'error');
    } finally {
      setLoading(false);
    }
  }, [loadTasksForSelectedDate, refreshAllTasks, setActiveTab, setLoading, showToast]);

  const handleStopSession = useCallback(async () => {
    if (!runningSession) return;
    try {
      setLoading(true);
      const stopped = await focusApi.stopSession(runningSession.id);
      const originTask = tasks.find((task) => task.id === stopped.taskId) ?? allTasks.find((task) => task.id === stopped.taskId);
      if (originTask) {
        setLastFinishedSessionTask(originTask);
      }
      setRunningSession(null);
      showToast('这一阶段的高能专注已完美记入归属分类！');
      setActiveTab('today');
      await loadTasksForSelectedDate();
      await refreshAllTasks();
    } catch (err) {
      showToast(getErrorMessage(err, '终止心流阶段出现故障'), 'error');
    } finally {
      setLoading(false);
    }
  }, [allTasks, loadTasksForSelectedDate, refreshAllTasks, runningSession, setActiveTab, setLoading, showToast, tasks]);

  const handlePauseSession = useCallback(async () => {
    if (!runningSession) return;
    try {
      setLoading(true);
      const paused = await focusApi.pauseSession(runningSession.id);
      setRunningSession(paused);
      setFocusTimeElapsed(calculateEffectiveFocusSeconds(paused));
      showToast('专注已暂停，暂停时间不会计入统计');
    } catch (err) {
      showToast(getErrorMessage(err, '暂停专注失败'), 'error');
    } finally {
      setLoading(false);
    }
  }, [runningSession, setLoading, showToast]);

  const handleResumeSession = useCallback(async () => {
    if (!runningSession) return;
    try {
      setLoading(true);
      const resumed = await focusApi.resumeSession(runningSession.id);
      setRunningSession(resumed);
      setFocusTimeElapsed(calculateEffectiveFocusSeconds(resumed));
      showToast('继续专注');
    } catch (err) {
      showToast(getErrorMessage(err, '继续专注失败'), 'error');
    } finally {
      setLoading(false);
    }
  }, [runningSession, setLoading, showToast]);

  const focusController = useMemo(
    () => ({
      formattedElapsed: formatFocusElapsed(focusTimeElapsed),
      progressOffset: calculateFocusRingOffset(focusTimeElapsed),
    }),
    [focusTimeElapsed],
  );

  return {
    runningSession,
    setRunningSession,
    focusTimeElapsed,
    lastFinishedSessionTask,
    setLastFinishedSessionTask,
    checkRunningSession,
    handleStartSession,
    handleStopSession,
    handlePauseSession,
    handleResumeSession,
    formattedElapsed: focusController.formattedElapsed,
    progressOffset: focusController.progressOffset,
  };
}

import {useEffect, useMemo, useState, type FormEvent} from 'react';
import {
  Calendar,
  Loader2,
  Square,
} from 'lucide-react';

import type {Task} from '../../shared/domain/entities';
import type {TaskStatus} from '../../shared/domain/status';
import {CategoryPanel} from '../modules/categories/components/CategoryPanel';
import {useCategoryActions} from '../modules/categories/controllers/useCategoryActions';
import {DashboardPanel} from '../modules/dashboard/components/DashboardPanel';
import {buildTodayCategoryFocusData, getTaskFocusMinutes} from '../modules/dashboard/controllers/useDashboardController';
import {FocusPanel} from '../modules/focus/components/FocusPanel';
import {useFocusSessionController} from '../modules/focus/controllers/useFocusSessionController';
import {DailyReportPanel} from '../modules/reports/components/DailyReportPanel';
import {useReportStatsController} from '../modules/reports/controllers/useReportStatsController';
import {WeeklyReviewPanel} from '../modules/reports/components/WeeklyReviewPanel';
import {type AppTab} from './navigation';
import {THEME_STYLES, type ThemeId} from './theme';
import {tasksApi} from '../modules/tasks/api/tasksApi';
import {filterTasks} from '../modules/tasks/controllers/useTasksController';
import {TasksPanel} from '../modules/tasks/components/TasksPanel';
import {AppHeader} from './components/AppHeader';
import {AppToast} from './components/AppToast';
import {GlobalRunningBar} from './components/GlobalRunningBar';
import {getErrorMessage} from './errors';
import {useAppData} from './hooks/useAppData';
import {useToast} from './hooks/useToast';

const PRESET_COLORS = [
  {hex: '#fb7185', label: '樱花粉'},
  {hex: '#f0abfc', label: '丁香紫'},
  {hex: '#818cf8', label: '晴空蓝'},
  {hex: '#2dd4bf', label: '薄荷绿'},
  {hex: '#34d399', label: '松石绿'},
  {hex: '#fbbf24', label: '向日葵'},
  {hex: '#f97316', label: '金柿橙'},
  {hex: '#a78bfa', label: '薰衣草'},
];

const STORAGE_STYLES = {
  primary: THEME_STYLES.peach.primary,
  primaryLight: THEME_STYLES.peach.primaryLight,
  secondary: THEME_STYLES.peach.secondary,
};

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [activeTheme, setActiveTheme] = useState<ThemeId>('peach');
  const {
    categories,
    tasks,
    selectedDateSessions,
    allTasks,
    loading,
    setLoading,
    selectedDate,
    setSelectedDate,
    refreshCategories,
    refreshAllTasks,
    loadTasksForSelectedDate,
    loadMetaData,
  } = useAppData();
  const {successMsg, errorMsg, showToast, clearSuccess, clearError} = useToast();
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormCategory, setTaskFormCategory] = useState(0);
  const [taskFormDate, setTaskFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taskFilterCategory, setTaskFilterCategory] = useState('all');
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  const [taskFilterDateScope, setTaskFilterDateScope] = useState<'today' | 'seven-days' | 'all'>('today');

  const styleContext = THEME_STYLES[activeTheme];
  const reportStats = useReportStatsController({categories, allTasks});
  const focusSession = useFocusSessionController({
    tasks,
    allTasks,
    setActiveTab,
    setLoading,
    showToast,
    loadTasksForSelectedDate,
    refreshAllTasks,
  });
  const categoryActions = useCategoryActions({
    categories,
    refreshCategories,
    setLoading,
    showToast,
  });

  useEffect(() => {
    void loadMetaData()
      .then(({categories: loadedCategories}) => {
        if (loadedCategories.length > 0) {
          setTaskFormCategory((current) => current || loadedCategories[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load metadata', err);
      });
    void focusSession.checkRunningSession();
  }, []);

  useEffect(() => {
    void loadTasksForSelectedDate().catch((err) => {
      console.error('Failed to sync date tasks', err);
    });
  }, [loadTasksForSelectedDate]);

  useEffect(() => {
    if (activeTab === 'daily') {
      void reportStats.loadDailyStats();
    }
  }, [reportStats.dailyReportDate, activeTab, reportStats.loadDailyStats]);

  useEffect(() => {
    if (activeTab === 'weekly') {
      void reportStats.loadWeeklyStats();
    }
  }, [reportStats.weeklyStartDate, activeTab, reportStats.loadWeeklyStats]);

  async function handleCreateTask(event?: FormEvent) {
    if (event) event.preventDefault();
    if (!taskFormTitle.trim()) {
      showToast('行动主题不能留空啦', 'error');
      return;
    }
    const catId = taskFormCategory || (categories.length > 0 ? categories[0].id : 0);
    if (!catId) {
      showToast('请先新建至少一个分类板块', 'error');
      return;
    }

    try {
      setLoading(true);
      await tasksApi.createTask({title: taskFormTitle, categoryId: catId, plannedDate: taskFormDate});
      showToast('任务已成功下派！');
      setTaskFormTitle('');
      await refreshAllTasks();
      if (taskFormDate === selectedDate) {
        void loadTasksForSelectedDate();
      }
    } catch (err) {
      showToast(getErrorMessage(err, '生成行动项失败'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTaskStatus(id: number, status: TaskStatus) {
    try {
      await tasksApi.updateTaskStatus(id, status);
      if (focusSession.runningSession?.taskId === id && status !== 'IN_PROGRESS') {
        focusSession.setRunningSession(null);
      }
      showToast('进展转换完美同步');
      await loadTasksForSelectedDate();
      await refreshAllTasks();
      if (activeTab === 'daily') void reportStats.loadDailyStats();
      if (activeTab === 'weekly') void reportStats.loadWeeklyStats();
    } catch (err) {
      showToast(getErrorMessage(err, '更新状态故障'), 'error');
    }
  }

  async function handleDeleteTask(task: Task) {
    if (!window.confirm(`确定删除「${task.title}」？关联专注记录也会同步删除。`)) return;

    try {
      setLoading(true);
      await tasksApi.deleteTask(task.id);
      if (focusSession.runningSession?.taskId === task.id) {
        focusSession.setRunningSession(null);
      }
      if (focusSession.lastFinishedSessionTask?.id === task.id) {
        focusSession.setLastFinishedSessionTask(null);
      }
      showToast('任务已删除');
      await loadTasksForSelectedDate();
      await refreshAllTasks();
      if (activeTab === 'daily') void reportStats.loadDailyStats();
      if (activeTab === 'weekly') void reportStats.loadWeeklyStats();
    } catch (err) {
      showToast(getErrorMessage(err, '删除任务失败'), 'error');
    } finally {
      setLoading(false);
    }
  }

  const todayCategoryFocusData = useMemo(
    () => buildTodayCategoryFocusData({categories, tasks, allTasks, selectedDateSessions}),
    [categories, tasks, allTasks, selectedDateSessions],
  );

  const filteredTaskItems = useMemo(
    () => filterTasks(allTasks, {
      category: taskFilterCategory,
      status: taskFilterStatus as 'all' | TaskStatus,
      dateScope: taskFilterDateScope,
      selectedDate,
    }),
    [allTasks, taskFilterCategory, taskFilterStatus, taskFilterDateScope, selectedDate],
  );

  const getTaskFocusMinutesForPanel = (taskId: number) =>
    getTaskFocusMinutes({
      taskId,
      selectedDateSessions,
      runningSession: focusSession.runningSession,
      focusTimeElapsed: focusSession.focusTimeElapsed,
    });

  return (
    <div className="min-h-screen text-[#413333] font-sans selection:bg-rose-100 pb-12 transition-colors duration-300" style={{backgroundColor: styleContext.bg}} id="app_frame">
      <style>{`
        :root {
          --color-primary: ${styleContext.primary};
          --color-secondary: ${styleContext.secondary};
          --color-bg: ${styleContext.bg};
          --color-light: ${styleContext.light};
        }
        body {
          background-color: var(--color-bg) !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif;
          line-height: 1.6;
          transition: background-color 0.3s ease;
        }
      `}</style>

      <AppToast
        successMsg={successMsg}
        errorMsg={errorMsg}
        clearSuccess={clearSuccess}
        clearError={clearError}
      />

      {focusSession.runningSession && activeTab !== 'focus' && (
        <GlobalRunningBar
          runningSession={focusSession.runningSession}
          focusTimeElapsed={focusSession.focusTimeElapsed}
          onOpenFocus={() => setActiveTab('focus')}
        />
      )}

      <AppHeader
        activeTab={activeTab}
        activeTheme={activeTheme}
        hasRunningSession={Boolean(focusSession.runningSession)}
        runningSessionStatus={focusSession.runningSession?.status}
        primaryColor={styleContext.primary}
        setActiveTab={setActiveTab}
        setActiveTheme={setActiveTheme}
        clearError={clearError}
      />

      <main className="max-w-[1280px] mx-auto px-6 mt-8 space-y-6" id="main_content">
        {activeTab === 'today' && (
          <DashboardPanel
            styleContext={{primary: styleContext.primary, primaryLight: styleContext.primaryLight, secondary: styleContext.secondary}}
            categories={categories}
            tasks={tasks}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            todayCategoryFocusData={todayCategoryFocusData}
            taskFormTitle={taskFormTitle}
            taskFormCategory={taskFormCategory}
            setTaskFormTitle={setTaskFormTitle}
            setTaskFormCategory={setTaskFormCategory}
            handleCreateTask={handleCreateTask}
            handleUpdateTaskStatus={handleUpdateTaskStatus}
            handleStartSession={focusSession.handleStartSession}
            handleStopSession={focusSession.handleStopSession}
            runningSession={focusSession.runningSession}
            lastFinishedSessionTask={focusSession.lastFinishedSessionTask}
            setLastFinishedSessionTask={focusSession.setLastFinishedSessionTask}
            getTaskFocusMinutes={getTaskFocusMinutesForPanel}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksPanel
            styleContext={{primary: styleContext.primary, primaryLight: styleContext.primaryLight, secondary: styleContext.secondary}}
            categories={categories}
            allTasks={allTasks}
            filteredTaskItems={filteredTaskItems}
            selectedDate={selectedDate}
            taskFormTitle={taskFormTitle}
            taskFormCategory={taskFormCategory}
            taskFormDate={taskFormDate}
            taskFilterCategory={taskFilterCategory}
            taskFilterStatus={taskFilterStatus}
            taskFilterDateScope={taskFilterDateScope}
            setTaskFormTitle={setTaskFormTitle}
            setTaskFormCategory={setTaskFormCategory}
            setTaskFormDate={setTaskFormDate}
            setTaskFilterCategory={setTaskFilterCategory}
            setTaskFilterStatus={setTaskFilterStatus}
            setTaskFilterDateScope={setTaskFilterDateScope}
            handleCreateTask={handleCreateTask}
            handleUpdateTaskStatus={handleUpdateTaskStatus}
            handleStartSession={focusSession.handleStartSession}
            handleDeleteTask={handleDeleteTask}
          />
        )}
        {activeTab === 'categories' && (
          <CategoryPanel
            styleContext={{primary: styleContext.primary, primaryLight: styleContext.primaryLight}}
            categories={categories}
            allTasks={allTasks}
            presetColors={PRESET_COLORS}
            isCategoryModalOpen={categoryActions.isCategoryModalOpen}
            editingCategory={categoryActions.editingCategory}
            catFormName={categoryActions.catFormName}
            catFormColor={categoryActions.catFormColor}
            catFormSort={categoryActions.catFormSort}
            setIsCategoryModalOpen={categoryActions.setIsCategoryModalOpen}
            setCatFormName={categoryActions.setCatFormName}
            setCatFormColor={categoryActions.setCatFormColor}
            setCatFormSort={categoryActions.setCatFormSort}
            handleOpenCategoryModal={categoryActions.handleOpenCategoryModal}
            handleDeleteCategory={categoryActions.handleDeleteCategory}
            handleSaveCategory={categoryActions.handleSaveCategory}
          />
        )}
        {activeTab === 'daily' && (
          <DailyReportPanel
            styleContext={{primary: styleContext.primary, primaryLight: styleContext.primaryLight}}
            dailyReportDate={reportStats.dailyReportDate}
            setDailyReportDate={reportStats.setDailyReportDate}
            loadDailyStats={reportStats.loadDailyStats}
            dailyStatsLoaded={reportStats.dailyStatsLoaded}
            dailyTasks={reportStats.dailyTasks}
            dailySessions={reportStats.dailySessions}
            metrics={reportStats.dailyMetrics}
          />
        )}
        {activeTab === 'weekly' && (
          <WeeklyReviewPanel
            styleContext={{primary: styleContext.primary, primaryLight: styleContext.primaryLight, secondary: styleContext.secondary}}
            weeklyStartDate={reportStats.weeklyStartDate}
            setWeeklyStartDate={reportStats.setWeeklyStartDate}
            loadWeeklyStats={reportStats.loadWeeklyStats}
            weeklyStatsLoaded={reportStats.weeklyStatsLoaded}
            metrics={reportStats.weeklyMetrics}
          />
        )}
        {activeTab === 'focus' && focusSession.runningSession && (
          <FocusPanel
            styleContext={{primary: styleContext.primary, primaryLight: styleContext.primaryLight, secondary: styleContext.secondary}}
            runningSession={focusSession.runningSession}
            focusTimeElapsed={focusSession.focusTimeElapsed}
            formattedElapsed={focusSession.formattedElapsed}
            progressOffset={focusSession.progressOffset}
            handleStopSession={focusSession.handleStopSession}
            handlePauseSession={focusSession.handlePauseSession}
            handleResumeSession={focusSession.handleResumeSession}
          />
        )}
      </main>
    </div>
  );
}

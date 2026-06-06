import {useState} from 'react';
import type React from 'react';

import type {Category, Task} from '../../../../shared/domain/entities';
import type {TaskStatus} from '../../../../shared/domain/status';
import {EmbeddedCalendarPanel} from '../../calendar/components/EmbeddedCalendarPanel';
import type {CreateTaskScheduleOverride} from '../controllers/useTaskActions';
import {TaskCreateForm} from './TaskCreateForm';
import {TaskList} from './TaskList';

interface TasksPanelProps {
  styleContext: {
    primary: string;
    primaryLight: string;
    secondary: string;
  };
  categories: Category[];
  allTasks: Task[];
  filteredTaskItems: Task[];
  taskFormTitle: string;
  taskFormCategory: number;
  taskFormDate: string;
  taskFormUnscheduled: boolean;
  taskFilterCategory: string;
  taskFilterStatus: string;
  taskFilterDateScope: 'today' | 'seven-days' | 'all' | 'unscheduled';
  setTaskFormTitle: (value: string) => void;
  setTaskFormCategory: (value: number) => void;
  setTaskFormDate: (value: string) => void;
  setTaskFormUnscheduled: (value: boolean) => void;
  setTaskFilterCategory: (value: string) => void;
  setTaskFilterStatus: (value: string) => void;
  setTaskFilterDateScope: (value: 'today' | 'seven-days' | 'all' | 'unscheduled') => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  selectedDate: string;
  refreshAllTasks: () => Promise<Task[]>;
  loadTasksForSelectedDate: () => Promise<unknown>;
  handleCreateTask: (event?: React.FormEvent, scheduleOverride?: CreateTaskScheduleOverride) => void;
  handleUpdateTaskStatus: (id: number, status: TaskStatus) => void;
  handleStartSession: (task: Task) => void;
  handleDeleteTask: (task: Task) => void;
}

export function TasksPanel({
  styleContext,
  categories,
  allTasks,
  filteredTaskItems,
  taskFormTitle,
  taskFormCategory,
  taskFormDate,
  taskFormUnscheduled,
  taskFilterCategory,
  taskFilterStatus,
  taskFilterDateScope,
  setTaskFormTitle,
  setTaskFormCategory,
  setTaskFormDate,
  setTaskFormUnscheduled,
  setTaskFilterCategory,
  setTaskFilterStatus,
  setTaskFilterDateScope,
  showToast,
  selectedDate,
  refreshAllTasks,
  loadTasksForSelectedDate,
  handleCreateTask,
  handleUpdateTaskStatus,
  handleStartSession,
  handleDeleteTask,
}: TasksPanelProps) {
  const [calendarVisible, setCalendarVisible] = useState(false);

  const taskList = (
    <TaskList
      styleContext={styleContext}
      categories={categories}
      allTasks={allTasks}
      filteredTaskItems={filteredTaskItems}
      calendarVisible={calendarVisible}
      taskFilterCategory={taskFilterCategory}
      taskFilterStatus={taskFilterStatus}
      taskFilterDateScope={taskFilterDateScope}
      setTaskFilterCategory={setTaskFilterCategory}
      setTaskFilterStatus={setTaskFilterStatus}
      setTaskFilterDateScope={setTaskFilterDateScope}
      onToggleCalendar={() => setCalendarVisible((visible) => !visible)}
      handleUpdateTaskStatus={handleUpdateTaskStatus}
      handleStartSession={handleStartSession}
      handleDeleteTask={handleDeleteTask}
    />
  );

  return (
    <div className="space-y-6" id="tasks_view">
      <header className="bg-white rounded-2xl border border-slate-200/60 p-6 flex flex-col gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" id="tasks_header">
        <span className="px-3 py-1 text-[10px] font-bold rounded-full w-fit" style={{color: styleContext.primary, backgroundColor: styleContext.primaryLight}}>
          Global Task Reserves
        </span>
        <h2 className="text-xl font-extrabold text-slate-800 mt-1">全局储备与规划中心</h2>
        <p className="text-xs text-slate-500 font-medium">配置、调度未来日期及历届滞存指令集的核心仓库，支持多级交叉状态过滤。</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TaskCreateForm
          styleContext={styleContext}
          categories={categories}
          taskFormTitle={taskFormTitle}
          taskFormCategory={taskFormCategory}
          taskFormDate={taskFormDate}
          taskFormUnscheduled={taskFormUnscheduled}
          setTaskFormTitle={setTaskFormTitle}
          setTaskFormCategory={setTaskFormCategory}
          setTaskFormDate={setTaskFormDate}
          setTaskFormUnscheduled={setTaskFormUnscheduled}
          handleCreateTask={handleCreateTask}
        />

        {calendarVisible ? (
          <div className="lg:col-span-2 grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] gap-4">
            {taskList}
            <EmbeddedCalendarPanel
              categories={categories}
              initialDate={selectedDate}
              showToast={showToast}
              onMutationSuccess={async () => {
                await refreshAllTasks();
                await loadTasksForSelectedDate();
              }}
            />
          </div>
        ) : taskList}
      </div>
    </div>
  );
}

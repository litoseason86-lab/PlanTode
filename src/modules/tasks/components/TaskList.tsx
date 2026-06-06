import {ListTodo} from 'lucide-react';

import type {Category, Task} from '../../../../shared/domain/entities';
import type {TaskStatus} from '../../../../shared/domain/status';
import {TaskFilterBar} from './TaskFilterBar';
import {TaskListItem} from './TaskListItem';

type TaskFilterDateScope = 'today' | 'seven-days' | 'all' | 'unscheduled';

interface TaskListProps {
  styleContext: {
    primary: string;
    primaryLight: string;
    secondary: string;
  };
  categories: Category[];
  allTasks: Task[];
  filteredTaskItems: Task[];
  calendarVisible: boolean;
  taskFilterCategory: string;
  taskFilterStatus: string;
  taskFilterDateScope: TaskFilterDateScope;
  setTaskFilterCategory: (value: string) => void;
  setTaskFilterStatus: (value: string) => void;
  setTaskFilterDateScope: (value: TaskFilterDateScope) => void;
  onToggleCalendar: () => void;
  handleUpdateTaskStatus: (id: number, status: TaskStatus) => void;
  handleStartSession: (task: Task) => void;
  handleDeleteTask: (task: Task) => void;
}

export function TaskList({
  styleContext,
  categories,
  allTasks,
  filteredTaskItems,
  calendarVisible,
  taskFilterCategory,
  taskFilterStatus,
  taskFilterDateScope,
  setTaskFilterCategory,
  setTaskFilterStatus,
  setTaskFilterDateScope,
  onToggleCalendar,
  handleUpdateTaskStatus,
  handleStartSession,
  handleDeleteTask,
}: TaskListProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <TaskFilterBar
        categories={categories}
        filteredCount={filteredTaskItems.length}
        calendarVisible={calendarVisible}
        taskFilterCategory={taskFilterCategory}
        taskFilterStatus={taskFilterStatus}
        taskFilterDateScope={taskFilterDateScope}
        setTaskFilterCategory={setTaskFilterCategory}
        setTaskFilterStatus={setTaskFilterStatus}
        setTaskFilterDateScope={setTaskFilterDateScope}
        onToggleCalendar={onToggleCalendar}
      />

      <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {filteredTaskItems.map((task) => (
            <TaskListItem
              key={task.id}
              styleContext={styleContext}
              task={task}
              category={categories.find((item) => item.id === task.categoryId)}
              handleUpdateTaskStatus={handleUpdateTaskStatus}
              handleStartSession={handleStartSession}
              handleDeleteTask={handleDeleteTask}
            />
          ))}

          {allTasks.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{backgroundColor: styleContext.primaryLight}}>
                <ListTodo className="w-8 h-8 stroke-[1.5]" style={{color: styleContext.primary}} />
              </div>
              <p className="text-xs font-bold">没有找到符合这些筛选的储备方案项</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

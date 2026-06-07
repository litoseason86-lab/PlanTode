import type {TasksPanelController} from '../controllers/useTasksPanelController';
import {TaskBasicInfoModal} from './TaskBasicInfoModal';
import {TaskCreateForm} from './TaskCreateForm';
import {TaskList} from './TaskList';

interface TasksPanelProps {
  styleContext: {
    primary: string;
    primaryLight: string;
    secondary: string;
  };
  controller: TasksPanelController;
  onOpenCalendar: () => void;
}

export function TasksPanel({styleContext, controller, onOpenCalendar}: TasksPanelProps) {
  const taskList = (
    <TaskList
      styleContext={styleContext}
      categories={controller.categories}
      tags={controller.tags}
      filteredTaskItems={controller.filteredTaskItems}
      filters={controller.filters}
      handleUpdateTaskStatus={controller.statusActions.updateTaskStatus}
      handleStartSession={controller.statusActions.startSession}
      handleDeleteTask={controller.mutations.deleteTask}
      onEditTask={controller.openEditTask}
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
        <button
          type="button"
          onClick={onOpenCalendar}
          className="mt-3 w-fit px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          去日历安排
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TaskCreateForm
          styleContext={styleContext}
          categories={controller.categories}
          tags={controller.tags}
          taskFormTitle={controller.createDraft.title}
          taskFormCategory={controller.createDraft.categoryId}
          taskFormDate={controller.createDraft.plannedDate}
          taskFormUnscheduled={controller.createDraft.unscheduled}
          selectedTagIds={controller.createDraft.tagIds}
          priority={controller.createDraft.priority}
          setTaskFormTitle={controller.createDraft.setTitle}
          setTaskFormCategory={controller.createDraft.setCategoryId}
          setTaskFormDate={controller.createDraft.setPlannedDate}
          setTaskFormUnscheduled={controller.createDraft.setUnscheduled}
          onTagIdsChange={controller.createDraft.setTagIds}
          onPriorityChange={controller.createDraft.setPriority}
          onCreateTag={controller.tagActions.createTag}
          handleCreateTask={controller.mutations.createTask}
        />

        {taskList}
      </div>

      {controller.editDraft.task && (
        <TaskBasicInfoModal
          task={controller.editDraft.task}
          categories={controller.categories}
          tags={controller.tags}
          onCreateTag={controller.tagActions.createTag}
          onSave={controller.mutations.updateTaskDetails}
          onClose={controller.closeEditTask}
        />
      )}
    </div>
  );
}

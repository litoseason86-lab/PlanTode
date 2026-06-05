import type React from 'react';

import {Calendar, ClipboardList, Plus, Square} from 'lucide-react';
import {Bar, BarChart, Cell, ResponsiveContainer} from 'recharts';

import type {Category, Task, TaskExecutionSession} from '../../../../shared/domain/entities';
import type {TaskStatus} from '../../../../shared/domain/status';

interface DashboardPanelProps {
  styleContext: {
    primary: string;
    primaryLight: string;
    secondary: string;
  };
  categories: Category[];
  tasks: Task[];
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  todayCategoryFocusData: Array<{
    name: string;
    minutes: number;
    color: string;
  }>;
  taskFormTitle: string;
  taskFormCategory: number;
  setTaskFormTitle: (value: string) => void;
  setTaskFormCategory: (value: number) => void;
  handleCreateTask: (event?: React.FormEvent) => void;
  handleUpdateTaskStatus: (id: number, status: TaskStatus) => void;
  handleStartSession: (task: Task) => void;
  handleStopSession: () => void;
  runningSession: TaskExecutionSession | null;
  lastFinishedSessionTask: Task | null;
  setLastFinishedSessionTask: (task: Task | null) => void;
  getTaskFocusMinutes: (taskId: number) => number;
}

export function DashboardPanel({
  styleContext,
  categories,
  tasks,
  selectedDate,
  setSelectedDate,
  todayCategoryFocusData,
  taskFormTitle,
  taskFormCategory,
  setTaskFormTitle,
  setTaskFormCategory,
  handleCreateTask,
  handleUpdateTaskStatus,
  handleStartSession,
  handleStopSession,
  runningSession,
  lastFinishedSessionTask,
  setLastFinishedSessionTask,
  getTaskFocusMinutes,
}: DashboardPanelProps) {
  return (
    <div className="space-y-6" id="today_view">
      <header className="bg-white rounded-2xl border border-slate-200/60 p-6 flex items-center justify-between gap-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" id="today_header">
        <div className="space-y-2.5">
          <span className="px-3 py-1 text-white text-[10px] font-bold rounded-full uppercase tracking-wider inline-block bg-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/20">
            Primary Flow Focus
          </span>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">今日规划时空轴</h2>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" style={{color: styleContext.primary}} />
            <span className="font-semibold text-slate-600">聚焦选期:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="bg-slate-50 border border-slate-200 outline-none hover:border-slate-300 focus:border-[var(--color-primary)] px-3 py-1.5 font-mono rounded-xl text-xs text-slate-700 font-bold transition-colors"
            />
          </div>
        </div>

        <div className="w-[320px] h-[100px] bg-slate-50/80 border border-slate-200/40 rounded-xl p-3 flex flex-col justify-between" id="today_header_chart">
          <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 tracking-wider">
            <span>累计专注板块 (分钟)</span>
            {todayCategoryFocusData.length > 0 && (
              <span className="font-bold px-2 py-0.5 rounded-full font-mono" style={{color: styleContext.primary, backgroundColor: styleContext.primaryLight}}>
                已专注 {todayCategoryFocusData.reduce((sum, item) => sum + item.minutes, 0)}m
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 w-full mt-1">
            {todayCategoryFocusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todayCategoryFocusData} layout="vertical" margin={{top: 2, right: 10, left: -25, bottom: 2}}>
                  <Bar dataKey="minutes" radius={[0, 4, 4, 0]} barSize={8}>
                    {todayCategoryFocusData.map((entry, index) => (
                      <Cell key={`today-category-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-[9px] text-slate-400 font-bold">今日无计时，点击行动旁 ▶️ 开启专注模式</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl px-5 py-3 text-center min-w-[80px] border border-slate-200/40">
            <p className="text-[10px] text-slate-400 font-semibold">待完成</p>
            <p className="text-lg font-extrabold text-slate-700 mt-0.5">
              {tasks.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS').length}
            </p>
          </div>
          <div className="bg-emerald-50 hover:bg-emerald-100/60 transition-colors rounded-xl px-5 py-3 text-center min-w-[80px] border border-emerald-200/40">
            <p className="text-[10px] text-emerald-600 font-semibold">已完结</p>
            <p className="text-lg font-extrabold text-emerald-600 mt-0.5">{tasks.filter((task) => task.status === 'DONE').length}</p>
          </div>
        </div>
      </header>

      {lastFinishedSessionTask && (
        <div className="bg-white border-2 border-dashed border-rose-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm animate-in fade-in zoom-in-95" id="feedback_panel">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-lg shadow-sm">💡</div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">完成了刚才的心流阶段？</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                主线聚焦: <strong className="text-rose-600">「{lastFinishedSessionTask.title}」</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                handleUpdateTaskStatus(lastFinishedSessionTask.id, 'DONE');
                setLastFinishedSessionTask(null);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm shadow-emerald-200/40 transition-all hover:scale-[1.02]"
            >
              ✓ 完美标记
            </button>
            <button
              onClick={() => setLastFinishedSessionTask(null)}
              className="text-slate-400 hover:bg-slate-100 text-xs font-semibold px-4 py-2 rounded-xl transition"
            >
              稍后处理
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex items-center gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <input
          type="text"
          placeholder="💡 快速添加今日行动计划..."
          value={taskFormTitle}
          onChange={(event) => setTaskFormTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleCreateTask();
            }
          }}
          className="flex-1 text-sm border border-slate-200 bg-slate-50/50 p-2.5 rounded-xl outline-none focus:border-[var(--color-primary)] focus:bg-white focus:shadow-sm font-semibold transition-all text-slate-800 placeholder:text-slate-300"
        />
        <div className="flex items-center gap-2.5">
          <select
            value={taskFormCategory}
            onChange={(event) => setTaskFormCategory(Number(event.target.value))}
            className="px-3 py-2 text-xs border border-slate-200 bg-white rounded-xl text-slate-600 font-semibold outline-none cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
            {categories.length === 0 && <option value="">暂无分类</option>}
          </select>

          <button
            onClick={() => handleCreateTask()}
            className="text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-[var(--color-primary)]/20 hover:shadow-md hover:scale-[1.02] flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            style={{backgroundColor: styleContext.primary}}
          >
            <Plus className="w-3.5 h-3.5" /> 快速派遣
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <h3 className="font-extrabold text-sm text-slate-700 mb-8 border-l-4 pl-3.5" style={{borderColor: styleContext.primary}}>
          行动轨迹轴
        </h3>

        {tasks.length > 0 ? (
          <div className="relative pl-8 border-l-2 ml-4 space-y-6" style={{borderColor: styleContext.secondary}}>
            {tasks.map((task) => {
              const category = categories.find((item) => item.id === task.categoryId);
              const focusMinutes = getTaskFocusMinutes(task.id);
              const isActiveTask = runningSession?.taskId === task.id;

              let nodeDotClass = 'bg-white border-2 border-slate-300';
              let nodeInnerDotColor = 'transparent';

              if (isActiveTask) {
                nodeDotClass = 'bg-white shadow-md ring-4 ring-[var(--color-primary)]/15';
                nodeInnerDotColor = styleContext.primary;
              } else if (task.status === 'DONE') {
                nodeDotClass = 'bg-emerald-100 border-2 border-emerald-400';
                nodeInnerDotColor = '#34d399';
              } else if (task.status === 'NOT_DONE') {
                nodeDotClass = 'bg-rose-50 border-2 border-rose-300';
                nodeInnerDotColor = '#fca5a5';
              }

              return (
                <div key={task.id} className="relative group/card fade-in-up">
                  <div
                    className={`absolute -left-[37px] top-5 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${nodeDotClass}`}
                    style={isActiveTask ? {borderColor: styleContext.primary} : undefined}
                  >
                    <div className="w-1.5 h-1.5 rounded-full transition-colors" style={{backgroundColor: nodeInnerDotColor}} />
                  </div>

                  <div
                    className={`bg-white border-2 p-5 rounded-xl transition-all duration-200 select-none ${
                      isActiveTask
                        ? 'border-[var(--color-primary)] shadow-md bg-[var(--color-light)]'
                        : task.status === 'DONE'
                          ? 'border-slate-200/60 bg-slate-50/30'
                          : 'border-slate-200/60 hover:border-[var(--color-primary)]/40 hover:shadow-sm hover:bg-[var(--color-light)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <h4 className={`text-sm tracking-tight font-bold leading-snug ${task.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {task.title}
                        </h4>

                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className="text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full border"
                            style={{
                              color: category ? category.color : '#64748b',
                              backgroundColor: `${category ? category.color : '#94a3b8'}10`,
                              borderColor: `${category ? category.color : '#94a3b8'}20`,
                            }}
                          >
                            {category ? category.name : '未分类'}
                          </span>

                          {focusMinutes > 0 && (
                            <span className="text-[10px] font-semibold text-indigo-500 font-mono bg-indigo-50 px-2 py-0.5 rounded-full">
                              ⏱ {focusMinutes} 分钟
                            </span>
                          )}

                          {task.status === 'NOT_DONE' && (
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">已搁置</span>
                          )}

                          {isActiveTask && (
                            <span className="text-[10px] font-bold bg-[var(--color-light)] px-2 py-0.5 rounded-full animate-pulse" style={{color: styleContext.primary}}>
                              专注进行中
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover/card:opacity-100 transition-all duration-200 shrink-0">
                        {!isActiveTask && task.status !== 'DONE' && (
                          <button
                            onClick={() => handleStartSession(task)}
                            className="px-2.5 py-1.5 bg-[var(--color-primary)]/10 rounded-lg hover:bg-[var(--color-primary)]/20 transition-all text-[10px] font-bold cursor-pointer"
                            style={{color: styleContext.primary}}
                            title="开启心流专注"
                          >
                            ▶ 专注
                          </button>
                        )}

                        {isActiveTask && (
                          <button
                            onClick={handleStopSession}
                            className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                          >
                            <Square className="w-2.5 h-2.5 text-rose-400 fill-current" />
                            停止
                          </button>
                        )}

                        {task.status !== 'DONE' && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, 'DONE')}
                            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition text-[10px] font-bold cursor-pointer"
                            title="标记完成"
                          >
                            ✓ 完成
                          </button>
                        )}

                        {task.status !== 'NOT_DONE' && task.status !== 'DONE' && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, 'NOT_DONE')}
                            className="px-2.5 py-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition text-[10px] font-bold cursor-pointer"
                            title="搁置"
                          >
                            ✗ 搁置
                          </button>
                        )}

                        {(task.status === 'DONE' || task.status === 'NOT_DONE') && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, 'TODO')}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-bold rounded-lg transition"
                          >
                            重置
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{backgroundColor: styleContext.primaryLight}}>
              <ClipboardList className="w-8 h-8 stroke-[1.5]" style={{color: styleContext.primary}} />
            </div>
            <p className="text-sm font-bold text-slate-600">今日暂无行动计划</p>
            <p className="text-xs text-slate-400 mt-1.5">在上方输入框添加你的今日行动项</p>
          </div>
        )}
      </div>
    </div>
  );
}

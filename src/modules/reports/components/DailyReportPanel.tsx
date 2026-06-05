import {
  Award,
  ClipboardList,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';

import type {Task, TaskExecutionSession} from '../../../../shared/domain/entities';

interface DailyReportMetrics {
  dailyTotalMinutes: number;
  prevDailyTotalMinutes: number;
  dailyFocusDeltaPercent: number;
  doneDailyTasksCount: number;
  todoDailyTasksCount: number;
  inProgressDailyTasksCount: number;
  notDoneDailyTasksCount: number;
  dailyCategoryDistributionData: Array<{
    name: string;
    minutes: number;
    color: string;
  }>;
}

interface DailyReportPanelProps {
  styleContext: {
    primary: string;
    primaryLight: string;
  };
  dailyReportDate: string;
  setDailyReportDate: (value: string) => void;
  loadDailyStats: () => void;
  dailyStatsLoaded: boolean;
  dailyTasks: Task[];
  dailySessions: TaskExecutionSession[];
  metrics: DailyReportMetrics;
}

export function DailyReportPanel({
  styleContext,
  dailyReportDate,
  setDailyReportDate,
  loadDailyStats,
  dailyStatsLoaded,
  dailyTasks,
  dailySessions,
  metrics,
}: DailyReportPanelProps) {
  const completionChartData = [
    {name: '已完成 (Done)', value: metrics.doneDailyTasksCount, color: '#34d399'},
    {
      name: '执行中 & 待办',
      value: metrics.todoDailyTasksCount + metrics.inProgressDailyTasksCount,
      color: styleContext.primary,
    },
    {name: '延滞搁置', value: metrics.notDoneDailyTasksCount, color: '#fca5a5'},
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6" id="daily_view">
      <header className="bg-white rounded-2xl border border-slate-200/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" id="daily_header">
        <div>
          <span className="px-3 py-1 text-[10px] font-bold rounded-full w-fit" style={{color: styleContext.primary, backgroundColor: styleContext.primaryLight}}>
            Daily Analytics
          </span>
          <h2 className="text-xl font-extrabold text-slate-800 mt-2">当日执行状况面板</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">自动核算行动完结状态与专注分钟，以纯数据可视化呈现时间运用图景。</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dailyReportDate}
            onChange={(event) => setDailyReportDate(event.target.value)}
            className="bg-white border border-slate-200 px-3 py-2 text-xs rounded-xl font-mono font-bold outline-none cursor-pointer hover:border-slate-300 transition-colors"
          />

          <button
            onClick={loadDailyStats}
            className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer hover:bg-slate-800 active:scale-[0.98]"
          >
            评估指标
          </button>
        </div>
      </header>

      {!dailyStatsLoaded ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{color: styleContext.primary}} />
          <p className="text-xs text-slate-400 font-semibold">正在计算当日指标...</p>
        </div>
      ) : dailyTasks.length === 0 && dailySessions.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{backgroundColor: styleContext.primaryLight}}>
            <ClipboardList className="w-8 h-8 stroke-[1.5]" style={{color: styleContext.primary}} />
          </div>
          <p className="text-sm font-bold text-slate-600">当天暂无数据记录</p>
          <p className="text-xs text-slate-400 mt-1.5">切换日期查看其他天的统计看板</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="pb-3 border-b border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Completion Rate</span>
              <h3 className="font-bold text-xs text-slate-700 mt-1">行动达成度</h3>
            </div>

            <div className="h-[180px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={completionChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                    {completionChartData.map((entry, index) => (
                      <Cell key={`daily-completion-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 m-auto flex flex-col items-center justify-center w-fit h-fit select-none pointer-events-none">
                <span className="text-2xl font-black font-sans leading-none text-slate-800">
                  {dailyTasks.length > 0 ? `${Math.round((metrics.doneDailyTasksCount / dailyTasks.length) * 100)}%` : '0%'}
                </span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">完成率</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 select-none">
              <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
                <p className="text-[9px] text-emerald-600 font-semibold">已完结</p>
                <p className="font-bold font-mono text-emerald-600 mt-0.5">{metrics.doneDailyTasksCount}</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-2.5 border border-rose-100">
                <p className="text-[9px] text-rose-500 font-semibold">待推进</p>
                <p className="font-bold font-mono text-rose-500 mt-0.5">{metrics.todoDailyTasksCount + metrics.inProgressDailyTasksCount}</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                <p className="text-[9px] text-stone-500 font-semibold">搁置项</p>
                <p className="font-bold font-mono text-stone-500 mt-0.5">{metrics.notDoneDailyTasksCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="pb-3 border-b border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Focus Time</span>
              <h3 className="font-bold text-xs text-slate-700 mt-1">当日专注总量</h3>
            </div>

            <div className="py-6 text-center space-y-3 flex-1 flex flex-col justify-center">
              <div className="inline-block p-4 rounded-2xl w-fit mx-auto" style={{backgroundColor: styleContext.primaryLight}}>
                <Award className="w-8 h-8" style={{color: styleContext.primary}} />
              </div>
              <div>
                <h4 className="text-3xl font-black font-sans text-slate-800 tracking-tight">
                  {metrics.dailyTotalMinutes} <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">分钟</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                  约 <span className="font-mono text-slate-600">{(metrics.dailyTotalMinutes / 60).toFixed(1)}h</span>
                </p>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/40 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">相比昨日</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  昨日专注: <strong className="font-mono text-slate-700">{metrics.prevDailyTotalMinutes} 分钟</strong>
                </p>
              </div>
              <div className="flex items-center gap-1 select-none">
                {metrics.dailyFocusDeltaPercent >= 0 ? (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-1 inline-flex items-center gap-0.5 rounded-full font-bold">
                    <TrendingUp className="w-3 h-3 stroke-3" />
                    +{metrics.dailyFocusDeltaPercent}%
                  </span>
                ) : (
                  <span className="bg-rose-100 text-rose-700 text-[10px] px-2.5 py-1 inline-flex items-center gap-0.5 rounded-full font-bold">
                    <TrendingDown className="w-3 h-3 stroke-3" />
                    {metrics.dailyFocusDeltaPercent}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="pb-3 border-b border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Category Distribution</span>
              <h3 className="font-bold text-xs text-slate-700 mt-1">分类时长分布</h3>
            </div>

            <div className="h-[210px] w-full mt-2">
              {metrics.dailyCategoryDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.dailyCategoryDistributionData} layout="vertical" margin={{top: 10, right: 10, left: -22, bottom: 5}}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" stroke="#57534e" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} width={75} />
                    <Tooltip
                      content={({active, payload}) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as {name: string; minutes: number};
                          return (
                            <div className="bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded shadow font-extrabold">
                              <span>{data.name}: {data.minutes} 分钟</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="minutes" radius={[0, 4, 4, 0]} barSize={12}>
                      {metrics.dailyCategoryDistributionData.map((entry, index) => (
                        <Cell key={`daily-category-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-3">
                  <p className="text-stone-400 text-xs font-bold">今日尚且没有有效完结的心流计时段来提供分类分布数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

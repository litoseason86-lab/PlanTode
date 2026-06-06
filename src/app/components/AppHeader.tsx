import {CalendarDays, CalendarRange, ClipboardList, LayoutDashboard, ListTodo, Tags, Timer} from 'lucide-react';

import {APP_TABS, type AppTab} from '../navigation';
import {THEME_STYLES, type ThemeId} from '../theme';

interface AppHeaderProps {
  activeTab: AppTab;
  activeTheme: ThemeId;
  hasRunningSession: boolean;
  runningSessionStatus?: string;
  primaryColor: string;
  setActiveTab: (tab: AppTab) => void;
  setActiveTheme: (theme: ThemeId) => void;
  clearError: () => void;
}

const iconMap = {
  today: LayoutDashboard,
  tasks: ListTodo,
  categories: Tags,
  calendar: CalendarDays,
  daily: ClipboardList,
  weekly: CalendarRange,
  focus: Timer,
} as const;

export function AppHeader({
  activeTab,
  activeTheme,
  hasRunningSession,
  runningSessionStatus,
  primaryColor,
  setActiveTab,
  setActiveTheme,
  clearError,
}: AppHeaderProps) {
  const goToTab = (tab: AppTab) => {
    setActiveTab(tab);
    clearError();
  };

  return (
    <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-200/30 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300">
      <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3 select-none cursor-default">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-lg shadow-rose-200/30 transition-transform duration-300 hover:scale-105" style={{backgroundColor: primaryColor}}>🍑</div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-800 uppercase leading-none">{activeTheme === 'peach' ? 'COZY MOMENT' : 'SIMPLE LIFE'}</h1>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-medium">时间专注沉淀手记</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/40 shadow-sm" id="horizontal_navigation_menu">
          {APP_TABS.filter((tab) => tab.key !== 'focus').map((tab) => {
            const Icon = iconMap[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => goToTab(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === tab.key ? 'text-white shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/80'
                }`}
                style={activeTab === tab.key ? {backgroundColor: primaryColor} : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          {hasRunningSession && (
            <button
              onClick={() => goToTab('focus')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'focus' ? 'bg-rose-500 text-white shadow-md shadow-rose-200/50' : 'bg-rose-50/80 text-rose-500 hover:bg-rose-100/80'
              }`}
            >
              <Timer className={`w-3.5 h-3.5 ${runningSessionStatus === 'PAUSED' ? '' : 'animate-spin'}`} />
              <span>{runningSessionStatus === 'PAUSED' ? '已暂停' : '专注中'}</span>
            </button>
          )}
        </nav>

        <div className="flex items-center gap-0.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/30">
          <button onClick={() => setActiveTheme('peach')} className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200 flex items-center gap-1 cursor-pointer ${activeTheme === 'peach' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-rose-100' : 'text-slate-400 hover:text-slate-600'}`}>🍑 {THEME_STYLES.peach.name}</button>
          <button onClick={() => setActiveTheme('beige')} className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200 flex items-center gap-1 cursor-pointer ${activeTheme === 'beige' ? 'bg-white text-amber-700 shadow-sm ring-1 ring-amber-100' : 'text-slate-400 hover:text-slate-600'}`}>🪵 {THEME_STYLES.beige.name}</button>
        </div>
      </div>
    </header>
  );
}

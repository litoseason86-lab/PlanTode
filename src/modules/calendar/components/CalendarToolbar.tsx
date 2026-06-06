import {ChevronLeft, ChevronRight, Settings} from 'lucide-react';

import {addIsoDateDays, addIsoDateMonths} from '../../../../shared/lib/date';
import type {CalendarView} from '../controllers/calendarLayout';

interface CalendarToolbarProps {
  view: CalendarView;
  anchorDate: string;
  setView: (view: CalendarView) => void;
  setAnchorDate: (date: string) => void;
  onOpenSettings: () => void;
}

export function CalendarToolbar({view, anchorDate, setView, setAnchorDate, onOpenSettings}: CalendarToolbarProps) {
  const moveDate = (direction: -1 | 1) => (
    view === 'month'
      ? addIsoDateMonths(anchorDate, direction)
      : addIsoDateDays(anchorDate, direction * 7)
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold text-slate-800">日历</h2>
        <p className="text-xs font-semibold text-slate-400">{anchorDate}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="上一段" onClick={() => setAnchorDate(moveDate(-1))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" aria-label="下一段" onClick={() => setAnchorDate(moveDate(1))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600">
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          {(['month', 'week', 'list'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === item ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
            >
              {item === 'month' ? '月' : item === 'week' ? '周' : '列表'}
            </button>
          ))}
        </div>
        <button type="button" aria-label="显示设置" onClick={onOpenSettings} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-600">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

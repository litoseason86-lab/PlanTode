import {useState} from 'react';

import type {Category} from '../../../../shared/domain/entities';
import {useCalendarController} from '../controllers/useCalendarController';
import {CalendarToolbar} from './CalendarToolbar';

interface CalendarPanelProps {
  categories: Category[];
  styleContext: {primary: string; primaryLight: string; secondary: string};
  showToast: (message: string, type?: 'success' | 'error') => void;
  initialDate?: string;
}

export function CalendarPanel({categories, styleContext, showToast, initialDate}: CalendarPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controller = useCalendarController({categories, initialDate, showToast});

  return (
    <section id="calendar_view" className="space-y-4">
      <CalendarToolbar
        view={controller.view}
        anchorDate={controller.anchorDate}
        setView={controller.setView}
        setAnchorDate={controller.setAnchorDate}
        onOpenSettings={() => setSettingsOpen((open) => !open)}
      />
      {settingsOpen && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-500">
          显示设置
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white p-4" style={{borderColor: styleContext.primaryLight}}>
        <p className="text-sm font-bold text-slate-700">日历数据加载中...</p>
      </div>
    </section>
  );
}

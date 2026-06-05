import {Timer} from 'lucide-react';

import type {TaskExecutionSession} from '../../../shared/domain/entities';

interface GlobalRunningBarProps {
  runningSession: TaskExecutionSession;
  focusTimeElapsed: number;
  onOpenFocus: () => void;
}

export function GlobalRunningBar({runningSession, focusTimeElapsed, onOpenFocus}: GlobalRunningBarProps) {
  return (
    <div onClick={onOpenFocus} className="fixed bottom-6 right-6 bg-slate-900/95 backdrop-blur-xl text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-slate-900/20 flex items-center gap-3.5 cursor-pointer z-40 hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 ring-1 ring-white/10" id="global_running_bar">
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
          <Timer className="w-4.5 h-4.5 text-rose-400" />
        </div>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-400 rounded-full ring-2 ring-slate-900 animate-pulse" />
      </div>
      <div className="text-left min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-rose-400/70 font-semibold">心流引擎运行中</p>
        <p className="text-xs font-semibold truncate max-w-[160px] text-white/90">{runningSession.taskTitle || '主线专注中'}</p>
      </div>
      <span className="bg-white/10 text-rose-300 font-mono text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 tabular-nums">
        {Math.floor(focusTimeElapsed / 60)}:{String(focusTimeElapsed % 60).padStart(2, '0')}
      </span>
    </div>
  );
}

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {DailyReportPanel} from './DailyReportPanel';

const task = {
  id: 1,
  userId: 1,
  categoryId: 1,
  title: '写方案',
  plannedDate: '2026-06-05',
  status: 'DONE' as const,
  createdAt: '',
  updatedAt: '',
};

const session = {
  id: 1,
  taskId: 1,
  userId: 1,
  startedAt: '2026-06-05T01:00:00.000Z',
  endedAt: '2026-06-05T02:00:00.000Z',
  durationSeconds: 3600,
  status: 'COMPLETED' as const,
  createdAt: '',
};

describe('DailyReportPanel', () => {
  it('renders computed daily totals when data is loaded', () => {
    render(
      <DailyReportPanel
        styleContext={{primary: '#fb7185', primaryLight: '#fff1f2'}}
        dailyReportDate="2026-06-05"
        setDailyReportDate={() => {}}
        loadDailyStats={() => {}}
        dailyStatsLoaded
        dailyTasks={[task]}
        dailySessions={[session]}
        metrics={{
          dailyTotalMinutes: 60,
          prevDailyTotalMinutes: 30,
          dailyFocusDeltaPercent: 100,
          doneDailyTasksCount: 1,
          todoDailyTasksCount: 0,
          inProgressDailyTasksCount: 0,
          notDoneDailyTasksCount: 0,
          dailyCategoryDistributionData: [{name: '工作', minutes: 60, color: '#ef4444'}],
        }}
      />,
    );

    expect(screen.getByText('当日执行状况面板')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText(/\+100%/)).toBeInTheDocument();
  });
});

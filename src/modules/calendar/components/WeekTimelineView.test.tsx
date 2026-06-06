import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {writeCalendarDragPayload} from '../controllers/schedulingDrag';
import {WeekTimelineView} from './WeekTimelineView';

const categories = [
  {id: 1, userId: 1, name: '工作', color: '#ef4444', sortOrder: 1, createdAt: '', updatedAt: ''},
];

const task = {
  id: 1,
  userId: 1,
  categoryId: 1,
  title: '写方案',
  plannedDate: '2026-06-06',
  allDay: true,
  status: 'TODO',
  createdAt: '',
  updatedAt: '',
} as const;

function createDragData() {
  const values = new Map<string, string>();
  return {
    setData: (type: string, value: string) => values.set(type, value),
    getData: (type: string) => values.get(type) ?? '',
  } as unknown as DataTransfer;
}

function renderWeek(overrides: Partial<Parameters<typeof WeekTimelineView>[0]> = {}) {
  return render(
    <WeekTimelineView
      anchorDate="2026-06-06"
      tasksByDate={{'2026-06-06': [task]}}
      categories={categories}
      focusSessions={[]}
      showFocusSessions={false}
      onScheduleDate={vi.fn().mockResolvedValue(true)}
      onBatchScheduleDate={vi.fn().mockResolvedValue(true)}
      onScheduleTime={vi.fn().mockResolvedValue(true)}
      onMoveTimedTask={vi.fn().mockResolvedValue(true)}
      onResizeTimedTask={vi.fn().mockResolvedValue(true)}
      onRejectBatchTimeDrop={vi.fn()}
      {...overrides}
    />,
  );
}

describe('WeekTimelineView', () => {
  it('ignores unscheduled all-day tasks if malformed date groups include them', () => {
    render(
      <WeekTimelineView
        anchorDate="2026-06-06"
        tasksByDate={{'2026-06-06': [{...task, id: 99, title: '未安排', plannedDate: undefined}]}}
        categories={categories}
        focusSessions={[]}
        showFocusSessions={false}
        onScheduleDate={vi.fn().mockResolvedValue(true)}
        onBatchScheduleDate={vi.fn().mockResolvedValue(true)}
        onScheduleTime={vi.fn().mockResolvedValue(undefined)}
        onMoveTimedTask={vi.fn().mockResolvedValue(undefined)}
        onResizeTimedTask={vi.fn().mockResolvedValue(undefined)}
        onRejectBatchTimeDrop={vi.fn()}
      />,
    );

    expect(screen.queryByText('未安排')).not.toBeInTheDocument();
  });

  it('schedules a single task from the all-day lane drop target', () => {
    const onScheduleDate = vi.fn().mockResolvedValue(true);
    renderWeek({onScheduleDate});
    const data = createDragData();
    writeCalendarDragPayload(data, {type: 'calendar-task', taskId: 1, source: 'sidebar'});
    fireEvent.drop(screen.getByLabelText('2026-06-06 全天'), {dataTransfer: data});
    expect(onScheduleDate).toHaveBeenCalledWith(1, '2026-06-06');
  });

  it('renders duplicated cross-day all-day tasks as one continuous segment', () => {
    const crossDayTask = {
      ...task,
      id: 2,
      title: '跨天任务',
      plannedDate: '2026-06-05',
      plannedEndDate: '2026-06-07',
    };

    renderWeek({
      tasksByDate: {
        '2026-06-05': [crossDayTask],
        '2026-06-06': [crossDayTask],
        '2026-06-07': [crossDayTask],
      },
    });

    expect(screen.getByLabelText('2026-06-05 至 2026-06-07 跨天任务')).toBeInTheDocument();
    expect(screen.getAllByText('跨天任务')).toHaveLength(1);
  });

  it('renders overlapping all-day segments once each', () => {
    const firstTask = {
      ...task,
      id: 2,
      title: '跨天任务 A',
      plannedDate: '2026-06-03',
      plannedEndDate: '2026-06-05',
    };
    const secondTask = {
      ...task,
      id: 3,
      title: '跨天任务 B',
      plannedDate: '2026-06-04',
      plannedEndDate: '2026-06-06',
    };

    renderWeek({
      tasksByDate: {
        '2026-06-03': [firstTask],
        '2026-06-04': [firstTask, secondTask],
        '2026-06-05': [firstTask, secondTask],
        '2026-06-06': [secondTask],
      },
    });

    expect(screen.getByLabelText('2026-06-03 至 2026-06-05 跨天任务 A')).toBeInTheDocument();
    expect(screen.getByLabelText('2026-06-04 至 2026-06-06 跨天任务 B')).toBeInTheDocument();
    expect(screen.getAllByText(/跨天任务 [AB]/)).toHaveLength(2);
  });

  it('rejects batch payloads on time slots', () => {
    const onRejectBatchTimeDrop = vi.fn();
    renderWeek({onRejectBatchTimeDrop});
    const data = createDragData();
    writeCalendarDragPayload(data, {type: 'calendar-task-batch', taskIds: [1, 2], source: 'sidebar'});
    fireEvent.drop(screen.getByLabelText('2026-06-06 09:00'), {dataTransfer: data});
    expect(onRejectBatchTimeDrop).toHaveBeenCalledOnce();
  });
});

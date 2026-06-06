import {describe, expect, it} from 'vitest';

import type {Task} from '../../../../shared/domain/entities';
import {
  buildMonthGrid,
  buildWeekAllDaySegments,
  buildWeekDays,
  getCalendarRange,
  groupTasksByDate,
  segmentAllDayTask,
} from './calendarLayout';

const baseTask: Task = {
  id: 1,
  userId: 1,
  categoryId: 1,
  title: '写方案',
  plannedDate: '2026-06-06',
  allDay: true,
  status: 'TODO',
  createdAt: '',
  updatedAt: '',
};

describe('calendarLayout', () => {
  it('builds a Monday-first month grid', () => {
    const grid = buildMonthGrid('2026-06-06');
    expect(grid[0]).toEqual({isoDate: '2026-06-01', isCurrentMonth: true});
    expect(grid.at(-1)?.isoDate).toBe('2026-07-05');
  });

  it('builds week days and ranges', () => {
    expect(buildWeekDays('2026-06-06').map((day) => day.isoDate)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ]);
    expect(getCalendarRange('week', '2026-06-06')).toEqual({dateFrom: '2026-06-01', dateTo: '2026-06-07'});
    expect(getCalendarRange('list', '2026-06-06')).toEqual({dateFrom: '2026-06-01', dateTo: '2026-06-07'});
  });

  it('groups date, cross-day, and timed tasks by visible date', () => {
    const grouped = groupTasksByDate([
      baseTask,
      {...baseTask, id: 2, title: '跨天', plannedDate: '2026-06-05', plannedEndDate: '2026-06-07'},
      {...baseTask, id: 3, title: '会议', allDay: false, startAt: '2026-06-06T09:00:00.000', endAt: '2026-06-06T10:00:00.000'},
    ], '2026-06-06', '2026-06-06');

    expect(grouped['2026-06-06'].map((task) => task.title)).toEqual(['写方案', '跨天', '会议']);
  });

  it('segments all-day cross-day tasks within a visible range', () => {
    expect(segmentAllDayTask({
      ...baseTask,
      plannedDate: '2026-06-05',
      plannedEndDate: '2026-06-09',
    }, '2026-06-06', '2026-06-08')).toEqual({
      taskId: 1,
      startsOn: '2026-06-06',
      endsOn: '2026-06-08',
      continuesBefore: true,
      continuesAfter: true,
    });
  });

  it('does not group unscheduled tasks into calendar dates', () => {
    const grouped = groupTasksByDate([
      {...baseTask, id: 99, title: '未安排', plannedDate: undefined},
    ], '2026-06-01', '2026-06-07');

    expect(Object.values(grouped).flat()).toEqual([]);
  });

  it('builds week all-day segments for cross-day tasks', () => {
    expect(buildWeekAllDaySegments({
      dateFrom: '2026-06-15',
      dateTo: '2026-06-21',
      tasks: [
        {
          id: 1,
          userId: 1,
          categoryId: 1,
          title: '跨天任务',
          plannedDate: '2026-06-18',
          plannedEndDate: '2026-06-21',
          allDay: true,
          status: 'TODO',
          createdAt: '',
          updatedAt: '',
        },
      ],
    })).toEqual([
      {
        taskId: 1,
        startsOn: '2026-06-18',
        endsOn: '2026-06-21',
        startIndex: 3,
        span: 4,
        rowIndex: 0,
        continuesBefore: false,
        continuesAfter: false,
      },
    ]);
  });

  it('clips week all-day segments at visible boundaries', () => {
    expect(buildWeekAllDaySegments({
      dateFrom: '2026-06-15',
      dateTo: '2026-06-21',
      tasks: [
        {
          id: 1,
          userId: 1,
          categoryId: 1,
          title: '跨周任务',
          plannedDate: '2026-06-13',
          plannedEndDate: '2026-06-23',
          allDay: true,
          status: 'TODO',
          createdAt: '',
          updatedAt: '',
        },
      ],
    })[0]).toMatchObject({
      startsOn: '2026-06-15',
      endsOn: '2026-06-21',
      startIndex: 0,
      span: 7,
      rowIndex: 0,
      continuesBefore: true,
      continuesAfter: true,
    });
  });

  it('assigns separate rows to overlapping week all-day segments', () => {
    expect(buildWeekAllDaySegments({
      dateFrom: '2026-06-15',
      dateTo: '2026-06-21',
      tasks: [
        {
          id: 1,
          userId: 1,
          categoryId: 1,
          title: '跨天任务 A',
          plannedDate: '2026-06-18',
          plannedEndDate: '2026-06-20',
          allDay: true,
          status: 'TODO',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 2,
          userId: 1,
          categoryId: 1,
          title: '跨天任务 B',
          plannedDate: '2026-06-19',
          plannedEndDate: '2026-06-21',
          allDay: true,
          status: 'TODO',
          createdAt: '',
          updatedAt: '',
        },
      ],
    }).map((segment) => ({
      taskId: segment.taskId,
      startIndex: segment.startIndex,
      span: segment.span,
      rowIndex: segment.rowIndex,
    }))).toEqual([
      {taskId: 1, startIndex: 3, span: 3, rowIndex: 0},
      {taskId: 2, startIndex: 4, span: 3, rowIndex: 1},
    ]);
  });
});

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {MonthCalendarView} from './MonthCalendarView';

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

describe('MonthCalendarView', () => {
  it('creates a task when an empty date cell is clicked', () => {
    const createTask = vi.fn().mockResolvedValue(undefined);

    render(
      <MonthCalendarView
        anchorDate="2026-06-06"
        tasksByDate={{}}
        categories={categories}
        onCreateDateTask={createTask}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: '2026-06-06'}));

    expect(createTask).toHaveBeenCalledWith('2026-06-06');
  });

  it('does not create a new task when an existing task block is clicked', () => {
    const createTask = vi.fn().mockResolvedValue(undefined);

    render(
      <MonthCalendarView
        anchorDate="2026-06-06"
        tasksByDate={{'2026-06-06': [task]}}
        categories={categories}
        onCreateDateTask={createTask}
      />,
    );

    fireEvent.click(screen.getByText('写方案'));

    expect(createTask).not.toHaveBeenCalled();
  });

  it('does not expose unfinished drag scheduling behavior', () => {
    render(
      <MonthCalendarView
        anchorDate="2026-06-06"
        tasksByDate={{'2026-06-06': [task]}}
        categories={categories}
        onCreateDateTask={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('写方案')).not.toHaveAttribute('draggable');
  });
});

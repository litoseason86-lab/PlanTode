import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {calendarApi} from '../api/calendarApi';
import {CalendarPanel} from './CalendarPanel';

vi.mock('../api/calendarApi', () => ({
  calendarApi: {
    getCalendarTasks: vi.fn(),
    getFocusSessions: vi.fn(),
    createCalendarTask: vi.fn(),
    updateTaskSchedule: vi.fn(),
  },
}));

describe('CalendarPanel', () => {
  it('renders calendar shell and view switcher', () => {
    vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
    vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);

    render(
      <CalendarPanel
        categories={[]}
        styleContext={{primary: '#fb7185', primaryLight: '#ffe4e6', secondary: '#fda4af'}}
        showToast={vi.fn()}
        initialDate="2026-06-06"
      />,
    );

    expect(screen.getByRole('heading', {name: '日历'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '月'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '周'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '列表'})).toBeInTheDocument();
  });
});

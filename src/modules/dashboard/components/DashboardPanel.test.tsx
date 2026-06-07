import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {DashboardPanel} from './DashboardPanel';

const categories = [
  {
    id: 1,
    userId: 1,
    name: '工作',
    color: '#ef4444',
    sortOrder: 1,
    createdAt: '',
    updatedAt: '',
  },
];

const tasks = [
  {
    id: 1,
    userId: 1,
    categoryId: 1,
    title: '写方案',
    plannedDate: '2026-06-05',
    allDay: true,
    status: 'TODO' as const,
    priority: null,
    tagIds: [] as number[],
    createdAt: '',
    updatedAt: '',
  },
];

describe('DashboardPanel', () => {
  it('submits quick task creation for the selected date and shows dashboard title', () => {
    const todayQuickCreate = {
      title: '写方案',
      categoryId: 1,
      isCreating: false,
      setTitle: vi.fn(),
      setCategoryId: vi.fn(),
      createTodayTask: vi.fn(),
    };

    render(
      <DashboardPanel
        styleContext={{primary: '#fb7185', primaryLight: '#fff1f2', secondary: '#fda4af'}}
        categories={categories}
        tasks={tasks}
        selectedDate="2026-06-05"
        setSelectedDate={vi.fn()}
        todayCategoryFocusData={[{name: '工作', minutes: 20, color: '#ef4444'}]}
        todayQuickCreate={todayQuickCreate}
        handleUpdateTaskStatus={vi.fn()}
        handleStartSession={vi.fn()}
        handleStopSession={vi.fn()}
        runningSession={null}
        lastFinishedSessionTask={null}
        setLastFinishedSessionTask={vi.fn()}
        getTaskFocusMinutes={() => 20}
      />,
    );

    expect(screen.getByText('今日规划时空轴')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: /快速派遣/i}));

    expect(todayQuickCreate.createTodayTask).toHaveBeenCalledWith();
  });

  it('disables quick-create controls while creating', () => {
    render(
      <DashboardPanel
        styleContext={{primary: '#fb7185', primaryLight: '#fff1f2', secondary: '#fda4af'}}
        categories={categories}
        tasks={tasks}
        selectedDate="2026-06-05"
        setSelectedDate={vi.fn()}
        todayCategoryFocusData={[]}
        todayQuickCreate={{
          title: '写方案',
          categoryId: 1,
          isCreating: true,
          setTitle: vi.fn(),
          setCategoryId: vi.fn(),
          createTodayTask: vi.fn(),
        }}
        handleUpdateTaskStatus={vi.fn()}
        handleStartSession={vi.fn()}
        handleStopSession={vi.fn()}
        runningSession={null}
        lastFinishedSessionTask={null}
        setLastFinishedSessionTask={vi.fn()}
        getTaskFocusMinutes={() => 0}
      />,
    );

    expect(screen.getByPlaceholderText('💡 快速添加今日行动计划...')).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', {name: /快速派遣/i})).toBeDisabled();
  });
});

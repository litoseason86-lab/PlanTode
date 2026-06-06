import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {Category} from '../../../../shared/domain/entities';
import type {CalendarQuickCreateDraft} from '../controllers/weekTimelineInteraction';
import {CalendarQuickCreatePopover} from './CalendarQuickCreatePopover';

const categories: Category[] = [
  {id: 1, userId: 1, name: '工作', color: '#ef4444', sortOrder: 1, createdAt: '', updatedAt: ''},
  {id: 2, userId: 1, name: '学习', color: '#3b82f6', sortOrder: 2, createdAt: '', updatedAt: ''},
];

const timedDraft: CalendarQuickCreateDraft = {
  kind: 'timed',
  plannedDate: '2026-06-06',
  startAt: '2026-06-06T09:00:00.000',
  endAt: '2026-06-06T10:00:00.000',
  anchor: {x: 30, y: 40},
};

describe('CalendarQuickCreatePopover', () => {
  it('renders timed draft range and submits title/category', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ok: true});
    render(
      <CalendarQuickCreatePopover
        draft={timedDraft}
        categories={categories}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('任务标题'), {target: {value: '写方案'}});
    fireEvent.change(screen.getByLabelText('任务分类'), {target: {value: '2'}});
    fireEvent.click(screen.getByRole('button', {name: '保存'}));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({title: '写方案', categoryId: 2}));
  });

  it('renders all-day date range', () => {
    render(
      <CalendarQuickCreatePopover
        draft={{kind: 'all-day', plannedDate: '2026-06-18', plannedEndDate: '2026-06-21', anchor: {x: 0, y: 0}}}
        categories={categories}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('06-18 - 06-21')).toBeInTheDocument();
  });

  it('blocks empty titles with inline error', () => {
    const onSubmit = vi.fn();
    render(
      <CalendarQuickCreatePopover
        draft={timedDraft}
        categories={categories}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: '保存'}));

    expect(screen.getByText('请输入任务标题')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit when there are no categories', () => {
    const onSubmit = vi.fn();
    render(
      <CalendarQuickCreatePopover
        draft={timedDraft}
        categories={[]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('请先创建分类')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '保存'})).toBeDisabled();
  });

  it('keeps user input when submit fails', async () => {
    render(
      <CalendarQuickCreatePopover
        draft={timedDraft}
        categories={categories}
        onCancel={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue({ok: false, message: '创建失败'})}
      />,
    );

    fireEvent.change(screen.getByLabelText('任务标题'), {target: {value: '写方案'}});
    fireEvent.click(screen.getByRole('button', {name: '保存'}));

    expect(await screen.findByText('创建失败')).toBeInTheDocument();
    expect(screen.getByLabelText('任务标题')).toHaveValue('写方案');
  });

  it('cancels from document Escape and cancel button', () => {
    const onCancel = vi.fn();
    const {rerender} = render(
      <CalendarQuickCreatePopover
        draft={timedDraft}
        categories={categories}
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, {key: 'Escape'});
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(
      <CalendarQuickCreatePopover
        draft={timedDraft}
        categories={categories}
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', {name: '取消'}));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('removes the Escape listener on unmount', () => {
    const onCancel = vi.fn();
    const {unmount} = render(
      <CalendarQuickCreatePopover
        draft={timedDraft}
        categories={categories}
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />,
    );

    unmount();
    fireEvent.keyDown(document, {key: 'Escape'});

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('submits from Enter in the title input', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ok: true});
    render(
      <CalendarQuickCreatePopover
        draft={timedDraft}
        categories={categories}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('任务标题'), {target: {value: '写方案'}});
    fireEvent.keyDown(screen.getByLabelText('任务标题'), {key: 'Enter'});

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({title: '写方案', categoryId: 1}));
  });

  it('cancels from outside pointer down', () => {
    const onCancel = vi.fn();
    render(
      <div>
        <button type="button">外部区域</button>
        <CalendarQuickCreatePopover
          draft={timedDraft}
          categories={categories}
          onCancel={onCancel}
          onSubmit={vi.fn()}
        />
      </div>,
    );

    fireEvent.pointerDown(screen.getByRole('button', {name: '外部区域'}));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

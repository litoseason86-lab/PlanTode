import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {Tag} from '../../../../shared/domain/entities';
import {TagCombobox} from './TagCombobox';

const tags: Tag[] = [
  {id: 1, userId: 1, name: 'Foo Bar', createdAt: '', updatedAt: ''},
  {id: 2, userId: 1, name: '客户 A', createdAt: '', updatedAt: ''},
];

describe('TagCombobox', () => {
  it('renders a labeled combobox and selected tag chips', () => {
    render(<TagCombobox tags={tags} selectedTagIds={[1]} onChange={vi.fn()} onCreateTag={vi.fn()} />);

    expect(screen.getByRole('combobox', {name: /标签/})).toBeInTheDocument();
    expect(screen.getByText('Foo Bar')).toBeInTheDocument();
  });

  it('creates a normalized tag on explicit Enter and selects the returned tag', async () => {
    const onCreateTag = vi.fn().mockResolvedValue({id: 3, userId: 1, name: 'Foo Baz', createdAt: '', updatedAt: ''});
    const onChange = vi.fn();
    render(<TagCombobox tags={[]} selectedTagIds={[]} onChange={onChange} onCreateTag={onCreateTag} />);

    const input = screen.getByRole('combobox', {name: /标签/});
    fireEvent.change(input, {target: {value: 'Foo   Baz'}});
    fireEvent.keyDown(input, {key: 'Enter'});

    await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith('Foo Baz'));
    expect(onChange).toHaveBeenCalledWith([3]);
  });

  it('selects an existing normalized match instead of creating a duplicate', async () => {
    const onCreateTag = vi.fn();
    const onChange = vi.fn();
    render(<TagCombobox tags={tags} selectedTagIds={[]} onChange={onChange} onCreateTag={onCreateTag} />);

    const input = screen.getByRole('combobox', {name: /标签/});
    fireEvent.change(input, {target: {value: '  foo   bar  '}});
    fireEvent.keyDown(input, {key: 'Enter'});

    expect(onCreateTag).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith([1]);
    expect(input).toHaveValue('');
  });

  it('does not create while composition input is active', () => {
    const onCreateTag = vi.fn();
    const onChange = vi.fn();
    render(<TagCombobox tags={[]} selectedTagIds={[]} onChange={onChange} onCreateTag={onCreateTag} />);

    const input = screen.getByRole('combobox', {name: /标签/});
    fireEvent.change(input, {target: {value: '客户'}});
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, {key: 'Enter'});

    expect(onCreateTag).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('客户');
  });

  it('disables the input while create is pending', async () => {
    let resolveCreate!: (value: Tag) => void;
    const createPromise = new Promise<Tag>((resolve) => {
      resolveCreate = resolve;
    });
    const onCreateTag = vi.fn().mockReturnValue(createPromise);
    render(<TagCombobox tags={[]} selectedTagIds={[]} onChange={vi.fn()} onCreateTag={onCreateTag} />);

    const input = screen.getByRole('combobox', {name: /标签/});
    fireEvent.change(input, {target: {value: '新标签'}});
    fireEvent.keyDown(input, {key: 'Enter'});

    await waitFor(() => expect(input).toBeDisabled());
    resolveCreate({id: 3, userId: 1, name: '新标签', createdAt: '', updatedAt: ''});
    await waitFor(() => expect(input).not.toBeDisabled());
  });

  it('guards against duplicate create submissions before rerender', async () => {
    let resolveCreate!: (value: Tag) => void;
    const createPromise = new Promise<Tag>((resolve) => {
      resolveCreate = resolve;
    });
    const onCreateTag = vi.fn().mockReturnValue(createPromise);
    render(<TagCombobox tags={[]} selectedTagIds={[]} onChange={vi.fn()} onCreateTag={onCreateTag} />);

    const input = screen.getByRole('combobox', {name: /标签/});
    fireEvent.change(input, {target: {value: '新标签'}});
    fireEvent.keyDown(input, {key: 'Enter'});
    fireEvent.keyDown(input, {key: 'Enter'});

    expect(onCreateTag).toHaveBeenCalledTimes(1);
    resolveCreate({id: 3, userId: 1, name: '新标签', createdAt: '', updatedAt: ''});
    await waitFor(() => expect(input).not.toBeDisabled());
  });

  it('uses latest selected ids when create resolves', async () => {
    let resolveCreate!: (value: Tag) => void;
    const createPromise = new Promise<Tag>((resolve) => {
      resolveCreate = resolve;
    });
    const onCreateTag = vi.fn().mockReturnValue(createPromise);
    const onChange = vi.fn();
    const {rerender} = render(
      <TagCombobox tags={[]} selectedTagIds={[1]} onChange={onChange} onCreateTag={onCreateTag} />,
    );

    const input = screen.getByRole('combobox', {name: /标签/});
    fireEvent.change(input, {target: {value: '新标签'}});
    fireEvent.keyDown(input, {key: 'Enter'});

    rerender(<TagCombobox tags={[]} selectedTagIds={[1, 2]} onChange={onChange} onCreateTag={onCreateTag} />);
    resolveCreate({id: 3, userId: 1, name: '新标签', createdAt: '', updatedAt: ''});

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([1, 2, 3]));
  });

  it('keeps input and selection unchanged when create fails', async () => {
    const onCreateTag = vi.fn().mockRejectedValue(new Error('创建失败'));
    const onChange = vi.fn();
    render(<TagCombobox tags={[]} selectedTagIds={[]} onChange={onChange} onCreateTag={onCreateTag} />);

    const input = screen.getByRole('combobox', {name: /标签/});
    fireEvent.change(input, {target: {value: '失败标签'}});
    fireEvent.keyDown(input, {key: 'Enter'});

    await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith('失败标签'));
    await waitFor(() => expect(input).not.toBeDisabled());
    expect(input).toHaveValue('失败标签');
    expect(onChange).not.toHaveBeenCalled();
  });
});

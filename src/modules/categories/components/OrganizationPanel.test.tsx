import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import type {Category, Tag, Task} from '../../../../shared/domain/entities';
import {OrganizationPanel} from './OrganizationPanel';

const categories: Category[] = [
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

const tags: Tag[] = [
  {id: 1, userId: 1, name: '客户A', createdAt: '', updatedAt: ''},
];

const allTasks: Task[] = [
  {
    id: 1,
    userId: 1,
    categoryId: 1,
    title: '整理计划',
    plannedDate: '2026-06-05',
    allDay: true,
    status: 'TODO',
    priority: null,
    tagIds: [1],
    createdAt: '',
    updatedAt: '',
  },
];

const categoryController = {
  allTasks,
  presetColors: [{hex: '#fb7185', label: '樱花粉'}],
  isCategoryModalOpen: false,
  editingCategory: null,
  catFormName: '',
  catFormColor: '#fb7185',
  catFormSort: 0,
  setIsCategoryModalOpen: vi.fn(),
  setCatFormName: vi.fn(),
  setCatFormColor: vi.fn(),
  setCatFormSort: vi.fn(),
  handleOpenCategoryModal: vi.fn(),
  handleDeleteCategory: vi.fn(),
  handleSaveCategory: vi.fn(),
};

const styleContext = {
  primary: '#fb7185',
  primaryLight: '#fff1f2',
};

function buildOrganizationPanelProps(overrides = {}) {
  return {
    categories,
    tags,
    categoryController,
    tagController: {
      createTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
    },
    styleContext,
    ...overrides,
  };
}

describe('OrganizationPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders category and tag sections under the organization page', () => {
    const props = buildOrganizationPanelProps({categories, tags});

    render(<OrganizationPanel {...props} />);

    expect(screen.getByRole('heading', {name: '分类'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: '标签'})).toBeInTheDocument();
  });

  it('deletes a tag with copy that preserves tasks', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const tagController = {createTag: vi.fn(), updateTag: vi.fn(), deleteTag: vi.fn()};
    const props = buildOrganizationPanelProps({tags, tagController});

    render(<OrganizationPanel {...props} />);

    fireEvent.click(screen.getByLabelText('删除标签 客户A'));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalledWith('删除标签「客户A」？任务会保留，只会移除这个标签关联。'));
    expect(tagController.deleteTag).toHaveBeenCalledWith(1);
  });

  it('creates and renames tags through tagController', async () => {
    const tagController = {createTag: vi.fn(), updateTag: vi.fn(), deleteTag: vi.fn()};
    const props = buildOrganizationPanelProps({tagController});

    render(<OrganizationPanel {...props} />);

    fireEvent.change(screen.getByLabelText('新标签'), {target: {value: '客户A'}});
    fireEvent.click(screen.getByRole('button', {name: '新增标签'}));
    await waitFor(() => expect(tagController.createTag).toHaveBeenCalledWith('客户A'));

    fireEvent.click(screen.getByLabelText('重命名标签 客户A'));
    fireEvent.change(screen.getByLabelText('标签名称'), {target: {value: ''}});
    fireEvent.change(screen.getByLabelText('标签名称'), {target: {value: '客户B'}});
    fireEvent.click(screen.getByRole('button', {name: '保存标签'}));

    await waitFor(() => expect(tagController.updateTag).toHaveBeenCalledWith(1, '客户B'));
  });

  it('does not delete a tag when confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const tagController = {createTag: vi.fn(), updateTag: vi.fn(), deleteTag: vi.fn()};
    const props = buildOrganizationPanelProps({tagController});

    render(<OrganizationPanel {...props} />);

    fireEvent.click(screen.getByLabelText('删除标签 客户A'));

    expect(tagController.deleteTag).not.toHaveBeenCalled();
  });

  it('does not save an empty tag rename', () => {
    const tagController = {createTag: vi.fn(), updateTag: vi.fn(), deleteTag: vi.fn()};
    const props = buildOrganizationPanelProps({tagController});

    render(<OrganizationPanel {...props} />);

    fireEvent.click(screen.getByLabelText('重命名标签 客户A'));
    fireEvent.change(screen.getByLabelText('标签名称'), {target: {value: '   '}});
    fireEvent.click(screen.getByRole('button', {name: '保存标签'}));

    expect(tagController.updateTag).not.toHaveBeenCalled();
  });

  it('shows a tag operation error without clearing local input', async () => {
    const tagController = {
      createTag: vi.fn().mockRejectedValue(new Error('network failed')),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
    };
    const props = buildOrganizationPanelProps({tagController});

    render(<OrganizationPanel {...props} />);

    fireEvent.change(screen.getByLabelText('新标签'), {target: {value: '客户C'}});
    fireEvent.click(screen.getByRole('button', {name: '新增标签'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('network failed');
    expect(screen.getByLabelText('新标签')).toHaveValue('客户C');
  });
});

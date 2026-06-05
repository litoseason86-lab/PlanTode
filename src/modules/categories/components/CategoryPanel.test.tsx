import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {CategoryPanel} from './CategoryPanel';

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
    title: '整理计划',
    plannedDate: '2026-06-05',
    status: 'TODO' as const,
    createdAt: '',
    updatedAt: '',
  },
];

const presetColors = [{hex: '#fb7185', label: '樱花粉'}];

describe('CategoryPanel', () => {
  it('opens creation flow from header action', () => {
    const onOpen = vi.fn();

    render(
      <CategoryPanel
        styleContext={{primary: '#fb7185', primaryLight: '#fff1f2'}}
        categories={categories}
        allTasks={tasks}
        presetColors={presetColors}
        isCategoryModalOpen={false}
        editingCategory={null}
        catFormName=""
        catFormColor="#fb7185"
        catFormSort={0}
        setIsCategoryModalOpen={vi.fn()}
        setCatFormName={vi.fn()}
        setCatFormColor={vi.fn()}
        setCatFormSort={vi.fn()}
        handleOpenCategoryModal={onOpen}
        handleDeleteCategory={vi.fn()}
        handleSaveCategory={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: /新建分类/i}));

    expect(onOpen).toHaveBeenCalledWith(null);
  });

  it('sends save action from modal', () => {
    const onSave = vi.fn();

    render(
      <CategoryPanel
        styleContext={{primary: '#fb7185', primaryLight: '#fff1f2'}}
        categories={categories}
        allTasks={tasks}
        presetColors={presetColors}
        isCategoryModalOpen
        editingCategory={null}
        catFormName="学习"
        catFormColor="#fb7185"
        catFormSort={10}
        setIsCategoryModalOpen={vi.fn()}
        setCatFormName={vi.fn()}
        setCatFormColor={vi.fn()}
        setCatFormSort={vi.fn()}
        handleOpenCategoryModal={vi.fn()}
        handleDeleteCategory={vi.fn()}
        handleSaveCategory={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: /创建分类/i}));

    expect(onSave).toHaveBeenCalledOnce();
  });
});


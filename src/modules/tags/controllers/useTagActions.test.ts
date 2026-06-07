import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {tagsApi} from '../api/tagsApi';
import {useTagActions} from './useTagActions';

vi.mock('../api/tagsApi', () => ({
  tagsApi: {
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}));

describe('useTagActions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a tag then refreshes tags', async () => {
    vi.mocked(tagsApi.createTag).mockResolvedValue({id: 1, userId: 1, name: '客户A', createdAt: '', updatedAt: ''});
    const refreshTags = vi.fn().mockResolvedValue([]);
    const {result} = renderHook(() => useTagActions({refreshTags, refreshAllTasks: vi.fn()}));

    await act(async () => {
      await result.current.createTag('客户A');
    });

    expect(tagsApi.createTag).toHaveBeenCalledWith({name: '客户A'});
    expect(refreshTags).toHaveBeenCalled();
  });

  it('normalizes a tag name before creation', async () => {
    vi.mocked(tagsApi.createTag).mockResolvedValue({id: 1, userId: 1, name: 'Foo Bar', createdAt: '', updatedAt: ''});
    const {result} = renderHook(() => useTagActions({refreshTags: vi.fn().mockResolvedValue([]), refreshAllTasks: vi.fn()}));

    await act(async () => {
      await result.current.createTag('  Foo   Bar  ');
    });

    expect(tagsApi.createTag).toHaveBeenCalledWith({name: 'Foo Bar'});
  });

  it('deletes a tag then refreshes tags and tasks', async () => {
    vi.mocked(tagsApi.deleteTag).mockResolvedValue(undefined);
    const refreshTags = vi.fn().mockResolvedValue([]);
    const refreshAllTasks = vi.fn().mockResolvedValue([]);
    const {result} = renderHook(() => useTagActions({refreshTags, refreshAllTasks}));

    await act(async () => {
      await result.current.deleteTag(1);
    });

    expect(tagsApi.deleteTag).toHaveBeenCalledWith(1);
    expect(refreshTags).toHaveBeenCalled();
    expect(refreshAllTasks).toHaveBeenCalled();
  });

  it('renames a tag then refreshes tags and tasks', async () => {
    vi.mocked(tagsApi.updateTag).mockResolvedValue({id: 1, userId: 1, name: '客户B', createdAt: '', updatedAt: ''});
    const refreshTags = vi.fn().mockResolvedValue([]);
    const refreshAllTasks = vi.fn().mockResolvedValue([]);
    const {result} = renderHook(() => useTagActions({refreshTags, refreshAllTasks}));

    await act(async () => {
      await result.current.updateTag(1, '客户B');
    });

    expect(tagsApi.updateTag).toHaveBeenCalledWith(1, {name: '客户B'});
    expect(refreshTags).toHaveBeenCalled();
    expect(refreshAllTasks).toHaveBeenCalled();
  });

  it('still refreshes tasks when refreshing tags fails after rename', async () => {
    vi.mocked(tagsApi.updateTag).mockResolvedValue({id: 1, userId: 1, name: '客户B', createdAt: '', updatedAt: ''});
    const refreshTags = vi.fn().mockRejectedValue(new Error('refresh tags failed'));
    const refreshAllTasks = vi.fn().mockResolvedValue([]);
    const {result} = renderHook(() => useTagActions({refreshTags, refreshAllTasks}));

    await expect(result.current.updateTag(1, '客户B')).rejects.toThrow('refresh tags failed');

    expect(refreshTags).toHaveBeenCalled();
    expect(refreshAllTasks).toHaveBeenCalled();
  });

  it('still refreshes tasks when refreshing tags fails after delete', async () => {
    vi.mocked(tagsApi.deleteTag).mockResolvedValue(undefined);
    const refreshTags = vi.fn().mockRejectedValue(new Error('refresh tags failed'));
    const refreshAllTasks = vi.fn().mockResolvedValue([]);
    const {result} = renderHook(() => useTagActions({refreshTags, refreshAllTasks}));

    await expect(result.current.deleteTag(1)).rejects.toThrow('refresh tags failed');

    expect(refreshTags).toHaveBeenCalled();
    expect(refreshAllTasks).toHaveBeenCalled();
  });
});

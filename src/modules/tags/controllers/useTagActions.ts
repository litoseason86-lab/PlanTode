import {useCallback} from 'react';

import type {Tag, Task} from '../../../../shared/domain/entities';
import {tagsApi} from '../api/tagsApi';
import {normalizeTagInput} from './tagName';

interface UseTagActionsInput {
  refreshTags: () => Promise<Tag[]>;
  refreshAllTasks: () => Promise<Task[]>;
}

export function useTagActions({refreshTags, refreshAllTasks}: UseTagActionsInput) {
  const createTag = useCallback(async (name: string) => {
    const tag = await tagsApi.createTag({name: normalizeTagInput(name)});
    await refreshTags();
    return tag;
  }, [refreshTags]);

  const updateTag = useCallback(async (id: number, name: string) => {
    const tag = await tagsApi.updateTag(id, {name: normalizeTagInput(name)});
    await Promise.all([refreshTags(), refreshAllTasks()]);
    return tag;
  }, [refreshAllTasks, refreshTags]);

  const deleteTag = useCallback(async (id: number) => {
    await tagsApi.deleteTag(id);
    await Promise.all([refreshTags(), refreshAllTasks()]);
  }, [refreshAllTasks, refreshTags]);

  return {createTag, updateTag, deleteTag};
}

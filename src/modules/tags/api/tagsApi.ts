import type {Tag} from '../../../../shared/domain/entities';
import {requestJson} from '../../../shared/api/httpClient';

export const tagsApi = {
  getTags(): Promise<Tag[]> {
    return requestJson<Tag[]>('/api/tags');
  },

  createTag(input: {name: string}): Promise<Tag> {
    return requestJson<Tag>('/api/tags', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateTag(id: number, input: {name: string}): Promise<Tag> {
    return requestJson<Tag>(`/api/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  deleteTag(id: number): Promise<void> {
    return requestJson<void>(`/api/tags/${id}`, {
      method: 'DELETE',
    });
  },
};

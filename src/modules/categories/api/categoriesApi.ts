import type {Category} from '../../../../shared/domain/entities';
import {requestJson} from '../../../shared/api/httpClient';

export const categoriesApi = {
  getCategories(): Promise<Category[]> {
    return requestJson<Category[]>('/api/categories');
  },

  createCategory(category: {name: string; color: string; sortOrder: number}): Promise<Category> {
    return requestJson<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  updateCategory(id: number, category: {name: string; color: string; sortOrder: number}): Promise<Category> {
    return requestJson<Category>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  },

  deleteCategory(id: number): Promise<{success: boolean; message: string}> {
    return requestJson<{success: boolean; message: string}>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },
};


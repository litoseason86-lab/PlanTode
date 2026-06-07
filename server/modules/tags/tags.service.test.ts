import {describe, expect, it, vi} from 'vitest';

import {AppError} from '../../shared/errors/appError';
import {TagsService} from './service';

function buildRepo(overrides = {}) {
  return {
    listByUser: vi.fn(() => []),
    getById: vi.fn(),
    getManyByIds: vi.fn(),
    getByNormalizedName: vi.fn(),
    create: vi.fn(),
    createOrReuse: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

describe('TagsService', () => {
  it('lists tags for a user', () => {
    const tags = [{id: 1, userId: 1, name: 'Foo', createdAt: '', updatedAt: ''}];
    const repo = buildRepo({listByUser: vi.fn(() => tags)});
    const service = new TagsService(repo);

    expect(service.list(1)).toEqual(tags);
    expect(repo.listByUser).toHaveBeenCalledWith(1);
  });

  it('reuses existing tags by normalized name', () => {
    const existing = {id: 1, userId: 1, name: 'Foo Bar', createdAt: '', updatedAt: ''};
    const repo = buildRepo({
      getByNormalizedName: vi.fn(() => existing),
      createOrReuse: vi.fn(() => existing),
    });
    const service = new TagsService(repo);

    expect(service.create({userId: 1, name: 'foo   bar'})).toEqual(existing);
    expect(repo.createOrReuse).toHaveBeenCalledWith({userId: 1, name: 'foo bar', normalizedName: 'foo bar'});
  });

  it('updates tags with normalized names', () => {
    const updated = {id: 12, userId: 1, name: '客户 B', createdAt: '', updatedAt: ''};
    const repo = buildRepo({
      getByNormalizedName: vi.fn(),
      update: vi.fn(() => updated),
    });
    const service = new TagsService(repo);

    expect(service.update({tagId: 12, userId: 1, name: ' 客户   B '})).toEqual(updated);
    expect(repo.update).toHaveBeenCalledWith({tagId: 12, userId: 1, name: '客户 B', normalizedName: '客户 b'});
  });

  it('rejects updates that duplicate another normalized tag name', () => {
    const repo = buildRepo({
      getByNormalizedName: vi.fn(() => ({id: 11, userId: 1, name: '客户A', createdAt: '', updatedAt: ''})),
      update: vi.fn(),
    });
    const service = new TagsService(repo);

    expect(() => service.update({tagId: 12, userId: 1, name: '客户A'})).toThrow(AppError);
    expect(() => service.update({tagId: 12, userId: 1, name: '客户A'})).toThrow(
      'Another tag with this name already exists.',
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws not found when updating a missing tag', () => {
    const repo = buildRepo({
      getByNormalizedName: vi.fn(),
      update: vi.fn(),
    });
    const service = new TagsService(repo);

    expect(() => service.update({tagId: 12, userId: 1, name: '客户A'})).toThrow('Tag not found');
  });

  it('deletes existing tags', () => {
    const repo = buildRepo({remove: vi.fn(() => true)});
    const service = new TagsService(repo);

    expect(service.delete(12, 1)).toBeUndefined();
    expect(repo.remove).toHaveBeenCalledWith(12, 1);
  });

  it('throws not found when deleting a missing tag', () => {
    const repo = buildRepo({remove: vi.fn(() => false)});
    const service = new TagsService(repo);

    expect(() => service.delete(12, 1)).toThrow('Tag not found');
  });
});

import {afterEach, describe, expect, it, vi} from 'vitest';

import {tagsApi} from './tagsApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tagsApi', () => {
  it('gets tags', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true, json: async () => []});
    vi.stubGlobal('fetch', fetch);

    await tagsApi.getTags();

    expect(fetch).toHaveBeenCalledWith('/api/tags', expect.any(Object));
  });

  it('creates tags with a normalized payload', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({id: 1, userId: 1, name: 'Foo Bar', createdAt: '', updatedAt: ''}),
    });
    vi.stubGlobal('fetch', fetch);

    await tagsApi.createTag({name: 'Foo Bar'});

    expect(fetch).toHaveBeenCalledWith('/api/tags', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({name: 'Foo Bar'}),
    }));
  });

  it('updates tags by id', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({id: 1, userId: 1, name: 'Foo Baz', createdAt: '', updatedAt: ''}),
    });
    vi.stubGlobal('fetch', fetch);

    await tagsApi.updateTag(1, {name: 'Foo Baz'});

    expect(fetch).toHaveBeenCalledWith('/api/tags/1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({name: 'Foo Baz'}),
    }));
  });

  it('deletes tags by id', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true, status: 204});
    vi.stubGlobal('fetch', fetch);

    await tagsApi.deleteTag(1);

    expect(fetch).toHaveBeenCalledWith('/api/tags/1', expect.objectContaining({method: 'DELETE'}));
  });
});

import express from 'express';
import type {Server} from 'node:http';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {buildTagRoutes} from './routes';

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

function buildApp(
  service = {
    list: vi.fn(() => []),
    create: vi.fn((input) => ({id: 1, userId: input.userId, name: input.name, createdAt: '', updatedAt: ''})),
    update: vi.fn((input) => ({id: input.tagId, userId: input.userId, name: input.name, createdAt: '', updatedAt: ''})),
    delete: vi.fn(),
  },
) {
  const app = express();
  app.use(express.json());
  app.use('/api', buildTagRoutes(service as never));
  return {app, service};
}

async function request(app: express.Express, path: string, init: RequestInit = {}) {
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const address = server!.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a port');
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

describe('tag routes', () => {
  it('lists tags for the current user', async () => {
    const {app, service} = buildApp();
    const response = await request(app, '/api/tags');
    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(1);
  });

  it('creates tags from the request body', async () => {
    const {app, service} = buildApp();
    const response = await request(app, '/api/tags', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: ' 客户A '}),
    });
    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith({userId: 1, name: '客户A'});
  });

  it('updates tags by id', async () => {
    const {app, service} = buildApp();
    const response = await request(app, '/api/tags/12', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: '客户B'}),
    });
    expect(response.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith({tagId: 12, userId: 1, name: '客户B'});
  });

  it('deletes tags with a 204 response', async () => {
    const {app, service} = buildApp();
    const response = await request(app, '/api/tags/12', {method: 'DELETE'});
    expect(response.status).toBe(204);
    expect(service.delete).toHaveBeenCalledWith(12, 1);
  });
});

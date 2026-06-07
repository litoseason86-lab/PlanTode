import express from 'express';
import type {Server} from 'node:http';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {buildTaskRoutes} from './routes';

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

function buildService(overrides = {}) {
  return {
    list: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    updateSchedule: vi.fn(() => ({id: 1})),
    updateDetails: vi.fn(() => ({id: 1})),
    batchScheduleDate: vi.fn(() => [{id: 1}, {id: 2}]),
    batchUnschedule: vi.fn(() => [{id: 1}, {id: 2}]),
    delete: vi.fn(),
    ...overrides,
  };
}

async function request(service: ReturnType<typeof buildService>, path: string, options: {method?: string; body?: unknown} = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api', buildTaskRoutes(service as unknown as Parameters<typeof buildTaskRoutes>[0]));

  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const address = server!.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not bind to a port');
  }

  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: options.method ?? 'PATCH',
    headers: options.body === undefined ? undefined : {'Content-Type': 'application/json'},
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

describe('task routes', () => {
  it('routes batch schedule to the static batch handler', async () => {
    const service = buildService();

    const response = await request(service, '/api/tasks/batch-schedule', {body: {
      taskIds: [1, 2],
      plannedDate: '2026-06-06',
    }});

    expect(response.status).toBe(200);
    expect(service.batchScheduleDate).toHaveBeenCalledWith({
      userId: 1,
      taskIds: [1, 2],
      plannedDate: '2026-06-06',
    });
    expect(service.updateSchedule).not.toHaveBeenCalled();
  });

  it('routes batch unschedule to the static batch handler', async () => {
    const service = buildService();

    const response = await request(service, '/api/tasks/batch-unschedule', {body: {taskIds: [1, 2]}});

    expect(response.status).toBe(200);
    expect(service.batchUnschedule).toHaveBeenCalledWith({userId: 1, taskIds: [1, 2]});
    expect(service.updateSchedule).not.toHaveBeenCalled();
  });

  it('rejects single-task empty schedule body', async () => {
    const service = buildService();

    const response = await request(service, '/api/tasks/1/schedule', {body: {}});

    expect(response.status).toBe(400);
    expect(service.updateSchedule).not.toHaveBeenCalled();
  });

  it('routes explicit null plannedDate schedule body as unschedule', async () => {
    const service = buildService();

    const response = await request(service, '/api/tasks/1/schedule', {body: {plannedDate: null, allDay: true}});

    expect(response.status).toBe(200);
    expect(service.updateSchedule).toHaveBeenCalledWith({
      taskId: 1,
      userId: 1,
      plannedDate: undefined,
      plannedEndDate: undefined,
      startAt: undefined,
      endAt: undefined,
      allDay: true,
    });
  });

  it('rejects invalid single-task ids before schedule updates', async () => {
    const service = buildService();

    const response = await request(service, '/api/tasks/1abc/schedule', {body: {
      plannedDate: null,
      allDay: true,
    }});

    expect(response.status).toBe(400);
    expect(service.updateSchedule).not.toHaveBeenCalled();
  });

  it('routes task details updates', async () => {
    const service = buildService();

    const response = await request(service, '/api/tasks/1/details', {body: {
      title: ' 写方案 ',
      categoryId: 2,
      priority: 'P1',
      tagIds: [3],
    }});

    expect(response.status).toBe(200);
    expect(service.updateDetails).toHaveBeenCalledWith({
      taskId: 1,
      userId: 1,
      title: '写方案',
      categoryId: 2,
      priority: 'P1',
      tagIds: [3],
    });
  });

  it('routes priority and tag query filters', async () => {
    const service = buildService({list: vi.fn(() => [])});

    const response = await request(service, '/api/tasks?priority=P1&tagIds=1,2', {method: 'GET'});

    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith({
      userId: 1,
      priority: 'P1',
      tagIds: [1, 2],
    });
  });

  it('routes none priority query filter', async () => {
    const service = buildService({list: vi.fn(() => [])});

    const response = await request(service, '/api/tasks?priority=none', {method: 'GET'});

    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith({
      userId: 1,
      priority: 'none',
      tagIds: undefined,
    });
  });

  it('rejects invalid category query filters', async () => {
    const service = buildService({list: vi.fn(() => [])});

    const response = await request(service, '/api/tasks?categoryId=1abc', {method: 'GET'});

    expect(response.status).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('rejects repeated tagIds query filters', async () => {
    const service = buildService({list: vi.fn(() => [])});

    const response = await request(service, '/api/tasks?tagIds=1&tagIds=2', {method: 'GET'});

    expect(response.status).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });
});

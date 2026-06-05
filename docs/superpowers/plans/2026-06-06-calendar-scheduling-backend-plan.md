# Calendar Scheduling Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend scheduling foundation for calendar views: task schedule fields, date-range queries, schedule update API, and focus-session range API.

**Architecture:** Keep task scheduling inside the existing `tasks` domain. Extend repository contracts, JSON storage, SQLite storage, schemas, services, and HTTP routes without creating a separate calendar event model. Preserve existing `plannedDate` behavior so current Today, Tasks, Focus, Reports flows keep working.

**Tech Stack:** TypeScript, Express, Vitest, better-sqlite3, JSON file storage.

---

## File Structure

- Modify: `shared/domain/entities.ts` - add task schedule fields.
- Create: `shared/lib/schedule.ts` - shared schedule normalization and date-range helpers.
- Create: `shared/lib/schedule.test.ts` - helper tests.
- Modify: `server/modules/tasks/repository.ts` - extend task filters and add `updateSchedule`.
- Modify: `server/modules/tasks/schemas.ts` - parse schedule body and date-range query.
- Modify: `server/modules/tasks/schemas.test.ts` - schema coverage.
- Modify: `server/modules/tasks/service.ts` - validate and update schedules.
- Modify: `server/modules/tasks/tasks.service.test.ts` - service behavior coverage.
- Modify: `server/modules/tasks/routes.ts` - add schedule route and range query.
- Modify: `server/storage/json/repositories/taskJsonRepository.ts` - schedule fields and range filtering.
- Modify: `server/storage/json/repositories/taskJsonRepository.test.ts` - JSON behavior coverage.
- Modify: `server/storage/sqlite/migrations.ts` - add migration version 3.
- Modify: `server/storage/sqlite/repositories/rowMappers.ts` - map schedule columns.
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.ts` - schedule create/query/update.
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.test.ts` - SQLite behavior coverage.
- Modify: `scripts/importJsonToSqlite.ts` - map schedule fields during import.
- Modify: `scripts/importJsonToSqlite.test.ts` - import coverage.
- Modify: `server/modules/focus/schemas.ts` - parse date range query.
- Modify: `server/modules/focus/service.ts` - expose range query.
- Modify: `server/modules/focus/routes.ts` - route range query.
- Modify: `src/modules/focus/api/focusApi.ts` - support `dateFrom/dateTo`.
- Modify: `server/modules/focus/focus.service.test.ts` - range service coverage.

---

### Task 1: Shared Schedule Model

**Files:**
- Modify: `shared/domain/entities.ts`
- Create: `shared/lib/schedule.ts`
- Create: `shared/lib/schedule.test.ts`

- [ ] **Step 1: Write failing helper tests**

Add tests:

```ts
import {describe, expect, it} from 'vitest';

import type {Task} from '../domain/entities';
import {
  getTaskScheduleKind,
  taskIntersectsDateRange,
  toCanonicalTaskSchedule,
} from './schedule';

const baseTask: Task = {
  id: 1,
  userId: 1,
  categoryId: 1,
  title: 'Write plan',
  plannedDate: '2026-06-06',
  allDay: true,
  status: 'TODO',
  createdAt: '2026-06-06T00:00:00.000Z',
  updatedAt: '2026-06-06T00:00:00.000Z',
};

describe('schedule helpers', () => {
  it('normalizes legacy tasks as all-day date tasks', () => {
    expect(toCanonicalTaskSchedule({...baseTask, allDay: undefined as unknown as boolean})).toMatchObject({
      plannedDate: '2026-06-06',
      allDay: true,
      plannedEndDate: undefined,
      startAt: undefined,
      endAt: undefined,
    });
  });

  it('classifies timed tasks', () => {
    expect(getTaskScheduleKind({
      ...baseTask,
      allDay: false,
      startAt: '2026-06-06T09:00:00.000',
      endAt: '2026-06-06T10:00:00.000',
    })).toBe('timed');
  });

  it('detects cross-day all-day tasks intersecting a range', () => {
    expect(taskIntersectsDateRange({
      ...baseTask,
      plannedDate: '2026-06-05',
      plannedEndDate: '2026-06-07',
    }, '2026-06-06', '2026-06-06')).toBe(true);
  });
});
```

- [ ] **Step 2: Run helper tests and verify RED**

Run: `npm test shared/lib/schedule.test.ts`

Expected: FAIL because `shared/lib/schedule.ts` does not exist.

- [ ] **Step 3: Implement shared schedule helpers**

Add fields to `Task`:

```ts
plannedEndDate?: string;
startAt?: string;
endAt?: string;
allDay: boolean;
```

Create `shared/lib/schedule.ts`:

```ts
import type {Task} from '../domain/entities';

export type TaskScheduleKind = 'date' | 'cross-day' | 'timed';

export function toCanonicalTaskSchedule(task: Task): Task {
  return {
    ...task,
    allDay: task.allDay ?? true,
    plannedEndDate: task.plannedEndDate || undefined,
    startAt: task.startAt || undefined,
    endAt: task.endAt || undefined,
  };
}

export function getTaskScheduleKind(task: Task): TaskScheduleKind {
  const canonical = toCanonicalTaskSchedule(task);
  if (!canonical.allDay && canonical.startAt && canonical.endAt) return 'timed';
  if (canonical.plannedEndDate && canonical.plannedEndDate !== canonical.plannedDate) return 'cross-day';
  return 'date';
}

export function taskIntersectsDateRange(task: Task, dateFrom: string, dateTo: string): boolean {
  const canonical = toCanonicalTaskSchedule(task);
  const startDate = canonical.startAt ? canonical.startAt.slice(0, 10) : canonical.plannedDate;
  const endDate = canonical.endAt
    ? canonical.endAt.slice(0, 10)
    : canonical.plannedEndDate ?? canonical.plannedDate;
  return startDate <= dateTo && endDate >= dateFrom;
}
```

- [ ] **Step 4: Run helper tests and verify GREEN**

Run: `npm test shared/lib/schedule.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/domain/entities.ts shared/lib/schedule.ts shared/lib/schedule.test.ts
git commit -m "feat: add task schedule helpers"
```

---

### Task 2: Task Schema and Service Scheduling Rules

**Files:**
- Modify: `server/modules/tasks/repository.ts`
- Modify: `server/modules/tasks/schemas.ts`
- Modify: `server/modules/tasks/schemas.test.ts`
- Modify: `server/modules/tasks/service.ts`
- Modify: `server/modules/tasks/tasks.service.test.ts`

- [ ] **Step 1: Write failing schema and service tests**

Add cases:

```ts
expect(parseTaskQuery({dateFrom: '2026-06-01', dateTo: '2026-06-07'})).toMatchObject({
  dateFrom: '2026-06-01',
  dateTo: '2026-06-07',
});

expect(() => parseTaskScheduleBody({
  plannedDate: '2026-06-07',
  plannedEndDate: '2026-06-06',
  allDay: true,
})).toThrow('plannedEndDate must be after plannedDate');
```

Add service case:

```ts
expect(() => service.updateSchedule({
  taskId: 1,
  userId: 1,
  plannedDate: '2026-06-06',
  startAt: '2026-06-06T10:00:00.000',
  endAt: '2026-06-06T09:00:00.000',
  allDay: false,
})).toThrow('endAt must be after startAt');
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test server/modules/tasks/schemas.test.ts server/modules/tasks/tasks.service.test.ts`

Expected: FAIL because schedule parser and service method do not exist.

- [ ] **Step 3: Implement contracts, parser, and service method**

Add repository contracts:

```ts
export interface UpdateTaskScheduleInput {
  taskId: number;
  userId: number;
  plannedDate: string;
  plannedEndDate?: string;
  startAt?: string;
  endAt?: string;
  allDay: boolean;
}

export interface TaskRepository {
  listByFilters(filters: TaskFilters): Task[];
  getById(taskId: number, userId: number): Task | undefined;
  create(input: CreateTaskInput): Task;
  updateStatus(taskId: number, userId: number, status: TaskStatus): Task | undefined;
  updateSchedule(input: UpdateTaskScheduleInput): Task | undefined;
  remove(taskId: number, userId: number): boolean;
}
```

Add service validation:

```ts
if (input.plannedEndDate && input.plannedEndDate < input.plannedDate) {
  throw new AppError(400, 'plannedEndDate must be after plannedDate');
}
if (!input.allDay && (!input.startAt || !input.endAt)) {
  throw new AppError(400, 'Timed task requires startAt and endAt');
}
if (input.startAt && input.endAt && input.endAt <= input.startAt) {
  throw new AppError(400, 'endAt must be after startAt');
}
if (!input.allDay && input.startAt?.slice(0, 10) !== input.endAt?.slice(0, 10)) {
  throw new AppError(400, 'Cross-day timed tasks are not supported yet');
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test server/modules/tasks/schemas.test.ts server/modules/tasks/tasks.service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/modules/tasks/repository.ts server/modules/tasks/schemas.ts server/modules/tasks/schemas.test.ts server/modules/tasks/service.ts server/modules/tasks/tasks.service.test.ts
git commit -m "feat: validate task schedules"
```

---

### Task 3: JSON Storage Scheduling Support

**Files:**
- Modify: `server/storage/json/repositories/taskJsonRepository.ts`
- Modify: `server/storage/json/repositories/taskJsonRepository.test.ts`

- [ ] **Step 1: Write failing JSON repository tests**

Add tests:

```ts
expect(repository.listByFilters({
  userId: 1,
  dateFrom: '2026-06-06',
  dateTo: '2026-06-06',
}).map((task) => task.title)).toContain('Cross day task');

const updated = repository.updateSchedule({
  taskId: 1,
  userId: 1,
  plannedDate: '2026-06-06',
  startAt: '2026-06-06T09:00:00.000',
  endAt: '2026-06-06T10:00:00.000',
  allDay: false,
});
expect(updated).toMatchObject({allDay: false, startAt: '2026-06-06T09:00:00.000'});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test server/storage/json/repositories/taskJsonRepository.test.ts`

Expected: FAIL because range filtering and schedule update are absent.

- [ ] **Step 3: Implement JSON filtering and updates**

Use shared helper:

```ts
if (filters.dateFrom && filters.dateTo && !taskIntersectsDateRange(task, filters.dateFrom, filters.dateTo)) {
  return false;
}
```

Add update:

```ts
task.plannedDate = input.plannedDate;
task.plannedEndDate = input.allDay ? input.plannedEndDate : undefined;
task.startAt = input.allDay ? undefined : input.startAt;
task.endAt = input.allDay ? undefined : input.endAt;
task.allDay = input.allDay;
task.updatedAt = new Date().toISOString();
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test server/storage/json/repositories/taskJsonRepository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/storage/json/repositories/taskJsonRepository.ts server/storage/json/repositories/taskJsonRepository.test.ts
git commit -m "feat: persist schedules in json storage"
```

---

### Task 4: SQLite Scheduling Support

**Files:**
- Modify: `server/storage/sqlite/migrations.ts`
- Modify: `server/storage/sqlite/repositories/rowMappers.ts`
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.ts`
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.test.ts`
- Modify: `scripts/importJsonToSqlite.ts`
- Modify: `scripts/importJsonToSqlite.test.ts`

- [ ] **Step 1: Write failing SQLite tests**

Add tests for migration columns, range query, and schedule update:

```ts
const updated = repository.updateSchedule({
  taskId: task.id,
  userId: 1,
  plannedDate: '2026-06-06',
  plannedEndDate: undefined,
  startAt: '2026-06-06T09:00:00.000',
  endAt: '2026-06-06T10:00:00.000',
  allDay: false,
});
expect(updated).toMatchObject({allDay: false, startAt: '2026-06-06T09:00:00.000'});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test server/storage/sqlite/repositories/taskSqliteRepository.test.ts scripts/importJsonToSqlite.test.ts`

Expected: FAIL because SQLite columns and mappings are missing.

- [ ] **Step 3: Implement migration and repository mapping**

Add migration version 3:

```ts
{
  version: 3,
  name: 'task_schedule_fields',
  sql: `
    alter table tasks add column planned_end_date text;
    alter table tasks add column start_at text;
    alter table tasks add column end_at text;
    alter table tasks add column all_day integer not null default 1;
    create index if not exists idx_tasks_user_start_at on tasks(user_id, start_at);
  `,
}
```

Map row fields:

```ts
plannedEndDate: row.planned_end_date ?? undefined,
startAt: row.start_at ?? undefined,
endAt: row.end_at ?? undefined,
allDay: row.all_day === 1,
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test server/storage/sqlite/repositories/taskSqliteRepository.test.ts scripts/importJsonToSqlite.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/storage/sqlite/migrations.ts server/storage/sqlite/repositories/rowMappers.ts server/storage/sqlite/repositories/taskSqliteRepository.ts server/storage/sqlite/repositories/taskSqliteRepository.test.ts scripts/importJsonToSqlite.ts scripts/importJsonToSqlite.test.ts
git commit -m "feat: persist schedules in sqlite storage"
```

---

### Task 5: Task and Focus HTTP APIs

**Files:**
- Modify: `server/modules/tasks/routes.ts`
- Modify: `src/modules/tasks/api/tasksApi.ts`
- Modify: `server/modules/focus/schemas.ts`
- Modify: `server/modules/focus/service.ts`
- Modify: `server/modules/focus/routes.ts`
- Modify: `src/modules/focus/api/focusApi.ts`
- Modify: `server/modules/focus/focus.service.test.ts`
- Modify: `src/modules/focus/api/focusApi.test.ts`
- Modify: `src/modules/tasks/api/tasksApi.test.ts`

- [ ] **Step 1: Write failing API tests**

Add expectations:

```ts
expect(tasksApi.getTasks({dateFrom: '2026-06-01', dateTo: '2026-06-07'})).resolves.toEqual(expect.any(Array));
expect(focusApi.getSessions({dateFrom: '2026-06-01', dateTo: '2026-06-07'})).resolves.toEqual(expect.any(Array));
```

Add route/service case for conflicting date query:

```ts
expect(() => parseSessionDateRangeQuery({date: '2026-06-06', dateFrom: '2026-06-01'}))
  .toThrow('Use either date or dateFrom/dateTo');
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test src/modules/tasks/api/tasksApi.test.ts src/modules/focus/api/focusApi.test.ts server/modules/focus/focus.service.test.ts`

Expected: FAIL because APIs do not accept range filters.

- [ ] **Step 3: Implement route and frontend API support**

Add task route:

```ts
router.patch('/tasks/:id/schedule', (req, res) => {
  try {
    const {userId} = getUserContext();
    const id = parseTaskId(req.params.id);
    const body = parseTaskScheduleBody(req.body);
    res.json(service.updateSchedule({taskId: id, userId, ...body}));
  } catch (error) {
    handleHttpError(res, error);
  }
});
```

Extend `focusApi.getSessions` filters:

```ts
getSessions(filters?: {date?: string; dateFrom?: string; dateTo?: string}): Promise<TaskExecutionSession[]> {
  const params = new URLSearchParams();
  if (filters?.date) params.append('date', filters.date);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  return requestJson<TaskExecutionSession[]>(`/api/task-sessions${params.toString() ? `?${params}` : ''}`);
}
```

- [ ] **Step 4: Run backend and API tests**

Run: `npm test server/modules/tasks/tasks.service.test.ts server/modules/focus/focus.service.test.ts src/modules/tasks/api/tasksApi.test.ts src/modules/focus/api/focusApi.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/modules/tasks/routes.ts src/modules/tasks/api/tasksApi.ts server/modules/focus/schemas.ts server/modules/focus/service.ts server/modules/focus/routes.ts src/modules/focus/api/focusApi.ts server/modules/focus/focus.service.test.ts src/modules/focus/api/focusApi.test.ts src/modules/tasks/api/tasksApi.test.ts
git commit -m "feat: expose schedule and focus range APIs"
```

---

### Backend Final Verification

- [ ] Run: `npm test server/modules/tasks server/storage/json server/storage/sqlite server/modules/focus scripts/importJsonToSqlite.test.ts`
- [ ] Run: `npm run lint`
- [ ] Expected: both commands exit 0.

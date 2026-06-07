# Task Tags Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved task tags and priority model end to end: real user-scoped tags, fixed task priority, basic task details editing, task-library filtering, organization management, and scheduling-sidebar filtering/grouping.

**Architecture:** Add tags as a real backend module and keep task details separate from status and schedule mutations. Keep `priority` and `tagIds` in the shared `Task` contract so every task consumer receives stable metadata. On the frontend, route task-library behavior through controller objects instead of expanding `AppShell` prop drilling, and keep today/calendar quick-create paths lightweight with explicit empty metadata.

**Tech Stack:** TypeScript, React 19, Express, better-sqlite3, JSON file storage, Vitest, Testing Library, Vite, Tailwind CSS.

**Execution Discipline:** Execute tasks sequentially. Use TDD inside each task. Commit after each task. Do not stage the existing unrelated `README.md` change. Do not start implementation until this plan revision is committed and an isolated worktree is created from that commit.

---

## File Structure

- Modify: `shared/domain/status.ts` - add `TASK_PRIORITIES` and `TaskPriority`.
- Modify: `shared/domain/entities.ts` - add `Tag`, `TaskTag`, then add `Task.priority` and `Task.tagIds` in the same task that updates all task repositories.
- Modify: `shared/lib/schedule.ts` - keep legacy/canonical task conversion stable for missing `priority` and `tagIds`.
- Modify: `shared/lib/schedule.test.ts` - canonical legacy task metadata tests.
- Create: `server/modules/tags/repository.ts` - tag repository interface and inputs.
- Create: `server/modules/tags/schemas.ts` - tag id/body parsing and name normalization.
- Create: `server/modules/tags/service.ts` - tag create/reuse, rename, delete business rules.
- Create: `server/modules/tags/routes.ts` - `/api/tags` HTTP routes.
- Create: `server/modules/tags/schemas.test.ts` - tag schema and normalization tests.
- Create: `server/modules/tags/tags.service.test.ts` - tag service behavior tests.
- Create: `server/modules/tags/routes.test.ts` - tag route tests.
- Modify: `server/modules/tasks/repository.ts` - add details, tagIds, priority and filters.
- Modify: `server/modules/tasks/schemas.ts` - parse priority, tagIds, details body and strict query filters.
- Modify: `server/modules/tasks/service.ts` - validate tags and update details.
- Modify: `server/modules/tasks/routes.ts` - add `PATCH /tasks/:id/details`.
- Modify: `server/modules/tasks/schemas.test.ts` - task parsing tests.
- Modify: `server/modules/tasks/tasks.service.test.ts` - task details and tag validation tests.
- Modify: `server/modules/tasks/routes.test.ts` - details route and query tests.
- Modify: `server/storage/databaseSchema.ts` - JSON schema tags, taskTags, tag sequence, priority null default.
- Modify: `server/storage/json/fileStore.ts` - normalize missing tags/taskTags/priority.
- Modify: `server/storage/json/repositories/taskJsonRepository.ts` - task details, tag associations, priority/tagIds filtering.
- Create: `server/storage/json/repositories/tagJsonRepository.ts` - JSON tag persistence.
- Modify: `server/storage/json/repositories/taskJsonRepository.test.ts` - JSON task metadata tests.
- Create: `server/storage/json/repositories/tagJsonRepository.test.ts` - JSON tag repository tests.
- Modify: `server/storage/sqlite/migrations.ts` - v5 priority/tags/task_tags migration.
- Modify: `server/storage/sqlite/repositories/rowMappers.ts` - map priority and tagIds.
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.ts` - task metadata persistence and batch tagIds assembly.
- Create: `server/storage/sqlite/repositories/tagSqliteRepository.ts` - SQLite tag persistence.
- Modify: `server/storage/sqlite/repositories/rowMappers.test.ts` - mapper tests.
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.test.ts` - SQLite task metadata tests.
- Create: `server/storage/sqlite/repositories/tagSqliteRepository.test.ts` - SQLite tag repository tests.
- Modify: `server/storage/sqlite/sqliteClient.test.ts` - schema table/index expectations.
- Modify: `server/storage/createRepositories.ts` - register tag repositories.
- Modify: `server/storage/createRepositories.test.ts` - repository wiring tests.
- Modify: `server/app/registerRoutes.ts` - register tag routes and inject tags into tasks service.
- Modify: `scripts/importJsonToSqlite.ts` - import tags/taskTags and validate associations.
- Modify: `scripts/importJsonToSqlite.test.ts` - import count, force order, orphan and cross-user tests.
- Create: `src/modules/tags/api/tagsApi.ts` - frontend tags HTTP client.
- Create: `src/modules/tags/api/tagsApi.test.ts` - tags API tests.
- Create: `src/modules/tags/controllers/tagName.ts` - frontend mirror of tag name normalization.
- Create: `src/modules/tags/controllers/tagName.test.ts` - tag name normalization tests.
- Create: `src/modules/tags/controllers/useTagActions.ts` - tag CRUD controller.
- Create: `src/modules/tags/controllers/useTagActions.test.ts` - tag action tests.
- Create: `src/modules/tags/components/TagCombobox.tsx` - shared tag selector/inline-create component.
- Create: `src/modules/tags/components/TagCombobox.test.tsx` - combobox behavior tests.
- Modify: `src/modules/tasks/api/tasksApi.ts` - add priority/tagIds/details/query payloads.
- Modify: `src/modules/tasks/api/tasksApi.test.ts` - task API metadata tests.
- Modify: `src/app/hooks/useAppData.ts` - load tags as metadata.
- Modify: `src/app/hooks/useAppData.test.ts` - metadata loading tests.
- Create: `src/modules/tasks/controllers/useTaskDraftController.ts` - task-library create/details draft state.
- Create: `src/modules/tasks/controllers/useTaskDraftController.test.ts` - draft isolation tests.
- Create: `src/modules/tasks/controllers/useTaskFilterController.ts` - task-library filters.
- Create: `src/modules/tasks/controllers/useTaskFilterController.test.ts` - all-of tag and priority filtering tests.
- Create: `src/modules/tasks/controllers/useTaskMutations.ts` - create/updateDetails/delete mutations.
- Create: `src/modules/tasks/controllers/useTaskMutations.test.ts` - mutation refresh tests.
- Create: `src/modules/tasks/controllers/useTasksPanelController.ts` - compose tasks page controller.
- Create: `src/modules/tasks/components/TaskBasicInfoModal.tsx` - task details editor.
- Create: `src/modules/tasks/components/TaskBasicInfoModal.test.tsx` - editor tests.
- Modify: `src/modules/tasks/components/TaskCreateForm.tsx` - add tag combobox and priority selector.
- Modify: `src/modules/tasks/components/TaskFilterBar.tsx` - add tag, priority and search filters.
- Modify: `src/modules/tasks/components/TaskListItem.tsx` - add edit icon button and metadata-safe task shape.
- Modify: `src/modules/tasks/components/TaskList.tsx` - pass edit action.
- Modify: `src/modules/tasks/components/TasksPanel.tsx` - accept controller object.
- Modify: `src/modules/tasks/components/TasksPanel.test.tsx` - controller prop tests.
- Create: `src/modules/dashboard/controllers/useTodayQuickCreateController.ts` - isolated today quick-create state.
- Create: `src/modules/dashboard/controllers/useTodayQuickCreateController.test.ts` - empty metadata tests.
- Modify: `src/modules/dashboard/components/DashboardPanel.tsx` - use isolated quick create props.
- Modify: `src/app/AppShell.tsx` - wire tags and controller objects only.
- Modify: `src/app/navigation.ts` - keep key `categories`, label as organization.
- Create: `src/modules/categories/components/OrganizationPanel.tsx` - category and tag sections.
- Create: `src/modules/categories/components/OrganizationPanel.test.tsx` - organization page tests.
- Modify: `src/modules/categories/components/CategoryPanel.tsx` - export the existing category-only UI as `CategorySection` for `OrganizationPanel`.
- Modify: `src/modules/categories/controllers/useCategoryActions.ts` - preserve category behavior under organization page.
- Modify: `src/modules/calendar/api/calendarApi.ts` - pass empty metadata in calendar create payloads.
- Create: `src/modules/calendar/api/calendarApi.test.ts` - calendar query serialization metadata tests.
- Modify: `src/modules/calendar/controllers/useCalendarController.ts` - calendar quick-create sends `tagIds: []`, `priority: null`.
- Modify: `src/modules/calendar/controllers/useCalendarController.test.ts` - calendar empty metadata test.
- Modify: `src/modules/calendar/controllers/useSchedulingSidebarController.ts` - filters and group mode.
- Create: `src/modules/calendar/controllers/schedulingSidebarGrouping.ts` - pure grouping helpers.
- Create: `src/modules/calendar/controllers/schedulingSidebarGrouping.test.ts` - grouping and duplicate-selection tests.
- Modify: `src/modules/calendar/components/SchedulingSidebar.tsx` - collapsible filters and grouped list.
- Modify: `src/modules/calendar/components/SchedulingSidebar.test.tsx` - sidebar filtering/grouping tests.

---

### Task 0: Execution Guardrails

**Files:**
- Inspect only.

- [ ] **Step 1: Create isolated worktree before implementation**

Run:

```bash
git status --short
git log -1 --oneline
git worktree add .worktrees/task-tags-priority-dev -b task-tags-priority-dev
cd .worktrees/task-tags-priority-dev
```

Expected:

```txt
Preparing worktree
HEAD is now at
```

Expected `git status --short` before creating the worktree: no modified plan file. If the main worktree still has `README.md` modified, leave it in the main worktree and do not copy or stage it. If `.worktrees/task-tags-priority-dev` or branch `task-tags-priority-dev` already exists, stop and ask the maintainer to remove or rename it; do not reuse a stale worktree.

- [ ] **Step 2: Record execution base**

Run:

```bash
git rev-parse HEAD > .task-tags-priority-base
cat .task-tags-priority-base
```

Expected: one commit SHA.

- [ ] **Step 3: Run baseline checks**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all pass before editing. If a command fails, stop and diagnose before starting Task 1.

---

### Task 1: Shared Types And Parsing Contracts

**Files:**
- Modify: `shared/domain/status.ts`
- Modify: `shared/domain/entities.ts`
- Modify: `server/modules/tasks/schemas.ts`
- Modify: `server/modules/tasks/schemas.test.ts`
- Create: `server/modules/tags/schemas.ts`
- Create: `server/modules/tags/schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

Append focused tests to `server/modules/tasks/schemas.test.ts`:

```ts
import {parseTaskDetailsBody} from './schemas';

it('parses priority and tagIds on task creation', () => {
  expect(parseTaskBody({
    title: '写方案',
    categoryId: 1,
    priority: 'P1',
    tagIds: [2, '3'],
  })).toMatchObject({
    title: '写方案',
    categoryId: 1,
    priority: 'P1',
    tagIds: [2, 3],
  });
});

it('parses full task details replacement', () => {
  expect(parseTaskDetailsBody({
    title: '  写方案  ',
    categoryId: 1,
    tagIds: [],
    priority: null,
  })).toEqual({
    title: '写方案',
    categoryId: 1,
    tagIds: [],
    priority: null,
  });
});

it('rejects duplicate tagIds in task details', () => {
  expect(() => parseTaskDetailsBody({
    title: '写方案',
    categoryId: 1,
    tagIds: [2, 2],
    priority: 'P2',
  })).toThrow('tagIds must be unique');
});

it('strictly rejects invalid task query filters', () => {
  expect(parseTaskQuery({priority: 'none'})).toMatchObject({priority: 'none'});
  expect(parseTaskQuery({tagIds: '1,2'})).toMatchObject({tagIds: [1, 2]});
  expect(() => parseTaskQuery({priority: 'P5'})).toThrow('priority must be one of');
  expect(() => parseTaskQuery({tagIds: '1, 2'})).toThrow('tagIds must be a comma-separated list');
  expect(() => parseTaskQuery({tagIds: ['1', '2']})).toThrow('tagIds must be provided once');
  expect(() => parseTaskQuery({tagIds: '1,1'})).toThrow('tagIds must be unique');
  expect(() => parseTaskQuery({priority: ['P1', 'P2']})).toThrow('priority must be provided once');
  expect(() => parseTaskQuery({categoryId: '1abc'})).toThrow('Invalid categoryId');
  expect(() => parseTaskQuery({status: 'BROKEN'})).toThrow('Status must be one of');
});
```

Create `server/modules/tags/schemas.test.ts`:

```ts
import {describe, expect, it} from 'vitest';

import {normalizeTagName, parseTagBody, parseTagId} from './schemas';

describe('tag schemas', () => {
  it('normalizes tag names consistently', () => {
    expect(normalizeTagName('  Foo   Bar  ')).toEqual({
      name: 'Foo Bar',
      normalizedName: 'foo bar',
    });
  });

  it('rejects empty and too-long tag names', () => {
    expect(() => parseTagBody({name: '   '})).toThrow('Tag name is required');
    expect(() => parseTagBody({name: 'a'.repeat(33)})).toThrow('Tag name must be at most 32 characters');
  });

  it('parses tag ids as positive integers', () => {
    expect(parseTagId('12')).toBe(12);
    expect(() => parseTagId('0')).toThrow('Invalid tag ID');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- server/modules/tasks/schemas.test.ts server/modules/tags/schemas.test.ts
```

Expected: FAIL because `TaskPriority`, `parseTaskDetailsBody`, creation metadata parsing, strict query parsing, and tag schemas do not exist yet.

- [ ] **Step 3: Implement shared types and parsers**

Update `shared/domain/status.ts`:

```ts
export const TASK_PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
```

Update `shared/domain/entities.ts` with `Tag` and `TaskTag` only in this task:

```ts
export interface Tag {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTag {
  taskId: number;
  tagId: number;
  userId: number;
  createdAt: string;
}
```

Do not add `Task.priority` or `Task.tagIds` in Task 1. Those fields become required in Task 4, in the same commit that updates every repository return path and legacy canonical conversion. This keeps Task 1 typecheckable.

Create `server/modules/tags/schemas.ts` with:

```ts
import {AppError} from '../../shared/errors/appError';

export interface NormalizedTagName {
  name: string;
  normalizedName: string;
}

export function normalizeTagName(value: string): NormalizedTagName {
  const name = value.trim().replace(/\s+/gu, ' ');
  if (!name) throw new AppError(400, 'Tag name is required');
  if (name.length > 32) throw new AppError(400, 'Tag name must be at most 32 characters');
  return {name, normalizedName: name.toLocaleLowerCase()};
}

export function parseTagId(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new AppError(400, 'Invalid tag ID');
  const id = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(id)) throw new AppError(400, 'Invalid tag ID');
  return id;
}

export function parseTagBody(body: unknown): NormalizedTagName {
  const payload = (body ?? {}) as Record<string, unknown>;
  if (typeof payload.name !== 'string') throw new AppError(400, 'Tag name is required');
  return normalizeTagName(payload.name);
}
```

Update `server/modules/tasks/schemas.ts` with helper behavior:

```ts
function parsePriority(value: unknown): TaskPriority | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || !TASK_PRIORITIES.includes(value as TaskPriority)) {
    throw new AppError(400, `priority must be one of: ${TASK_PRIORITIES.join(', ')}, null`);
  }
  return value as TaskPriority;
}

function parseQueryPriority(value: unknown): TaskPriority | 'none' | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) throw new AppError(400, 'priority must be provided once');
  if (value === 'none') return 'none';
  if (typeof value !== 'string' || !TASK_PRIORITIES.includes(value as TaskPriority)) {
    throw new AppError(400, `priority must be one of: ${TASK_PRIORITIES.join(', ')}, none`);
  }
  return value as TaskPriority;
}

function parseTagIds(value: unknown, field = 'tagIds'): number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new AppError(400, `${field} must be an array`);
  const ids = value.map((item) => {
    const id = typeof item === 'number' ? item : typeof item === 'string' && /^[1-9]\d*$/.test(item) ? Number.parseInt(item, 10) : Number.NaN;
    if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, `${field} must contain positive integers`);
    return id;
  });
  if (new Set(ids).size !== ids.length) throw new AppError(400, `${field} must be unique`);
  return ids;
}

function parseQueryTagIds(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) throw new AppError(400, 'tagIds must be provided once');
  if (typeof value !== 'string' || !/^[1-9]\d*(,[1-9]\d*)*$/.test(value)) {
    throw new AppError(400, 'tagIds must be a comma-separated list');
  }
  const ids = value.split(',').map((item) => Number.parseInt(item, 10));
  if (new Set(ids).size !== ids.length) throw new AppError(400, 'tagIds must be unique');
  return ids;
}

function parseQueryCategoryId(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) throw new AppError(400, 'categoryId must be provided once');
  return parseCategoryIdValue(value);
}

function parseQueryStatus(value: unknown): TaskStatus | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) throw new AppError(400, 'status must be provided once');
  if (typeof value !== 'string' || !TASK_STATUSES.includes(value as TaskStatus)) {
    throw new AppError(400, `Status must be one of: ${TASK_STATUSES.join(', ')}`);
  }
  return value as TaskStatus;
}
```

Expose `parseTaskDetailsBody` as full replacement:

```ts
export interface TaskDetailsBody {
  title: string;
  categoryId: number;
  tagIds: number[];
  priority: TaskPriority | null;
}

function parseTaskTitle(value: unknown): string {
  if (typeof value !== 'string') throw new AppError(400, 'title is required');
  const title = value.trim();
  if (!title) throw new AppError(400, 'Task title is required');
  return title;
}

function parseCategoryIdValue(value: unknown): number {
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
  if (!/^[1-9]\d*$/.test(raw)) throw new AppError(400, 'Invalid categoryId');
  const categoryId = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(categoryId)) throw new AppError(400, 'Invalid categoryId');
  return categoryId;
}

export function parseTaskDetailsBody(body: unknown): TaskDetailsBody {
  const payload = (body ?? {}) as Record<string, unknown>;
  if (!Object.hasOwn(payload, 'title')) throw new AppError(400, 'title is required');
  if (!Object.hasOwn(payload, 'categoryId')) throw new AppError(400, 'categoryId is required');
  if (!Object.hasOwn(payload, 'tagIds')) throw new AppError(400, 'tagIds is required');
  if (!Object.hasOwn(payload, 'priority')) throw new AppError(400, 'priority is required');
  return {
    title: parseTaskTitle(payload.title),
    categoryId: parseCategoryIdValue(payload.categoryId),
    tagIds: parseTagIds(payload.tagIds),
    priority: parsePriority(payload.priority) ?? null,
  };
}
```

Update `TaskBody` and `parseTaskBody`:

```ts
export interface TaskBody {
  title: string;
  categoryId: number;
  plannedDate?: string;
  plannedEndDate?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  priority?: TaskPriority | null;
  tagIds: number[];
}

export function parseTaskBody(body: unknown): TaskBody {
  const payload = (body ?? {}) as Record<string, unknown>;
  const schedule = normalizeTaskSchedule(payload, {
    allowMissingPlannedDate: true,
    requireAllDay: false,
  });
  return {
    title: parseTaskTitle(payload.title),
    categoryId: parseCategoryIdValue(payload.categoryId),
    ...schedule,
    priority: parsePriority(payload.priority) ?? null,
    tagIds: parseTagIds(payload.tagIds),
  };
}
```

Extend `TaskQueryParams` with:

```ts
priority?: TaskPriority | 'none';
tagIds?: number[];
```

`parseTaskQuery` must reject repeated query params for `priority`, `tagIds`, `categoryId`, and `status`; must reject `tagIds` with whitespace; must parse only `tagIds=1,2` into `[1, 2]`; and must stop silently ignoring invalid `categoryId/status`.

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
npm test -- server/modules/tasks/schemas.test.ts server/modules/tags/schemas.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/domain/status.ts shared/domain/entities.ts server/modules/tasks/schemas.ts server/modules/tasks/schemas.test.ts server/modules/tags/schemas.ts server/modules/tags/schemas.test.ts
git commit -m "feat: define task priority and tag schemas"
```

---

### Task 2: Storage Schema And Repository Wiring

**Files:**
- Modify: `server/storage/databaseSchema.ts`
- Modify: `server/storage/json/fileStore.ts`
- Modify: `server/storage/sqlite/migrations.ts`
- Modify: `server/storage/sqlite/repositories/rowMappers.ts`
- Modify: `server/storage/sqlite/repositories/rowMappers.test.ts`
- Modify: `server/storage/sqlite/sqliteClient.test.ts`
- Modify: `server/storage/createRepositories.ts`
- Modify: `server/storage/createRepositories.test.ts`
- Create: `server/modules/tags/repository.ts`
- Create: `server/storage/json/repositories/tagJsonRepository.ts`
- Create: `server/storage/json/repositories/tagJsonRepository.test.ts`
- Create: `server/storage/sqlite/repositories/tagSqliteRepository.ts`
- Create: `server/storage/sqlite/repositories/tagSqliteRepository.test.ts`

- [ ] **Step 1: Write failing storage tests**

Add migration expectations to `server/storage/sqlite/sqliteClient.test.ts`:

```ts
db.prepare(`insert into categories (id, user_id, name, color, sort_order, created_at, updated_at) values (1, 1, '默认', '#000', 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')`).run();
expect(tableNames).toEqual(expect.arrayContaining(['tags', 'task_tags']));
const taskColumns = db.prepare('pragma table_info(tasks)').all() as Array<{name: string; dflt_value: string | null}>;
expect(taskColumns.map((column) => column.name)).toContain('priority');
expect(() => db.prepare(`
  insert into tasks (id, user_id, category_id, title, priority, all_day, status, created_at, updated_at)
  values (100, 1, 1, 'bad priority', 'P5', 1, 'TODO', '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')
`).run()).toThrow();
expect(db.prepare(`
  insert into tasks (id, user_id, category_id, title, all_day, status, created_at, updated_at)
  values (101, 1, 1, 'legacy default', 1, 'TODO', '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')
`).run().changes).toBe(1);
expect((db.prepare('select priority from tasks where id = 101').get() as {priority: string | null}).priority).toBeNull();
```

Add same-user composite foreign key expectations to `server/storage/sqlite/sqliteClient.test.ts`:

```ts
db.prepare(`insert into users (id, username, display_name, created_at) values (2, 'u2', 'U2', '2026-06-07T00:00:00.000Z')`).run();
db.prepare(`insert into categories (id, user_id, name, color, sort_order, created_at, updated_at) values (1, 1, '默认', '#000', 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')`).run();
db.prepare(`insert into tasks (id, user_id, category_id, title, all_day, status, created_at, updated_at) values (1, 1, 1, '任务', 1, 'TODO', '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')`).run();
db.prepare(`insert into tags (id, user_id, name, normalized_name, created_at, updated_at) values (1, 2, '外部', '外部', '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z')`).run();
expect(() => db.prepare(`insert into task_tags (task_id, tag_id, user_id, created_at) values (1, 1, 1, '2026-06-07T00:00:00.000Z')`).run()).toThrow();
```

Create repository tests that verify normalized uniqueness, `getManyByIds`, and user scoping:

```ts
it('creates and reuses sqlite tags by normalized name', () => {
  const tags = new TagSqliteRepository(db);
  const first = tags.createOrReuse({userId: 1, name: 'Foo Bar', normalizedName: 'foo bar'});
  const second = tags.createOrReuse({userId: 1, name: 'foo   bar', normalizedName: 'foo bar'});
  expect(second.id).toBe(first.id);
  expect(tags.listByUser(1)).toHaveLength(1);
});

it('returns only tags owned by the requested user from getManyByIds', () => {
  db.prepare(`insert into users (id, username, display_name, created_at) values (2, 'u2', 'U2', '2026-06-07T00:00:00.000Z')`).run();
  const tags = new TagSqliteRepository(db);
  const own = tags.createOrReuse({userId: 1, name: 'Own', normalizedName: 'own'});
  const second = tags.createOrReuse({userId: 1, name: 'Second', normalizedName: 'second'});
  const other = tags.createOrReuse({userId: 2, name: 'Other', normalizedName: 'other'});
  expect(tags.getManyByIds(1, [second.id, other.id, own.id]).map((tag) => tag.id)).toEqual([second.id, own.id]);
});

it('removes tag associations when deleting a tag', () => {
  const tags = new TagSqliteRepository(db);
  const tag = tags.createOrReuse({userId: 1, name: '客户A', normalizedName: '客户a'});
  db.prepare(`insert into categories (id, user_id, name, color, sort_order, created_at, updated_at) values (1, 1, '默认', '#000', 1, '', '')`).run();
  db.prepare(`insert into tasks (id, user_id, category_id, title, all_day, status, created_at, updated_at) values (1, 1, 1, '任务', 1, 'TODO', '', '')`).run();
  db.prepare(`insert into task_tags (task_id, tag_id, user_id, created_at) values (1, ?, 1, '')`).run(tag.id);
  expect(tags.remove(tag.id, 1)).toBe(true);
  expect(db.prepare('select count(*) as count from task_tags where tag_id = ?').get(tag.id)).toEqual({count: 0});
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- server/storage/sqlite/sqliteClient.test.ts server/storage/sqlite/repositories/tagSqliteRepository.test.ts server/storage/json/repositories/tagJsonRepository.test.ts server/storage/sqlite/repositories/rowMappers.test.ts server/storage/createRepositories.test.ts
```

Expected: FAIL because tag storage does not exist.

- [ ] **Step 3: Implement storage schema**

Update `server/storage/databaseSchema.ts`:

```ts
export interface DatabaseSequences {
  categories: number;
  tags: number;
  tasks: number;
  taskExecutionSessions: number;
  dailyReports: number;
  weeklyReviews: number;
}

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  tags: Tag[];
  taskTags: TaskTag[];
  tasks: Task[];
  taskExecutionSessions: TaskExecutionSession[];
  dailyReports: DailyReport[];
  weeklyReviews: WeeklyReview[];
  sequences: DatabaseSequences;
}
```

Update `createEmptyDatabaseSchema` to return `tags: []`, `taskTags: []`, and `sequences.tags = 0`.

Update `server/storage/sqlite/migrations.ts` with version 5:

```ts
{
  version: 5,
  name: 'task_tags_priority',
  sql: `
    alter table tasks add column priority text check (priority in ('P1', 'P2', 'P3', 'P4') or priority is null);

    create table tags (
      id integer primary key,
      user_id integer not null,
      name text not null,
      normalized_name text not null,
      created_at text not null,
      updated_at text not null,
      foreign key (user_id) references users(id),
      unique(user_id, normalized_name)
    );

    create unique index if not exists idx_tasks_id_user on tasks(id, user_id);
    create unique index if not exists idx_tags_id_user on tags(id, user_id);

    create table task_tags (
      task_id integer not null,
      tag_id integer not null,
      user_id integer not null,
      created_at text not null,
      foreign key (task_id, user_id) references tasks(id, user_id),
      foreign key (tag_id, user_id) references tags(id, user_id),
      foreign key (user_id) references users(id),
      unique(user_id, task_id, tag_id)
    );

    create index if not exists idx_tasks_user_priority on tasks(user_id, priority);
    create index if not exists idx_tags_user_name on tags(user_id, name);
    create index if not exists idx_task_tags_user_tag on task_tags(user_id, tag_id);
    create index if not exists idx_task_tags_user_task on task_tags(user_id, task_id);
  `,
}
```

- [ ] **Step 4: Implement tag repository interfaces and storage classes**

Create `server/modules/tags/repository.ts`:

```ts
import type {Tag} from '../../../shared/domain/entities';

export interface TagNameInput {
  userId: number;
  name: string;
  normalizedName: string;
}

export interface TagRepository {
  listByUser(userId: number): Tag[];
  getById(tagId: number, userId: number): Tag | undefined;
  getManyByIds(userId: number, tagIds: number[]): Tag[];
  getByNormalizedName(userId: number, normalizedName: string): Tag | undefined;
  create(input: TagNameInput): Tag;
  createOrReuse(input: TagNameInput): Tag;
  update(input: {tagId: number; userId: number; name: string; normalizedName: string}): Tag | undefined;
  remove(tagId: number, userId: number): boolean;
}
```

Implement JSON and SQLite repositories with these exact behaviors:

```ts
createOrReuse(input) {
  return existingByNormalizedName ?? create(input);
}
```

`remove` must delete `taskTags` for that tag before removing the tag.

`getManyByIds(userId, tagIds)` must preserve the requested id order and must never return tags from another user. It returns `[]` for an empty input array.

Update `server/storage/sqlite/repositories/rowMappers.ts` now, not later:

```ts
export interface TaskRow {
  priority: string | null;
}

export function mapTaskRow(row: TaskRow, tagIds: number[] = []): Task {
  const metadata = {
    priority: row.priority as TaskPriority | null,
    tagIds,
  };

  if (!row.planned_date) {
    return {
      id: row.id,
      userId: row.user_id,
      categoryId: row.category_id,
      title: row.title,
      plannedDate: undefined,
      plannedEndDate: undefined,
      startAt: undefined,
      endAt: undefined,
      allDay: true,
      status: row.status as TaskStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...metadata,
    };
  }

  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    title: row.title,
    plannedDate: row.planned_date,
    plannedEndDate: row.all_day !== 0 ? row.planned_end_date ?? undefined : undefined,
    startAt: row.all_day !== 0 ? undefined : row.start_at ?? undefined,
    endAt: row.all_day !== 0 ? undefined : row.end_at ?? undefined,
    allDay: row.all_day !== 0,
    status: row.status as TaskStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...metadata,
  };
}
```

This is not a full replacement for `TaskRow`; add `priority` to the existing interface and keep all current row fields.

Add `rowMappers.test.ts` coverage that a row with `priority: null` maps to `priority: null` and `tagIds: []`.

- [ ] **Step 5: Wire repositories**

Update `server/storage/createRepositories.ts`:

```ts
export interface AppRepositories {
  categories: CategoryRepository;
  tags: TagRepository;
  tasks: TaskRepository;
  focusSessions: FocusSessionRepository;
  reports: ReportRepository;
}
```

Return `tags: new TagJsonRepository(store)` for JSON and `tags: new TagSqliteRepository(db)` for SQLite.

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
npm test -- server/storage/sqlite/sqliteClient.test.ts server/storage/sqlite/repositories/tagSqliteRepository.test.ts server/storage/json/repositories/tagJsonRepository.test.ts server/storage/sqlite/repositories/rowMappers.test.ts server/storage/createRepositories.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/storage/databaseSchema.ts server/storage/json/fileStore.ts server/storage/sqlite/migrations.ts server/storage/sqlite/sqliteClient.test.ts server/storage/sqlite/repositories/rowMappers.ts server/storage/sqlite/repositories/rowMappers.test.ts server/storage/createRepositories.ts server/storage/createRepositories.test.ts server/modules/tags/repository.ts server/storage/json/repositories/tagJsonRepository.ts server/storage/json/repositories/tagJsonRepository.test.ts server/storage/sqlite/repositories/tagSqliteRepository.ts server/storage/sqlite/repositories/tagSqliteRepository.test.ts
git commit -m "feat: add tag storage foundation"
```

---

### Task 3: Tags API

**Files:**
- Create: `server/modules/tags/service.ts`
- Create: `server/modules/tags/routes.ts`
- Create: `server/modules/tags/tags.service.test.ts`
- Create: `server/modules/tags/routes.test.ts`
- Modify: `server/app/registerRoutes.ts`

- [ ] **Step 1: Write failing service and route tests**

Create `server/modules/tags/tags.service.test.ts`:

```ts
import {describe, expect, it, vi} from 'vitest';
import {TagsService} from './service';

it('reuses existing tags by normalized name', () => {
  const existing = {id: 1, userId: 1, name: 'Foo Bar', createdAt: '', updatedAt: ''};
  const repo = {
    listByUser: vi.fn(() => [existing]),
    getById: vi.fn(),
    getManyByIds: vi.fn(),
    getByNormalizedName: vi.fn(() => existing),
    create: vi.fn(),
    createOrReuse: vi.fn(() => existing),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const service = new TagsService(repo);
  expect(service.create({userId: 1, name: 'foo   bar'})).toEqual(existing);
  expect(repo.createOrReuse).toHaveBeenCalledWith({userId: 1, name: 'foo bar', normalizedName: 'foo bar'});
});
```

Create `server/modules/tags/routes.test.ts` with these route tests:

```ts
import express from 'express';
import type {Server} from 'node:http';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {buildTagRoutes} from './routes';

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

function buildApp(service = {
  list: vi.fn(() => []),
  create: vi.fn((input) => ({id: 1, userId: input.userId, name: input.name, createdAt: '', updatedAt: ''})),
  update: vi.fn((input) => ({id: input.tagId, userId: input.userId, name: input.name, createdAt: '', updatedAt: ''})),
  delete: vi.fn(),
}) {
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
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- server/modules/tags/tags.service.test.ts server/modules/tags/routes.test.ts
```

Expected: FAIL because service and routes do not exist.

- [ ] **Step 3: Implement service and routes**

Create `TagsService` with:

```ts
export class TagsService {
  constructor(private readonly tags: TagRepository) {}

  list(userId: number) {
    return this.tags.listByUser(userId);
  }

  create(input: {userId: number; name: string}) {
    const normalized = normalizeTagName(input.name);
    return this.tags.createOrReuse({userId: input.userId, ...normalized});
  }

  update(input: {tagId: number; userId: number; name: string}) {
    const normalized = normalizeTagName(input.name);
    const existing = this.tags.getByNormalizedName(input.userId, normalized.normalizedName);
    if (existing && existing.id !== input.tagId) throw new AppError(409, 'Another tag with this name already exists.');
    const updated = this.tags.update({tagId: input.tagId, userId: input.userId, ...normalized});
    if (!updated) throw new AppError(404, 'Tag not found');
    return updated;
  }

  delete(tagId: number, userId: number) {
    if (!this.tags.remove(tagId, userId)) throw new AppError(404, 'Tag not found');
  }
}
```

Create routes:

```ts
router.get('/tags', (req, res) => {
  try {
    const {userId} = getUserContext();
    res.json(service.list(userId));
  } catch (error) {
    handleHttpError(res, error);
  }
});

router.post('/tags', (req, res) => {
  try {
    const {userId} = getUserContext();
    const body = parseTagBody(req.body);
    res.status(201).json(service.create({userId, name: body.name}));
  } catch (error) {
    handleHttpError(res, error);
  }
});

router.patch('/tags/:id', (req, res) => {
  try {
    const {userId} = getUserContext();
    const tagId = parseTagId(req.params.id);
    const body = parseTagBody(req.body);
    res.json(service.update({tagId, userId, name: body.name}));
  } catch (error) {
    handleHttpError(res, error);
  }
});

router.delete('/tags/:id', (req, res) => {
  try {
    const {userId} = getUserContext();
    const tagId = parseTagId(req.params.id);
    service.delete(tagId, userId);
    res.status(204).send();
  } catch (error) {
    handleHttpError(res, error);
  }
});
```

Use `getUserContext()` and `handleHttpError` like existing modules.

- [ ] **Step 4: Register routes**

Update `server/app/registerRoutes.ts`:

```ts
const tagsService = new TagsService(repositories.tags);
router.use(buildTagRoutes(tagsService));
```

The route registration order is fixed for the plan: categories, tags, tasks, focus, reports. This keeps metadata routes grouped before task operations.

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
npm test -- server/modules/tags/tags.service.test.ts server/modules/tags/routes.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/modules/tags/service.ts server/modules/tags/routes.ts server/modules/tags/tags.service.test.ts server/modules/tags/routes.test.ts server/app/registerRoutes.ts
git commit -m "feat: add tags api"
```

---

### Task 4: Task Metadata Persistence And API

**Files:**
- Modify: `shared/domain/entities.ts`
- Modify: `shared/lib/schedule.ts`
- Modify: `shared/lib/schedule.test.ts`
- Modify: `server/modules/tasks/repository.ts`
- Modify: `server/modules/tasks/service.ts`
- Modify: `server/modules/tasks/routes.ts`
- Modify: `server/modules/tasks/tasks.service.test.ts`
- Modify: `server/modules/tasks/routes.test.ts`
- Modify: `server/app/registerRoutes.ts`
- Modify: `server/storage/json/repositories/taskJsonRepository.ts`
- Modify: `server/storage/json/repositories/taskJsonRepository.test.ts`
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.ts`
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.test.ts`
- Modify: `server/storage/sqlite/repositories/rowMappers.ts`
- Modify: `server/storage/sqlite/repositories/rowMappers.test.ts`

- [ ] **Step 1: Write failing task repository tests**

Add canonical task tests to `shared/lib/schedule.test.ts`:

```ts
it('normalizes legacy tasks to null priority and empty tagIds', () => {
  expect(toCanonicalTask({
    id: 1,
    userId: 1,
    categoryId: 1,
    title: '旧任务',
    status: 'TODO',
    createdAt: '2026-06-07T00:00:00.000Z',
    updatedAt: '2026-06-07T00:00:00.000Z',
  })).toMatchObject({
    priority: null,
    tagIds: [],
  });
});
```

Add to SQLite and JSON task repository tests. In the SQLite test file, create `categories`, `tags`, and `tasks` from `CategorySqliteRepository`, `TagSqliteRepository`, and `TaskSqliteRepository` against the same test db. In the JSON test file, create the same variable names from `CategoryJsonRepository`, `TagJsonRepository`, and `TaskJsonRepository` against the same `JsonFileStore`.

```ts
const category = categories.create({userId: 1, name: '工作', color: '#3b82f6', sortOrder: 1});
const tagA = tags.createOrReuse({userId: 1, name: '客户A', normalizedName: '客户a'});
const tagB = tags.createOrReuse({userId: 1, name: '项目B', normalizedName: '项目b'});

it('creates tasks with priority and tagIds, then filters by all selected tags', () => {
  const first = tasks.create({userId: 1, categoryId: category.id, title: 'A', priority: 'P1', tagIds: [tagA.id, tagB.id]});
  tasks.create({userId: 1, categoryId: category.id, title: 'B', priority: null, tagIds: [tagA.id]});
  expect(first).toMatchObject({priority: 'P1', tagIds: [tagA.id, tagB.id]});
  expect(tasks.getById(first.id, 1)).toMatchObject({priority: 'P1', tagIds: [tagA.id, tagB.id]});
  expect(tasks.listByFilters({userId: 1, tagIds: [tagA.id, tagB.id]}).map((task) => task.title)).toEqual(['A']);
  expect(tasks.listByFilters({userId: 1, priority: 'none'}).map((task) => task.title)).toEqual(['B']);
});

it('updates task details as a full replacement', () => {
  const task = tasks.create({userId: 1, categoryId: category.id, title: '旧标题', priority: 'P2', tagIds: [tagA.id]});
  const updated = tasks.updateDetails({taskId: task.id, userId: 1, title: '新标题', categoryId: category.id, priority: null, tagIds: []});
  expect(updated).toMatchObject({title: '新标题', priority: null, tagIds: []});
  expect(tasks.getById(task.id, 1)).toMatchObject({title: '新标题', priority: null, tagIds: []});
});
```

- [ ] **Step 2: Write failing service and route tests**

Add service tests:

```ts
function existingTask(id: number, userId = 1): Task {
  return {
    id,
    userId,
    categoryId: 1,
    title: `任务${id}`,
    plannedDate: '2026-06-06',
    allDay: true,
    status: 'TODO',
    priority: null,
    tagIds: [],
    createdAt: '',
    updatedAt: '',
  };
}

function buildService(
  repository: TaskRepository,
  categoryExists = true,
  tagsRepo: Pick<TagRepository, 'getManyByIds'> = {getManyByIds: vi.fn(() => [])},
) {
  return new TasksService(
    repository,
    {
      getById: () => categoryExists
        ? {id: 1, userId: 1, name: '工作', color: '#000', sortOrder: 1, createdAt: '', updatedAt: ''}
        : undefined,
    },
    {
      getRunningByUser: () => undefined,
      stop: vi.fn(),
    },
    tagsRepo,
  );
}

Add `updateDetails` to `buildTaskRepository`:

```ts
updateDetails: vi.fn((input) => ({
  ...existingTask(input.taskId, input.userId),
  title: input.title,
  categoryId: input.categoryId,
  priority: input.priority,
  tagIds: input.tagIds,
})),
```

it('rejects details updates with tags owned by another user', () => {
  const service = buildService(repository, true, {
    getManyByIds: vi.fn(() => []),
  });
  expect(() => service.updateDetails({taskId: 1, userId: 1, title: '写方案', categoryId: 1, tagIds: [2], priority: 'P1'})).toThrow('Tag not found');
});
```

Add route tests for:

```txt
PATCH /api/tasks/:id/details
GET /api/tasks?priority=P1&tagIds=1,2
GET /api/tasks?priority=none
GET /api/tasks?categoryId=1abc -> 400
GET /api/tasks?tagIds=1&tagIds=2 -> 400
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm test -- shared/lib/schedule.test.ts server/modules/tasks/tasks.service.test.ts server/modules/tasks/routes.test.ts server/storage/sqlite/repositories/taskSqliteRepository.test.ts server/storage/json/repositories/taskJsonRepository.test.ts
```

Expected: FAIL because task metadata is not implemented.

- [ ] **Step 4: Extend repository contract**

Update `shared/domain/entities.ts` so `Task` has required metadata:

```ts
priority: TaskPriority | null;
tagIds: number[];
```

Update `shared/lib/schedule.ts` so legacy tasks may omit the new metadata, while every canonical `Task` returns stable values:

```ts
export type LegacyTask = Omit<Task, 'plannedDate' | 'allDay' | 'priority' | 'tagIds'> & {
  plannedDate?: string;
  allDay?: boolean;
  plannedEndDate?: string;
  startAt?: string;
  endAt?: string;
  priority?: TaskPriority | null;
  tagIds?: number[];
};

function withStableTaskMetadata(task: LegacyTask): Pick<Task, 'priority' | 'tagIds'> {
  return {
    priority: task.priority ?? null,
    tagIds: task.tagIds ?? [],
  };
}
```

Call `...withStableTaskMetadata(task)` in both branches of `toCanonicalTask`.

Update `TaskFilters`:

```ts
priority?: TaskPriority | null | 'none';
tagIds?: number[];
```

Update `CreateTaskInput`:

```ts
priority?: TaskPriority | null;
tagIds?: number[];
```

Add:

```ts
export interface UpdateTaskDetailsInput {
  taskId: number;
  userId: number;
  title: string;
  categoryId: number;
  priority: TaskPriority | null;
  tagIds: number[];
}
```

Add to `TaskRepository`:

```ts
updateDetails(input: UpdateTaskDetailsInput): Task | undefined;
```

- [ ] **Step 5: Implement repository behavior**

SQLite rules:

- `create` wraps task insert and task_tags inserts in one transaction.
- `updateDetails` wraps task update, delete old task_tags, insert new task_tags in one transaction.
- `remove` deletes task_tags before tasks.
- `priority === 'none'` filters with `priority is null`; `priority` equal to `P1`-`P4` filters with `priority = ?`.
- `listByFilters` applies tagIds all-of with a subquery:

```sql
id in (
  select task_id
  from task_tags
  where user_id = ? and tag_id in (__TAG_ID_PLACEHOLDERS__)
  group by task_id
  having count(distinct tag_id) = ?
)
```

Build `__TAG_ID_PLACEHOLDERS__` from the exact number of `filters.tagIds` entries, for example `?, ?` when `filters.tagIds.length === 2`, then pass the tag ids through the positional values array.

- After loading task rows, batch load tag ids:

```sql
select task_id, tag_id from task_tags where user_id = ? and task_id in (__TASK_ID_PLACEHOLDERS__)
```

Build `__TASK_ID_PLACEHOLDERS__` from the loaded task row ids. When no rows are loaded, skip the tag lookup and return an empty task list. `listByFilters`, `getById`, `create`, and `updateDetails` must all return `Task` objects with stable `tagIds`; only list performs a many-task batch lookup, while single-task return paths do one association lookup for that task id after the write/read transaction.

JSON rules:

- Use one `store.update` for create/updateDetails/remove.
- Store `priority: input.priority ?? null`.
- In `create`, push `TaskTag` entries for every `input.tagIds` item after pushing the new task.
- In `updateDetails`, replace only that task's associations with `data.taskTags = data.taskTags.filter((item) => !(item.userId === input.userId && item.taskId === input.taskId))`, then push the new `input.tagIds` entries.
- In `remove`, remove both `taskExecutionSessions` and `taskTags` for the deleted task in the same `store.update`.
- Build `tagIdsByTaskId` once per list/read path from `data.taskTags`.
- `listByFilters`, `getById`, `create`, and `updateDetails` must return `tagIds: []` for untagged tasks and must never omit the field.

- [ ] **Step 6: Implement service and routes**

`TasksService` gets access to tags through:

```ts
private readonly tags: Pick<TagRepository, 'getManyByIds'>
```

Add helper:

```ts
private assertTagsBelongToUser(userId: number, tagIds: number[]): void {
  if (new Set(tagIds).size !== tagIds.length) throw new AppError(400, 'tagIds must be unique');
  const found = this.tags.getManyByIds(userId, tagIds);
  if (found.length !== tagIds.length) throw new AppError(404, 'Tag not found');
}
```

Call helper in `create` and `updateDetails`.

Extend `TaskListFilters` so `TasksService.list` forwards `priority` and `tagIds` into `this.tasks.listByFilters`.

Update `TasksService.create` to normalize optional task metadata before validation and repository write:

```ts
const tagIds = input.tagIds ?? [];
this.assertTagsBelongToUser(input.userId, tagIds);
return this.tasks.create({
  ...input,
  title,
  priority: input.priority ?? null,
  tagIds,
  plannedDate: normalizedSchedule.plannedDate,
  plannedEndDate: normalizedSchedule.plannedEndDate,
  startAt: normalizedSchedule.startAt,
  endAt: normalizedSchedule.endAt,
  allDay: normalizedSchedule.allDay,
});
```

Add `TasksService.updateDetails(input)` with this order:

```ts
const title = input.title.trim();
if (!title) throw new AppError(400, 'Task title is required');
const category = this.categories.getById(input.categoryId, input.userId);
if (!category) throw new AppError(404, 'Category not found');
this.assertTagsBelongToUser(input.userId, input.tagIds);
const updated = this.tasks.updateDetails({...input, title});
if (!updated) throw new AppError(404, 'Task not found');
return updated;
```

Add route:

```ts
router.patch('/tasks/:id/details', (req, res) => {
  try {
    const {userId} = getUserContext();
    const id = parseTaskId(req.params.id);
    const body = parseTaskDetailsBody(req.body);
    res.json(service.updateDetails({taskId: id, userId, ...body}));
  } catch (error) {
    handleHttpError(res, error);
  }
});
```

Update `server/app/registerRoutes.ts` in this task, because the `TasksService` constructor signature changes here:

```ts
const tasksService = new TasksService(
  repositories.tasks,
  repositories.categories,
  repositories.focusSessions,
  repositories.tags,
);
```

- [ ] **Step 7: Run tests and verify pass**

Run:

```bash
npm test -- shared/lib/schedule.test.ts server/modules/tasks/schemas.test.ts server/modules/tasks/tasks.service.test.ts server/modules/tasks/routes.test.ts server/storage/sqlite/repositories/taskSqliteRepository.test.ts server/storage/json/repositories/taskJsonRepository.test.ts server/storage/sqlite/repositories/rowMappers.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add shared/domain/entities.ts shared/lib/schedule.ts shared/lib/schedule.test.ts server/modules/tasks/repository.ts server/modules/tasks/schemas.ts server/modules/tasks/service.ts server/modules/tasks/routes.ts server/modules/tasks/schemas.test.ts server/modules/tasks/tasks.service.test.ts server/modules/tasks/routes.test.ts server/app/registerRoutes.ts server/storage/json/repositories/taskJsonRepository.ts server/storage/json/repositories/taskJsonRepository.test.ts server/storage/sqlite/repositories/taskSqliteRepository.ts server/storage/sqlite/repositories/taskSqliteRepository.test.ts server/storage/sqlite/repositories/rowMappers.ts server/storage/sqlite/repositories/rowMappers.test.ts
git commit -m "feat: add task metadata persistence"
```

---

### Task 5: JSON To SQLite Import

**Files:**
- Modify: `scripts/importJsonToSqlite.ts`
- Modify: `scripts/importJsonToSqlite.test.ts`

- [ ] **Step 1: Write failing import tests**

Add tests:

```ts
function writeTaggedJsonFixture(jsonPath: string, overrides: Record<string, unknown> = {}) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({
      users: [{id: 1, username: 'demo', displayName: 'Demo User', createdAt: ''}],
      categories: [{id: 1, userId: 1, name: '工作', color: '#3b82f6', sortOrder: 1, createdAt: '', updatedAt: ''}],
      tags: [
        {id: 1, userId: 1, name: '客户 A', createdAt: '', updatedAt: ''},
        {id: 2, userId: 1, name: 'P 项目', createdAt: '', updatedAt: ''},
      ],
      tasks: [
        {id: 1, userId: 1, categoryId: 1, title: '带标签任务', priority: 'P1', status: 'TODO', createdAt: '', updatedAt: ''},
        {id: 2, userId: 1, categoryId: 1, title: '历史任务', status: 'TODO', createdAt: '', updatedAt: ''},
      ],
      taskTags: [{taskId: 1, tagId: 1, userId: 1, createdAt: ''}],
      taskExecutionSessions: [],
      dailyReports: [],
      weeklyReviews: [],
      ...overrides,
    }),
  );
}

it('imports tags and task tag associations', () => {
  const {jsonPath, sqlitePath} = createTestFiles();
  writeTaggedJsonFixture(jsonPath);
  const result = importJsonToSqlite({jsonPath, sqlitePath, force: true});
  expect(result.tags).toBe(2);
  expect(result.taskTags).toBe(1);
});

it('imports task priority values and defaults missing priority to null', () => {
  const {jsonPath, sqlitePath} = createTestFiles();
  writeTaggedJsonFixture(jsonPath);
  importJsonToSqlite({jsonPath, sqlitePath, force: true});
  const db = openSqliteClient(sqlitePath);
  const rows = db.prepare('select id, priority from tasks order by id asc').all() as Array<{id: number; priority: string | null}>;
  expect(rows).toEqual([{id: 1, priority: 'P1'}, {id: 2, priority: null}]);
  db.close();
});

it('rolls back orphan task tag imports', () => {
  const {jsonPath, sqlitePath} = createTestFiles();
  writeTaggedJsonFixture(jsonPath, {
    tasks: [],
    tags: [{id: 1, userId: 1, name: 'A', createdAt: '', updatedAt: ''}],
    taskTags: [{taskId: 999, tagId: 1, userId: 1, createdAt: ''}],
  });
  expect(() => importJsonToSqlite({jsonPath, sqlitePath, force: true})).toThrow('Invalid taskTags association');
});

it('rolls back force clear and import in one transaction', () => {
  const {jsonPath, sqlitePath} = createTestFiles();
  writeTaggedJsonFixture(jsonPath);
  importJsonToSqlite({jsonPath, sqlitePath, force: true});
  writeTaggedJsonFixture(jsonPath, {
    tasks: [],
    tags: [{id: 1, userId: 1, name: 'A', createdAt: '', updatedAt: ''}],
    taskTags: [{taskId: 999, tagId: 1, userId: 1, createdAt: ''}],
  });
  expect(() => importJsonToSqlite({jsonPath, sqlitePath, force: true})).toThrow('Invalid taskTags association');
  const db = openSqliteClient(sqlitePath);
  expect((db.prepare('select count(*) as count from tasks').get() as {count: number}).count).toBeGreaterThan(0);
  db.close();
});

it('rejects cross-user task tag imports', () => {
  const {jsonPath, sqlitePath} = createTestFiles();
  writeTaggedJsonFixture(jsonPath, {
    users: [
      {id: 1, username: 'u1', displayName: 'U1', createdAt: ''},
      {id: 2, username: 'u2', displayName: 'U2', createdAt: ''},
    ],
    tags: [{id: 1, userId: 2, name: '外部', createdAt: '', updatedAt: ''}],
    taskTags: [{taskId: 1, tagId: 1, userId: 1, createdAt: ''}],
  });
  expect(() => importJsonToSqlite({jsonPath, sqlitePath, force: true})).toThrow('Invalid taskTags association');
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- scripts/importJsonToSqlite.test.ts
```

Expected: FAIL because import result has no tags/taskTags and associations are ignored.

- [ ] **Step 3: Implement import support**

Update interfaces:

```ts
import type {TaskPriority} from '../shared/domain/status';

interface JsonTag { id: number; userId: number; name: string; createdAt: string; updatedAt: string; }
interface JsonTaskTag { taskId: number; tagId: number; userId: number; createdAt: string; }
interface JsonTask { priority?: TaskPriority | null; }
```

Update clear order:

```ts
const BUSINESS_TABLES = [
  'task_tags',
  'weekly_reviews',
  'daily_reports',
  'task_execution_sessions',
  'tasks',
  'tags',
  'categories',
] as const;
```

Move both force clearing and all inserts into one SQLite transaction:

```ts
const importTransaction = db.transaction(() => {
  if (hasBusinessData(db)) {
    if (!force) throw new Error('SQLite database already contains business data. Re-run with force to replace it.');
    clearBusinessData(db);
  }

  insertUsers(json.users ?? []);
  insertCategories(json.categories ?? []);
  insertTags(json.tags ?? []);
  insertTasks(json.tasks ?? []);
  insertTaskTagsAfterValidation(json.taskTags ?? []);
  insertSessions(json.taskExecutionSessions ?? []);
  insertDailyReports(json.dailyReports ?? []);
  insertWeeklyReviews(json.weeklyReviews ?? []);
});
```

Extract the current inline insert loops into the helper functions shown above, without changing their existing column normalization except where this task adds tags, task_tags, and task priority. The helpers run only inside `importTransaction`.

Insert tags before tasks with `normalized_name` from `normalizeTagName(tag.name).normalizedName`. Insert tasks with a `priority` column and `task.priority ?? null` value:

```sql
insert into tasks (
  id, user_id, category_id, title, planned_date, planned_end_date, start_at, end_at, all_day, priority, status, created_at, updated_at
)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

Insert task_tags after tasks and tags, and only after verifying all three keys match the same user:

```ts
const task = taskOwners.get(taskTag.taskId);
const tag = tagOwners.get(taskTag.tagId);
if (task !== taskTag.userId || tag !== taskTag.userId) {
  throw new Error('Invalid taskTags association');
}
```

Return counts:

```ts
return {
  users: countRows(db, 'users'),
  categories: countRows(db, 'categories'),
  tags: countRows(db, 'tags'),
  tasks: countRows(db, 'tasks'),
  taskTags: countRows(db, 'task_tags'),
  taskExecutionSessions: countRows(db, 'task_execution_sessions'),
  dailyReports: countRows(db, 'daily_reports'),
  weeklyReviews: countRows(db, 'weekly_reviews'),
};
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
npm test -- scripts/importJsonToSqlite.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/importJsonToSqlite.ts scripts/importJsonToSqlite.test.ts
git commit -m "feat: import tags into sqlite"
```

---

### Task 6: Frontend API, Metadata, And Tag Combobox

**Files:**
- Create: `src/modules/tags/api/tagsApi.ts`
- Create: `src/modules/tags/api/tagsApi.test.ts`
- Create: `src/modules/tags/controllers/tagName.ts`
- Create: `src/modules/tags/controllers/tagName.test.ts`
- Create: `src/modules/tags/controllers/useTagActions.ts`
- Create: `src/modules/tags/controllers/useTagActions.test.ts`
- Create: `src/modules/tags/components/TagCombobox.tsx`
- Create: `src/modules/tags/components/TagCombobox.test.tsx`
- Modify: `src/modules/tasks/api/tasksApi.ts`
- Modify: `src/modules/tasks/api/tasksApi.test.ts`
- Modify: `src/app/hooks/useAppData.ts`
- Modify: `src/app/hooks/useAppData.test.ts`

- [ ] **Step 1: Write failing frontend API and combobox tests**

Create `src/modules/tags/api/tagsApi.test.ts`:

```ts
it('creates tags with a normalized payload', async () => {
  const fetch = vi.fn().mockResolvedValue({ok: true, json: async () => ({id: 1, userId: 1, name: 'Foo Bar', createdAt: '', updatedAt: ''})});
  vi.stubGlobal('fetch', fetch);
  await tagsApi.createTag({name: 'Foo Bar'});
  expect(fetch).toHaveBeenCalledWith('/api/tags', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({name: 'Foo Bar'}),
  }));
});
```

Create `TagCombobox` tests:

```tsx
it('creates a normalized tag on explicit Enter and selects the returned tag', async () => {
  const onCreateTag = vi.fn().mockResolvedValue({id: 2, userId: 1, name: 'Foo Bar', createdAt: '', updatedAt: ''});
  render(<TagCombobox tags={[]} selectedTagIds={[]} onChange={vi.fn()} onCreateTag={onCreateTag} />);
  await userEvent.type(screen.getByRole('combobox', {name: /标签/}), 'Foo   Bar{enter}');
  expect(onCreateTag).toHaveBeenCalledWith('Foo Bar');
});
```

Create `src/modules/tags/controllers/useTagActions.test.ts`:

```ts
vi.mock('../api/tagsApi', () => ({
  tagsApi: {
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}));

it('creates a tag then refreshes tags', async () => {
  vi.mocked(tagsApi.createTag).mockResolvedValue({id: 1, userId: 1, name: '客户A', createdAt: '', updatedAt: ''});
  const refreshTags = vi.fn().mockResolvedValue([]);
  const {result} = renderHook(() => useTagActions({refreshTags, refreshAllTasks: vi.fn()}));
  await result.current.createTag('客户A');
  expect(tagsApi.createTag).toHaveBeenCalledWith({name: '客户A'});
  expect(refreshTags).toHaveBeenCalled();
});

it('deletes a tag then refreshes tags and tasks', async () => {
  const refreshTags = vi.fn().mockResolvedValue([]);
  const refreshAllTasks = vi.fn().mockResolvedValue([]);
  const {result} = renderHook(() => useTagActions({refreshTags, refreshAllTasks}));
  await result.current.deleteTag(1);
  expect(tagsApi.deleteTag).toHaveBeenCalledWith(1);
  expect(refreshTags).toHaveBeenCalled();
  expect(refreshAllTasks).toHaveBeenCalled();
});

it('renames a tag then refreshes tags and tasks', async () => {
  vi.mocked(tagsApi.updateTag).mockResolvedValue({id: 1, userId: 1, name: '客户B', createdAt: '', updatedAt: ''});
  const refreshTags = vi.fn().mockResolvedValue([]);
  const refreshAllTasks = vi.fn().mockResolvedValue([]);
  const {result} = renderHook(() => useTagActions({refreshTags, refreshAllTasks}));
  await result.current.updateTag(1, '客户B');
  expect(tagsApi.updateTag).toHaveBeenCalledWith(1, {name: '客户B'});
  expect(refreshTags).toHaveBeenCalled();
  expect(refreshAllTasks).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/modules/tags/api/tagsApi.test.ts src/modules/tags/controllers/tagName.test.ts src/modules/tags/controllers/useTagActions.test.ts src/modules/tags/components/TagCombobox.test.tsx src/modules/tasks/api/tasksApi.test.ts src/app/hooks/useAppData.test.ts
```

Expected: FAIL because frontend tag modules do not exist.

- [ ] **Step 3: Implement frontend API and normalization**

Create `tagName.ts`:

```ts
export function normalizeTagInput(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizedTagKey(value: string): string {
  return normalizeTagInput(value).toLocaleLowerCase();
}
```

Create `tagsApi.ts`:

```ts
export const tagsApi = {
  getTags: () => requestJson<Tag[]>('/api/tags'),
  createTag: (input: {name: string}) => requestJson<Tag>('/api/tags', {method: 'POST', body: JSON.stringify(input)}),
  updateTag: (id: number, input: {name: string}) => requestJson<Tag>(`/api/tags/${id}`, {method: 'PATCH', body: JSON.stringify(input)}),
  deleteTag: (id: number) => requestJson<void>(`/api/tags/${id}`, {method: 'DELETE'}),
};
```

Update `tasksApi` to send and receive `priority`, `tagIds`, `updateTaskDetails`, and comma-separated `tagIds` query filters.

Create `useTagActions.ts`:

```ts
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
    await refreshTags();
    await refreshAllTasks();
    return tag;
  }, [refreshAllTasks, refreshTags]);

  const deleteTag = useCallback(async (id: number) => {
    await tagsApi.deleteTag(id);
    await refreshTags();
    await refreshAllTasks();
  }, [refreshAllTasks, refreshTags]);

  return {createTag, updateTag, deleteTag};
}
```

- [ ] **Step 4: Implement `TagCombobox`**

`TagCombobox` props:

```ts
interface TagComboboxProps {
  tags: Tag[];
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  onCreateTag: (name: string) => Promise<Tag>;
  label?: string;
}
```

Required behavior:

- Existing tags render as chips.
- Input role is `combobox` with label `标签`.
- Enter while not composing creates only when normalized input is non-empty and no existing normalized tag matches.
- If existing tag matches, select existing id and do not call `onCreateTag`.
- While create is pending, disable input.
- On failure, keep input text and do not select any new id.

- [ ] **Step 5: Load tags in app data**

Update `useAppData` with:

```ts
const [tags, setTags] = useState<Tag[]>([]);
const refreshTags = useCallback(async () => {
  const data = await tagsApi.getTags();
  setTags(data);
  return data;
}, []);
```

`loadMetaData` loads categories, tags, selected-date tasks and all tasks.

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
npm test -- src/modules/tags/api/tagsApi.test.ts src/modules/tags/controllers/tagName.test.ts src/modules/tags/controllers/useTagActions.test.ts src/modules/tags/components/TagCombobox.test.tsx src/modules/tasks/api/tasksApi.test.ts src/app/hooks/useAppData.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/tags src/modules/tasks/api/tasksApi.ts src/modules/tasks/api/tasksApi.test.ts src/app/hooks/useAppData.ts src/app/hooks/useAppData.test.ts
git commit -m "feat: add frontend tag metadata api"
```

---

### Task 7: Task Library Controllers And UI

**Files:**
- Create: `src/modules/tasks/controllers/useTaskDraftController.ts`
- Create: `src/modules/tasks/controllers/useTaskDraftController.test.ts`
- Create: `src/modules/tasks/controllers/useTaskFilterController.ts`
- Create: `src/modules/tasks/controllers/useTaskFilterController.test.ts`
- Create: `src/modules/tasks/controllers/useTaskMutations.ts`
- Create: `src/modules/tasks/controllers/useTaskMutations.test.ts`
- Create: `src/modules/tasks/controllers/useTasksPanelController.ts`
- Create: `src/modules/tasks/components/TaskBasicInfoModal.tsx`
- Create: `src/modules/tasks/components/TaskBasicInfoModal.test.tsx`
- Modify: `src/modules/tasks/components/TaskCreateForm.tsx`
- Modify: `src/modules/tasks/components/TaskFilterBar.tsx`
- Modify: `src/modules/tasks/components/TaskListItem.tsx`
- Modify: `src/modules/tasks/components/TaskList.tsx`
- Modify: `src/modules/tasks/components/TasksPanel.tsx`
- Modify: `src/modules/tasks/components/TasksPanel.test.tsx`
- Modify: `src/app/AppShell.tsx`

- [ ] **Step 1: Write failing controller tests**

Create filter tests:

```ts
const taskA = {id: 1, userId: 1, categoryId: 1, title: 'A', plannedDate: undefined, allDay: true, status: 'TODO', priority: null, tagIds: [], createdAt: '', updatedAt: ''} satisfies Task;
const taskB = {id: 2, userId: 1, categoryId: 1, title: 'B', plannedDate: undefined, allDay: true, status: 'TODO', priority: 'P1', tagIds: [], createdAt: '', updatedAt: ''} satisfies Task;

it('filters tasks by all selected tag ids and null priority', () => {
  expect(filterTasksWithMetadata([
    {...taskA, tagIds: [1, 2], priority: null},
    {...taskB, tagIds: [1], priority: 'P1'},
  ], {
    category: 'all',
    status: 'all',
    dateScope: 'all',
    selectedDate: '2026-06-07',
    tagIds: [1, 2],
    priority: null,
    query: '',
  })).toEqual([{...taskA, tagIds: [1, 2], priority: null}]);
});

it('distinguishes all priorities from no-priority filtering and only searches titles', () => {
  expect(filterTasksWithMetadata([
    {...taskA, title: '写方案', tagIds: [], priority: null},
    {...taskB, title: '客户会议', tagIds: [], priority: 'P1'},
  ], {
    category: 'all',
    status: 'all',
    dateScope: 'all',
    selectedDate: '2026-06-07',
    tagIds: [],
    priority: 'all',
    query: '客户',
  })).toEqual([{...taskB, title: '客户会议', tagIds: [], priority: 'P1'}]);

  expect(filterTasksWithMetadata([
    {...taskA, title: '无优先级', tagIds: [], priority: null},
    {...taskB, title: '高优先级', tagIds: [], priority: 'P1'},
  ], {
    category: 'all',
    status: 'all',
    dateScope: 'all',
    selectedDate: '2026-06-07',
    tagIds: [],
    priority: 'none',
    query: '',
  })).toEqual([{...taskA, title: '无优先级', tagIds: [], priority: null}]);
});

it('keeps create draft and details draft isolated from schedule fields', () => {
  const task = {...taskA, title: '编辑任务', plannedDate: '2026-06-07'};
  const {result} = renderHook(() => useTaskDraftController({defaultCategoryId: 1}));
  result.current.openEditTask({...task, plannedDate: '2026-06-07', tagIds: [1], priority: 'P2'});
  expect(result.current.editDraft.details).toEqual({
    title: task.title,
    categoryId: task.categoryId,
    tagIds: [1],
    priority: 'P2',
  });
  expect(result.current.editDraft.details).not.toHaveProperty('plannedDate');
});
```

Create mutation tests:

```ts
it('updates task details then refreshes affected task lists', async () => {
  const refreshAllTasks = vi.fn();
  const loadTasksForSelectedDate = vi.fn();
  const {result} = renderHook(() => useTaskMutations({
    refreshAllTasks,
    loadTasksForSelectedDate,
    stopRunningSessionForTask: vi.fn(),
    refreshReports: vi.fn(),
  }));
  await result.current.updateTaskDetails({taskId: 1, title: '新标题', categoryId: 1, tagIds: [], priority: null});
  expect(tasksApi.updateTaskDetails).toHaveBeenCalledWith(1, {title: '新标题', categoryId: 1, tagIds: [], priority: null});
  expect(refreshAllTasks).toHaveBeenCalled();
  expect(loadTasksForSelectedDate).toHaveBeenCalled();
});

it('deletes a task through lifecycle callbacks', async () => {
  const stopRunningSessionForTask = vi.fn();
  const refreshReports = vi.fn();
  const refreshAllTasks = vi.fn();
  const loadTasksForSelectedDate = vi.fn();
  const {result} = renderHook(() => useTaskMutations({
    refreshAllTasks,
    loadTasksForSelectedDate,
    stopRunningSessionForTask,
    refreshReports,
  }));
  await result.current.deleteTask(1);
  expect(tasksApi.deleteTask).toHaveBeenCalledWith(1);
  expect(stopRunningSessionForTask).toHaveBeenCalledWith(1);
  expect(refreshReports).toHaveBeenCalled();
  expect(refreshAllTasks).toHaveBeenCalled();
  expect(loadTasksForSelectedDate).toHaveBeenCalled();
});
```

- [ ] **Step 2: Write failing component tests**

Add `TaskBasicInfoModal` tests:

```tsx
it('submits full replacement details', async () => {
  const task = {...taskA, title: '旧标题', tagIds: [], priority: null};
  const categories = [{id: 1, userId: 1, name: '工作', color: '#000', sortOrder: 1, createdAt: '', updatedAt: ''}];
  const tags: Tag[] = [];
  const onSave = vi.fn();
  render(<TaskBasicInfoModal task={task} categories={categories} tags={tags} onCreateTag={vi.fn()} onSave={onSave} onClose={vi.fn()} />);
  await userEvent.clear(screen.getByLabelText('任务标题'));
  await userEvent.type(screen.getByLabelText('任务标题'), '新标题');
  await userEvent.selectOptions(screen.getByLabelText('优先级'), 'P1');
  await userEvent.click(screen.getByRole('button', {name: '保存'}));
  expect(onSave).toHaveBeenCalledWith({title: '新标题', categoryId: 1, tagIds: [], priority: 'P1'});
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm test -- src/modules/tasks/controllers/useTaskDraftController.test.ts src/modules/tasks/controllers/useTaskFilterController.test.ts src/modules/tasks/controllers/useTaskMutations.test.ts src/modules/tasks/components/TaskBasicInfoModal.test.tsx src/modules/tasks/components/TasksPanel.test.tsx
```

Expected: FAIL because controllers and modal do not exist.

- [ ] **Step 4: Implement controllers**

`useTaskDraftController` owns task-library create and edit modal state only. `useTaskFilterController` extends current filter logic and uses all-of tag filtering. `useTaskFilterController` uses `priority: 'all' | 'none' | TaskPriority`; `'all'` means no priority filter, `'none'` means `task.priority === null`.

`useTaskMutations` accepts lifecycle callbacks:

```ts
interface UseTaskMutationsInput {
  refreshAllTasks: () => Promise<Task[]>;
  loadTasksForSelectedDate: () => Promise<unknown>;
  stopRunningSessionForTask: (taskId: number) => Promise<void>;
  refreshReports: () => Promise<void>;
}
```

It calls `tasksApi.createTask({title, categoryId, plannedDate, priority, tagIds})`, `tasksApi.updateTaskDetails(taskId, {title, categoryId, tagIds, priority})`, and `tasksApi.deleteTask(taskId)`. Delete must call `stopRunningSessionForTask`, `refreshReports`, `refreshAllTasks`, and `loadTasksForSelectedDate`, preserving the existing `useTaskActions` side effects.

`useTasksPanelController` returns:

```ts
{
  categories,
  tags,
  createDraft: {
    title,
    categoryId,
    tagIds,
    priority,
    plannedDate,
    unscheduled,
    setTitle,
    setCategoryId,
    setTagIds,
    setPriority,
    setPlannedDate,
    setUnscheduled,
  },
  editDraft,
  filters: {
    category,
    status,
    dateScope,
    tagIds,
    priority,
    query,
    setCategory,
    setStatus,
    setDateScope,
    setTagIds,
    setPriority,
    setQuery,
  },
  filteredTaskItems,
  mutations,
  tagActions,
  openEditTask,
  closeEditTask,
}
```

- [ ] **Step 5: Update task UI**

`TasksPanel` accepts:

```ts
interface TasksPanelProps {
  styleContext: {primary: string; primaryLight: string; secondary: string};
  controller: ReturnType<typeof useTasksPanelController>;
}
```

`TaskCreateForm` receives `categories`, `tags`, `selectedTagIds`, `priority`, `onTagIdsChange`, `onPriorityChange`, and `onCreateTag` from `controller.createDraft` and `controller.tagActions`. `TaskListItem` adds:

```tsx
<button type="button" aria-label={`编辑任务 ${task.title}`} onClick={() => onEditTask(task)}>
  <Edit3 className="w-3.5 h-3.5" />
</button>
```

Do not make row click open edit.

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
npm test -- src/modules/tasks/controllers/useTaskDraftController.test.ts src/modules/tasks/controllers/useTaskFilterController.test.ts src/modules/tasks/controllers/useTaskMutations.test.ts src/modules/tasks/components/TaskBasicInfoModal.test.tsx src/modules/tasks/components/TasksPanel.test.tsx
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/tasks/controllers src/modules/tasks/components src/app/AppShell.tsx
git commit -m "feat: add task metadata editing"
```

---

### Task 8: Organization Page Tags Section

**Files:**
- Create: `src/modules/categories/components/OrganizationPanel.tsx`
- Create: `src/modules/categories/components/OrganizationPanel.test.tsx`
- Modify: `src/modules/categories/components/CategoryPanel.tsx`
- Modify: `src/modules/categories/controllers/useCategoryActions.ts`
- Modify: `src/app/navigation.ts`
- Modify: `src/app/AppShell.tsx`

- [ ] **Step 1: Write failing organization tests**

Create tests:

```tsx
function buildOrganizationPanelProps(overrides = {}) {
  return {
    categories,
    tags,
    categoryController,
    tagController: {
      createTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
    },
    styleContext,
    ...overrides,
  };
}

it('renders category and tag sections under the organization page', () => {
  const props = buildOrganizationPanelProps({categories, tags});
  render(<OrganizationPanel {...props} />);
  expect(screen.getByRole('heading', {name: '分类'})).toBeInTheDocument();
  expect(screen.getByRole('heading', {name: '标签'})).toBeInTheDocument();
});

it('deletes a tag with copy that preserves tasks', async () => {
  const tagController = {createTag: vi.fn(), updateTag: vi.fn(), deleteTag: vi.fn()};
  const props = buildOrganizationPanelProps({tags, tagController});
  render(<OrganizationPanel {...props} />);
  await userEvent.click(screen.getByLabelText('删除标签 客户A'));
  expect(window.confirm).toHaveBeenCalledWith('删除标签「客户A」？任务会保留，只会移除这个标签关联。');
  expect(tagController.deleteTag).toHaveBeenCalled();
});

it('creates and renames tags through tagController', async () => {
  const tagController = {createTag: vi.fn(), updateTag: vi.fn(), deleteTag: vi.fn()};
  const props = buildOrganizationPanelProps({tagController});
  render(<OrganizationPanel {...props} />);
  await userEvent.type(screen.getByLabelText('新标签'), '客户A');
  await userEvent.click(screen.getByRole('button', {name: '新增标签'}));
  expect(tagController.createTag).toHaveBeenCalledWith('客户A');
  await userEvent.click(screen.getByLabelText('重命名标签 客户A'));
  await userEvent.clear(screen.getByLabelText('标签名称'));
  await userEvent.type(screen.getByLabelText('标签名称'), '客户B');
  await userEvent.click(screen.getByRole('button', {name: '保存标签'}));
  expect(tagController.updateTag).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/modules/categories/components/OrganizationPanel.test.tsx
```

Expected: FAIL because organization panel does not exist.

- [ ] **Step 3: Implement organization page**

Keep tab key `categories` in `navigation.ts`. Change display label to `组织`.

`OrganizationPanel` composes:

```tsx
interface OrganizationPanelProps {
  categories: Category[];
  tags: Tag[];
  categoryController: CategoryController;
  tagController: ReturnType<typeof useTagActions>;
  styleContext: StyleContext;
}

<CategorySection controller={categoryController} styleContext={styleContext} />
<TagsSection tags={tags} controller={tagController} />
```

Implement the split deterministically:

- `CategoryPanel.tsx` exports `CategorySection` containing the existing category management UI.
- `CategoryPanel` becomes a compatibility wrapper that renders `CategorySection` with the old props until `AppShell` is switched.
- `OrganizationPanel.tsx` imports `CategorySection` and defines `TagsSection` in the same file for this task.
- `TagsSection` uses simple rows/chips, not colored category cards.
- `AppShell.tsx` renders `OrganizationPanel` for navigation key `categories`.

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
npm test -- src/modules/categories/components/OrganizationPanel.test.tsx src/modules/categories/components/CategoryPanel.test.tsx
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/components src/modules/categories/controllers/useCategoryActions.ts src/app/navigation.ts src/app/AppShell.tsx
git commit -m "feat: add organization tag management"
```

---

### Task 9: Lightweight Today And Calendar Creation

**Files:**
- Create: `src/modules/dashboard/controllers/useTodayQuickCreateController.ts`
- Create: `src/modules/dashboard/controllers/useTodayQuickCreateController.test.ts`
- Modify: `src/modules/dashboard/components/DashboardPanel.tsx`
- Modify: `src/modules/dashboard/components/DashboardPanel.test.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/modules/calendar/api/calendarApi.ts`
- Modify: `src/modules/calendar/controllers/useCalendarController.ts`
- Modify: `src/modules/calendar/controllers/useCalendarController.test.ts`
- Modify: `src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx`

- [ ] **Step 1: Write failing tests**

Create today quick-create test:

```ts
it('creates today tasks with empty metadata', async () => {
  await result.current.createTodayTask({title: '复盘', categoryId: 1});
  expect(tasksApi.createTask).toHaveBeenCalledWith(expect.objectContaining({
    title: '复盘',
    categoryId: 1,
    tagIds: [],
    priority: null,
  }));
});
```

Add calendar controller test:

```ts
await result.current.createAllDayTask('2026-06-07', '全天任务');
expect(calendarApi.createCalendarTask).toHaveBeenCalledWith(expect.objectContaining({
  tagIds: [],
  priority: null,
}));

act(() => result.current.openQuickCreateDraft({
  kind: 'timed',
  plannedDate: '2026-06-07',
  startAt: '2026-06-07T09:00:00.000',
  endAt: '2026-06-07T10:00:00.000',
  anchor: {x: 0, y: 0},
}));
await result.current.submitQuickCreateDraft({title: '浮层任务', categoryId: 1});
expect(calendarApi.createCalendarTask).toHaveBeenLastCalledWith(expect.objectContaining({
  tagIds: [],
  priority: null,
}));
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/modules/dashboard/controllers/useTodayQuickCreateController.test.ts src/modules/calendar/controllers/useCalendarController.test.ts src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx
```

Expected: FAIL because metadata defaults are not explicit.

- [ ] **Step 3: Implement lightweight creation defaults**

`useTodayQuickCreateController` owns its own title/category state and calls:

```ts
tasksApi.createTask({title, categoryId, plannedDate: selectedDate, tagIds: [], priority: null});
```

`AppShell.tsx` creates `todayQuickCreateController` with `useTodayQuickCreateController` and passes only that controller to `DashboardPanel`. Remove any DashboardPanel dependency on task-library create draft fields.

Both `createAllDayTask` and `submitQuickCreateDraft` call:

```ts
calendarApi.createCalendarTask({...draftPayload, title, categoryId, tagIds: [], priority: null});
```

Do not add tag or priority controls to today or calendar quick-create UIs.

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
npm test -- src/modules/dashboard/controllers/useTodayQuickCreateController.test.ts src/modules/dashboard/components/DashboardPanel.test.tsx src/modules/calendar/controllers/useCalendarController.test.ts src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/dashboard src/app/AppShell.tsx src/modules/calendar/api/calendarApi.ts src/modules/calendar/controllers/useCalendarController.ts src/modules/calendar/controllers/useCalendarController.test.ts src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx
git commit -m "feat: isolate lightweight task creation"
```

---

### Task 10: Scheduling Sidebar Filters And Grouping

**Files:**
- Create: `src/modules/calendar/controllers/schedulingSidebarGrouping.ts`
- Create: `src/modules/calendar/controllers/schedulingSidebarGrouping.test.ts`
- Modify: `src/modules/calendar/controllers/useSchedulingSidebarController.ts`
- Modify: `src/modules/calendar/controllers/useSchedulingSidebarController.test.ts`
- Modify: `src/modules/calendar/components/CalendarPanel.tsx`
- Modify: `src/modules/calendar/components/SchedulingSidebar.tsx`
- Modify: `src/modules/calendar/components/SchedulingSidebar.test.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/modules/calendar/api/calendarApi.ts`
- Create: `src/modules/calendar/api/calendarApi.test.ts`

- [ ] **Step 1: Write failing grouping tests**

Create `schedulingSidebarGrouping.test.ts`:

```ts
const categories = [{id: 1, userId: 1, name: '工作', color: '#000', sortOrder: 1, createdAt: '', updatedAt: ''}];
const tags = [
  {id: 1, userId: 1, name: '客户A', createdAt: '', updatedAt: ''},
  {id: 2, userId: 1, name: '项目B', createdAt: '', updatedAt: ''},
];
const task = {id: 1, userId: 1, categoryId: 1, title: '任务', plannedDate: undefined, allDay: true, status: 'TODO', priority: null, tagIds: [], createdAt: '', updatedAt: ''} satisfies Task;

it('groups tasks by priority with null last', () => {
  const tasks = [
    {...task, id: 1, priority: 'P1'},
    {...task, id: 2, priority: 'P2'},
    {...task, id: 3, priority: 'P3'},
    {...task, id: 4, priority: 'P4'},
    {...task, id: 5, priority: null},
  ];
  expect(groupSchedulingTasks(tasks, {mode: 'priority', categories, tags}).map((group) => group.label)).toEqual(['P1', 'P2', 'P3', 'P4', '无优先级']);
});

it('keeps duplicate tag-group tasks selected by one global task id set', () => {
  const groups = groupSchedulingTasks([{...task, tagIds: [1, 2]}], {mode: 'tag', categories, tags});
  expect(groups).toHaveLength(2);
  expect(uniqueSelectedTaskIds(new Set([task.id]))).toEqual([task.id]);
});
```

- [ ] **Step 2: Write failing controller/component tests**

Add controller test:

```ts
const {result} = renderHook(() => useSchedulingSidebarController({
  categories,
  tags,
  selectedDateRange: {dateFrom: '2026-06-07', dateTo: '2026-06-07'},
  onSelectionChange: vi.fn(),
}));
await act(async () => result.current.setTagIds([1, 2]));
expect(calendarApi.getUnscheduledTasks).toHaveBeenLastCalledWith(expect.objectContaining({tagIds: [1, 2]}));
expect(calendarApi.getAllDayWithoutTimeTasks).toHaveBeenLastCalledWith(expect.objectContaining({tagIds: [1, 2]}));
expect(result.current.selectedTaskIds.size).toBe(0);
```

Add component test:

```tsx
expect(screen.getByRole('button', {name: '筛选'})).toBeInTheDocument();
await userEvent.click(screen.getByRole('button', {name: '筛选'}));
expect(screen.getByLabelText('安排栏优先级')).toBeInTheDocument();
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm test -- src/modules/calendar/controllers/schedulingSidebarGrouping.test.ts src/modules/calendar/controllers/useSchedulingSidebarController.test.ts src/modules/calendar/components/SchedulingSidebar.test.tsx
```

Expected: FAIL because grouping and filters do not exist.

- [ ] **Step 4: Implement grouping helpers**

`schedulingSidebarGrouping.ts` exports:

```ts
export type SchedulingGroupMode = 'none' | 'category' | 'tag' | 'priority';

export interface SchedulingTaskGroup {
  id: string;
  label: string;
  tasks: Task[];
}

export function groupSchedulingTasks(tasks: Task[], input: {mode: SchedulingGroupMode; categories: Category[]; tags: Tag[]}): SchedulingTaskGroup[] {
  if (input.mode === 'none') return [{id: 'all', label: '全部', tasks}];
  if (input.mode === 'priority') return groupByPriority(tasks);
  if (input.mode === 'category') return groupByCategory(tasks, input.categories);
  return groupByTag(tasks, input.tags);
}

export function uniqueSelectedTaskIds(selectedTaskIds: Set<number>): number[] {
  return [...selectedTaskIds].sort((left, right) => left - right);
}
```

Implement grouping helpers in the same file with this exact behavior:

```ts
const PRIORITY_GROUPS = [
  {id: 'priority:P1', label: 'P1', priority: 'P1'},
  {id: 'priority:P2', label: 'P2', priority: 'P2'},
  {id: 'priority:P3', label: 'P3', priority: 'P3'},
  {id: 'priority:P4', label: 'P4', priority: 'P4'},
  {id: 'priority:none', label: '无优先级', priority: null},
] as const;

function groupByPriority(tasks: Task[]): SchedulingTaskGroup[] {
  return PRIORITY_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    tasks: tasks.filter((task) => task.priority === group.priority),
  })).filter((group) => group.tasks.length > 0);
}

function groupByCategory(tasks: Task[], categories: Category[]): SchedulingTaskGroup[] {
  const known = categories.map((category) => ({
    id: `category:${category.id}`,
    label: category.name,
    tasks: tasks.filter((task) => task.categoryId === category.id),
  })).filter((group) => group.tasks.length > 0);
  const uncategorized = tasks.filter((task) => !categories.some((category) => category.id === task.categoryId));
  return uncategorized.length > 0 ? [...known, {id: 'category:unknown', label: '未分类', tasks: uncategorized}] : known;
}

function groupByTag(tasks: Task[], tags: Tag[]): SchedulingTaskGroup[] {
  const tagGroups = tags.map((tag) => ({
    id: `tag:${tag.id}`,
    label: tag.name,
    tasks: tasks.filter((task) => task.tagIds.includes(tag.id)),
  })).filter((group) => group.tasks.length > 0);
  const untagged = tasks.filter((task) => task.tagIds.length === 0);
  return untagged.length > 0 ? [...tagGroups, {id: 'tag:none', label: '无标签', tasks: untagged}] : tagGroups;
}
```

- [ ] **Step 5: Implement controller filters**

`useSchedulingSidebarController` adds:

```ts
tagIds: number[];
priority: 'all' | 'none' | TaskPriority;
groupMode: SchedulingGroupMode;
groupedTaskGroups: SchedulingTaskGroup[];
setTagIds: (tagIds: number[]) => void;
setPriority: (priority: 'all' | 'none' | TaskPriority) => void;
setGroupMode: (mode: SchedulingGroupMode) => void;
```

Every filter setter clears `selectedTaskIds`. API requests send the same `categoryId`, `tagIds`, `priority`, and `query` filters to both `calendarApi.getUnscheduledTasks` and `calendarApi.getAllDayWithoutTimeTasks`. `useSchedulingSidebarController` computes `groupedTaskGroups = groupSchedulingTasks(filteredTasks, {mode: groupMode, categories, tags})`; `SchedulingSidebar` renders `groupedTaskGroups` and does not call API or regroup tasks itself.

`AppShell.tsx` passes `tags` into `CalendarPanel`. `CalendarPanel.tsx` passes `tags` into `useSchedulingSidebarController` and `SchedulingSidebar`.

- [ ] **Step 6: Implement sidebar UI**

Use a collapsible filter area:

```tsx
<button type="button" aria-expanded={filtersOpen}>筛选</button>
```

Search stays visible. Category, tag combobox, priority select, and group mode select live in the collapsed area. Chips show one line and `+N` overflow. Group headers display stable counts.

- [ ] **Step 7: Run tests and verify pass**

Run:

```bash
npm test -- src/modules/calendar/controllers/schedulingSidebarGrouping.test.ts src/modules/calendar/controllers/useSchedulingSidebarController.test.ts src/modules/calendar/components/SchedulingSidebar.test.tsx src/modules/calendar/api/calendarApi.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/AppShell.tsx src/modules/calendar/components/CalendarPanel.tsx src/modules/calendar/controllers/schedulingSidebarGrouping.ts src/modules/calendar/controllers/schedulingSidebarGrouping.test.ts src/modules/calendar/controllers/useSchedulingSidebarController.ts src/modules/calendar/controllers/useSchedulingSidebarController.test.ts src/modules/calendar/components/SchedulingSidebar.tsx src/modules/calendar/components/SchedulingSidebar.test.tsx src/modules/calendar/api/calendarApi.ts src/modules/calendar/api/calendarApi.test.ts
git commit -m "feat: group scheduling sidebar by task metadata"
```

---

### Task 11: Full Regression And Final Review

**Files:**
- Inspect all changed files.

- [ ] **Step 1: Run full quality gates**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Check implementation scope**

Run:

```bash
git diff --name-only "$(cat .task-tags-priority-base)" HEAD
```

Expected changed paths stay within:

```txt
shared/domain/
shared/lib/schedule.ts
shared/lib/schedule.test.ts
server/modules/tags/
server/modules/tasks/
server/storage/
server/app/registerRoutes.ts
scripts/importJsonToSqlite.ts
scripts/importJsonToSqlite.test.ts
src/app/
src/modules/tags/
src/modules/tasks/
src/modules/categories/
src/modules/dashboard/
src/modules/calendar/
docs/superpowers/plans/2026-06-07-task-tags-priority-plan.md
```

If another path appears, inspect and justify it before merging.

- [ ] **Step 3: Review high-risk contracts manually**

Inspect these exact behaviors:

```txt
Task.priority is always TaskPriority | null.
Task.tagIds is always an array.
SQLite task_tags uses same-user composite foreign keys.
GET /api/tasks tagIds uses all-of semantics.
Task details does not update status or schedule.
Today and calendar quick-create send tagIds [] and priority null.
Scheduling sidebar duplicate tag groups use unique taskIds for bulk actions.
```

- [ ] **Step 4: Report final state**

Summarize:

```bash
git log --oneline --reverse "$(cat .task-tags-priority-base)..HEAD"
```

Expected output includes commits with these subjects:

```txt
feat: define task priority and tag schemas
feat: add tag storage foundation
feat: add tags api
feat: add task metadata persistence
feat: import tags into sqlite
feat: add frontend tag metadata api
feat: add task metadata editing
feat: add organization tag management
feat: isolate lightweight task creation
feat: group scheduling sidebar by task metadata

Verification:
- npm test: PASS
- npm run lint: PASS
- npm run build: PASS
- git diff --check: PASS
```

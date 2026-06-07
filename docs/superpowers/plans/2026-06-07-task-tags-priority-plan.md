# Task Tags Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved task tags and priority model end to end: real user-scoped tags, fixed task priority, basic task details editing, task-library filtering, organization management, and scheduling-sidebar filtering/grouping.

**Architecture:** Add tags as a real backend module and keep task details separate from status and schedule mutations. Keep `priority` and `tagIds` in the shared `Task` contract so every task consumer receives stable metadata. On the frontend, route task-library behavior through controller objects instead of expanding `AppShell` prop drilling, and keep today/calendar quick-create paths lightweight with explicit empty metadata.

**Tech Stack:** TypeScript, React 19, Express, better-sqlite3, JSON file storage, Vitest, Testing Library, Vite, Tailwind CSS.

**Execution Discipline:** Execute tasks sequentially. Use TDD inside each task. Commit after each task. Do not stage the existing unrelated `README.md` change. Do not start implementation until an isolated worktree is created at execution time.

---

## File Structure

- Modify: `shared/domain/status.ts` - add `TASK_PRIORITIES` and `TaskPriority`.
- Modify: `shared/domain/entities.ts` - add `Tag`, `TaskTag`, `Task.priority`, and `Task.tagIds`.
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
- Modify: `src/modules/categories/components/CategoryPanel.tsx` - move category section into organization composition or keep as `CategorySection`.
- Modify: `src/modules/categories/controllers/useCategoryActions.ts` - preserve category behavior under organization page.
- Modify: `src/modules/calendar/api/calendarApi.ts` - pass empty metadata in calendar create payloads.
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
git worktree add .worktrees/task-tags-priority-dev -b task-tags-priority-dev
cd .worktrees/task-tags-priority-dev
```

Expected:

```txt
Preparing worktree
HEAD is now at
```

If the main worktree still has `README.md` modified, leave it in the main worktree and do not copy or stage it.

- [ ] **Step 2: Record execution base**

Run:

```bash
git rev-parse HEAD > .git/task-tags-priority-base
cat .git/task-tags-priority-base
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
  expect(() => parseTaskQuery({priority: 'P5'})).toThrow('priority must be one of');
  expect(() => parseTaskQuery({tagIds: '1, 2'})).toThrow('tagIds must be a comma-separated list');
  expect(() => parseTaskQuery({tagIds: ['1', '2']})).toThrow('tagIds must be provided once');
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

Expected: FAIL because `TaskPriority`, `parseTaskDetailsBody`, and tag schemas do not exist yet.

- [ ] **Step 3: Implement shared types and parsers**

Update `shared/domain/status.ts`:

```ts
export const TASK_PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
```

Update `shared/domain/entities.ts` so `Task` has:

```ts
priority: TaskPriority | null;
tagIds: number[];
```

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
```

Expose `parseTaskDetailsBody` as full replacement:

```ts
export interface TaskDetailsBody {
  title: string;
  categoryId: number;
  tagIds: number[];
  priority: TaskPriority | null;
}
```

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
expect(tableNames).toEqual(expect.arrayContaining(['tags', 'task_tags']));
const taskColumns = db.prepare('pragma table_info(tasks)').all() as Array<{name: string}>;
expect(taskColumns.map((column) => column.name)).toContain('priority');
```

Create repository tests that verify normalized uniqueness and user scoping:

```ts
it('creates and reuses sqlite tags by normalized name', () => {
  const tags = new TagSqliteRepository(db);
  const first = tags.createOrReuse({userId: 1, name: 'Foo Bar', normalizedName: 'foo bar'});
  const second = tags.createOrReuse({userId: 1, name: 'foo   bar', normalizedName: 'foo bar'});
  expect(second.id).toBe(first.id);
  expect(tags.listByUser(1)).toHaveLength(1);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- server/storage/sqlite/sqliteClient.test.ts server/storage/sqlite/repositories/tagSqliteRepository.test.ts server/storage/json/repositories/tagJsonRepository.test.ts server/storage/createRepositories.test.ts
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
npm test -- server/storage/sqlite/sqliteClient.test.ts server/storage/sqlite/repositories/tagSqliteRepository.test.ts server/storage/json/repositories/tagJsonRepository.test.ts server/storage/createRepositories.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/storage/databaseSchema.ts server/storage/json/fileStore.ts server/storage/sqlite/migrations.ts server/storage/sqlite/sqliteClient.test.ts server/storage/createRepositories.ts server/storage/createRepositories.test.ts server/modules/tags/repository.ts server/storage/json/repositories/tagJsonRepository.ts server/storage/json/repositories/tagJsonRepository.test.ts server/storage/sqlite/repositories/tagSqliteRepository.ts server/storage/sqlite/repositories/tagSqliteRepository.test.ts
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

Create route tests for `GET/POST/PATCH/DELETE /api/tags` using the existing route test pattern in `server/modules/tasks/routes.test.ts`.

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

Keep tags route registration before task routes or after task routes; both are valid because paths do not collide.

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
npm test -- server/modules/tags/tags.service.test.ts server/modules/tags/routes.test.ts server/app/registerRoutes.ts
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
- Modify: `server/modules/tasks/repository.ts`
- Modify: `server/modules/tasks/service.ts`
- Modify: `server/modules/tasks/routes.ts`
- Modify: `server/modules/tasks/tasks.service.test.ts`
- Modify: `server/modules/tasks/routes.test.ts`
- Modify: `server/storage/json/repositories/taskJsonRepository.ts`
- Modify: `server/storage/json/repositories/taskJsonRepository.test.ts`
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.ts`
- Modify: `server/storage/sqlite/repositories/taskSqliteRepository.test.ts`
- Modify: `server/storage/sqlite/repositories/rowMappers.ts`
- Modify: `server/storage/sqlite/repositories/rowMappers.test.ts`

- [ ] **Step 1: Write failing task repository tests**

Add to SQLite and JSON task repository tests:

```ts
it('creates tasks with priority and tagIds, then filters by all selected tags', () => {
  const first = tasks.create({userId: 1, categoryId: category.id, title: 'A', priority: 'P1', tagIds: [tagA.id, tagB.id]});
  tasks.create({userId: 1, categoryId: category.id, title: 'B', priority: null, tagIds: [tagA.id]});
  expect(first).toMatchObject({priority: 'P1', tagIds: [tagA.id, tagB.id]});
  expect(tasks.listByFilters({userId: 1, tagIds: [tagA.id, tagB.id]}).map((task) => task.title)).toEqual(['A']);
});

it('updates task details as a full replacement', () => {
  const updated = tasks.updateDetails({taskId: task.id, userId: 1, title: '新标题', categoryId: category.id, priority: null, tagIds: []});
  expect(updated).toMatchObject({title: '新标题', priority: null, tagIds: []});
});
```

- [ ] **Step 2: Write failing service and route tests**

Add service tests:

```ts
it('rejects details updates with tags owned by another user', () => {
  const service = buildService(repository, true, {
    getManyByIds: () => [{id: 2, userId: 2, name: '外部', createdAt: '', updatedAt: ''}],
  });
  expect(() => service.updateDetails({taskId: 1, userId: 1, title: '写方案', categoryId: 1, tagIds: [2], priority: 'P1'})).toThrow('Tag not found');
});
```

Add route tests for:

```txt
PATCH /api/tasks/:id/details
GET /api/tasks?priority=P1&tagIds=1,2
GET /api/tasks?categoryId=1abc -> 400
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm test -- server/modules/tasks/tasks.service.test.ts server/modules/tasks/routes.test.ts server/storage/sqlite/repositories/taskSqliteRepository.test.ts server/storage/json/repositories/taskJsonRepository.test.ts
```

Expected: FAIL because task metadata is not implemented.

- [ ] **Step 4: Extend repository contract**

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
- `listByFilters` applies tagIds all-of with a subquery:

```sql
id in (
  select task_id
  from task_tags
  where user_id = ? and tag_id in (:tag_id_placeholders)
  group by task_id
  having count(distinct tag_id) = ?
)
```

Build `:tag_id_placeholders` from the exact number of `filters.tagIds` entries, for example `?, ?` when `filters.tagIds.length === 2`.

- After loading task rows, batch load tag ids:

```sql
select task_id, tag_id from task_tags where user_id = ? and task_id in (:task_id_placeholders)
```

Build `:task_id_placeholders` from the loaded task row ids. When no rows are loaded, skip the tag lookup and return an empty task list.

JSON rules:

- Use one `store.update` for create/updateDetails/remove.
- Store `priority: input.priority ?? null`.
- Build `tagIdsByTaskId` once per list/read path from `data.taskTags`.

- [ ] **Step 6: Implement service and routes**

`TasksService` gets access to tags through:

```ts
private readonly tags: Pick<TagRepository, 'listByUser' | 'getById'>
```

Add helper:

```ts
private assertTagsBelongToUser(userId: number, tagIds: number[]): void {
  if (new Set(tagIds).size !== tagIds.length) throw new AppError(400, 'tagIds must be unique');
  for (const tagId of tagIds) {
    if (!this.tags.getById(tagId, userId)) throw new AppError(404, 'Tag not found');
  }
}
```

Call helper in `create` and `updateDetails`.

Add route:

```ts
router.patch('/tasks/:id/details', (req, res) => {
  const {userId} = getUserContext();
  const id = parseTaskId(req.params.id);
  const body = parseTaskDetailsBody(req.body);
  res.json(service.updateDetails({taskId: id, userId, ...body}));
});
```

- [ ] **Step 7: Run tests and verify pass**

Run:

```bash
npm test -- server/modules/tasks/schemas.test.ts server/modules/tasks/tasks.service.test.ts server/modules/tasks/routes.test.ts server/storage/sqlite/repositories/taskSqliteRepository.test.ts server/storage/json/repositories/taskJsonRepository.test.ts server/storage/sqlite/repositories/rowMappers.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/modules/tasks/repository.ts server/modules/tasks/schemas.ts server/modules/tasks/service.ts server/modules/tasks/routes.ts server/modules/tasks/schemas.test.ts server/modules/tasks/tasks.service.test.ts server/modules/tasks/routes.test.ts server/storage/json/repositories/taskJsonRepository.ts server/storage/json/repositories/taskJsonRepository.test.ts server/storage/sqlite/repositories/taskSqliteRepository.ts server/storage/sqlite/repositories/taskSqliteRepository.test.ts server/storage/sqlite/repositories/rowMappers.ts server/storage/sqlite/repositories/rowMappers.test.ts
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
it('imports tags and task tag associations', () => {
  const result = importJsonToSqlite({jsonPath, sqlitePath, force: true});
  expect(result.tags).toBe(2);
  expect(result.taskTags).toBe(1);
});

it('rolls back orphan task tag imports', () => {
  writeJson({tasks: [], tags: [{id: 1, userId: 1, name: 'A', createdAt: '', updatedAt: ''}], taskTags: [{taskId: 999, tagId: 1, userId: 1, createdAt: ''}]});
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
interface JsonTag { id: number; userId: number; name: string; createdAt: string; updatedAt: string; }
interface JsonTaskTag { taskId: number; tagId: number; userId: number; createdAt: string; }
```

Update clear order:

```ts
const BUSINESS_TABLES = [
  'weekly_reviews',
  'daily_reports',
  'task_execution_sessions',
  'task_tags',
  'tasks',
  'tags',
  'categories',
] as const;
```

Insert tags with `normalized_name` from the same normalization rule. Insert task_tags only after verifying task and tag exist for the same user. Return counts:

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
  vi.mocked(requestJson).mockResolvedValue({id: 1, userId: 1, name: 'Foo Bar', createdAt: '', updatedAt: ''});
  await tagsApi.createTag({name: 'Foo Bar'});
  expect(requestJson).toHaveBeenCalledWith('/api/tags', {
    method: 'POST',
    body: JSON.stringify({name: 'Foo Bar'}),
  });
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

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/modules/tags/api/tagsApi.test.ts src/modules/tags/controllers/tagName.test.ts src/modules/tags/components/TagCombobox.test.tsx src/modules/tasks/api/tasksApi.test.ts src/app/hooks/useAppData.test.ts
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

Update `tasksApi` to send and receive `priority`, `tagIds`, `updateTaskDetails`, `priority`, and comma-separated `tagIds`.

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
npm test -- src/modules/tags/api/tagsApi.test.ts src/modules/tags/controllers/tagName.test.ts src/modules/tags/components/TagCombobox.test.tsx src/modules/tasks/api/tasksApi.test.ts src/app/hooks/useAppData.test.ts
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
```

Create mutation tests:

```ts
it('updates task details then refreshes affected task lists', async () => {
  await result.current.updateTaskDetails({taskId: 1, title: '新标题', categoryId: 1, tagIds: [], priority: null});
  expect(tasksApi.updateTaskDetails).toHaveBeenCalledWith(1, {title: '新标题', categoryId: 1, tagIds: [], priority: null});
  expect(refreshAllTasks).toHaveBeenCalled();
  expect(loadTasksForSelectedDate).toHaveBeenCalled();
});
```

- [ ] **Step 2: Write failing component tests**

Add `TaskBasicInfoModal` tests:

```tsx
it('submits full replacement details', async () => {
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

`useTaskDraftController` owns task-library create and edit modal state only. `useTaskFilterController` extends current filter logic and uses all-of tag filtering. `useTaskMutations` calls:

```ts
tasksApi.createTask({title, categoryId, plannedDate, priority, tagIds});
tasksApi.updateTaskDetails(taskId, {title, categoryId, tagIds, priority});
tasksApi.deleteTask(taskId);
```

`useTasksPanelController` returns:

```ts
{
  createDraft,
  editDraft,
  filters,
  filteredTaskItems,
  mutations,
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

`TaskCreateForm` receives `tags`, `selectedTagIds`, `priority`, `onCreateTag`. `TaskListItem` adds:

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
it('renders category and tag sections under the organization page', () => {
  const props = buildOrganizationPanelProps({categories, tags});
  render(<OrganizationPanel {...props} />);
  expect(screen.getByRole('heading', {name: '分类'})).toBeInTheDocument();
  expect(screen.getByRole('heading', {name: '标签'})).toBeInTheDocument();
});

it('deletes a tag with copy that preserves tasks', async () => {
  const props = buildOrganizationPanelProps({tags, onDeleteTag});
  render(<OrganizationPanel {...props} />);
  await userEvent.click(screen.getByLabelText('删除标签 客户A'));
  expect(window.confirm).toHaveBeenCalledWith('删除标签「客户A」？任务会保留，只会移除这个标签关联。');
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
<CategorySection controller={categoryController} styleContext={styleContext} />
<TagsSection tags={tags} controller={tagController} />
```

`TagsSection` uses simple rows/chips, not colored category cards.

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
expect(calendarApi.createCalendarTask).toHaveBeenCalledWith(expect.objectContaining({
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

Calendar quick create calls:

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
git add src/modules/dashboard src/modules/calendar/api/calendarApi.ts src/modules/calendar/controllers/useCalendarController.ts src/modules/calendar/controllers/useCalendarController.test.ts src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx
git commit -m "feat: isolate lightweight task creation"
```

---

### Task 10: Scheduling Sidebar Filters And Grouping

**Files:**
- Create: `src/modules/calendar/controllers/schedulingSidebarGrouping.ts`
- Create: `src/modules/calendar/controllers/schedulingSidebarGrouping.test.ts`
- Modify: `src/modules/calendar/controllers/useSchedulingSidebarController.ts`
- Modify: `src/modules/calendar/controllers/useSchedulingSidebarController.test.ts`
- Modify: `src/modules/calendar/components/SchedulingSidebar.tsx`
- Modify: `src/modules/calendar/components/SchedulingSidebar.test.tsx`
- Modify: `src/modules/calendar/api/calendarApi.ts`

- [ ] **Step 1: Write failing grouping tests**

Create `schedulingSidebarGrouping.test.ts`:

```ts
it('groups tasks by priority with null last', () => {
  expect(groupSchedulingTasks(tasks, {mode: 'priority', categories, tags}).map((group) => group.label)).toEqual(['P1', 'P2', 'P3', 'P4', '无优先级']);
});

it('keeps duplicate tag-group tasks selected by one global task id set', () => {
  const groups = groupSchedulingTasks([{...task, tagIds: [1, 2]}], {mode: 'tag', categories, tags});
  expect(groups).toHaveLength(2);
  expect(uniqueSelectedTaskIds(new Set([task.id]), groups)).toEqual([task.id]);
});
```

- [ ] **Step 2: Write failing controller/component tests**

Add controller test:

```ts
await act(async () => result.current.setTagIds([1, 2]));
expect(calendarApi.getUnscheduledTasks).toHaveBeenLastCalledWith(expect.objectContaining({tagIds: [1, 2]}));
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
  return [...selectedTaskIds];
}
```

Also implement `groupByPriority`, `groupByCategory`, and `groupByTag` in the same file. Priority order is `P1/P2/P3/P4/null`. Tag grouping includes a task in every selected tag group and puts untagged tasks in `untagged`.

- [ ] **Step 5: Implement controller filters**

`useSchedulingSidebarController` adds:

```ts
tagIds: number[];
priority: 'all' | 'none' | TaskPriority;
groupMode: SchedulingGroupMode;
setTagIds: (tagIds: number[]) => void;
setPriority: (priority: 'all' | 'none' | TaskPriority) => void;
setGroupMode: (mode: SchedulingGroupMode) => void;
```

Every filter setter clears `selectedTaskIds`. API requests send one `tagIds=1,2` query string through `calendarApi`.

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
git add src/modules/calendar/controllers/schedulingSidebarGrouping.ts src/modules/calendar/controllers/schedulingSidebarGrouping.test.ts src/modules/calendar/controllers/useSchedulingSidebarController.ts src/modules/calendar/controllers/useSchedulingSidebarController.test.ts src/modules/calendar/components/SchedulingSidebar.tsx src/modules/calendar/components/SchedulingSidebar.test.tsx src/modules/calendar/api/calendarApi.ts src/modules/calendar/api/calendarApi.test.ts
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
git diff --name-only "$(cat .git/task-tags-priority-base)" HEAD
```

Expected changed paths stay within:

```txt
shared/domain/
server/modules/tags/
server/modules/tasks/
server/storage/
server/app/registerRoutes.ts
scripts/importJsonToSqlite.ts
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
git log --oneline --reverse "$(cat .git/task-tags-priority-base)..HEAD"
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

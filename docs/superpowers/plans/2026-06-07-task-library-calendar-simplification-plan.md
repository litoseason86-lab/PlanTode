# Task Library Calendar Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant embedded calendar from the task library, make task-library date scopes explicit, and keep complex scheduling in the full calendar page.

**Architecture:** Keep task-library behavior inside the tasks module. Replace the old `seven-days` date scope with a true natural-week `this-week` scope anchored to runtime today, remove task-list calendar drag coupling, and expose only a navigation callback from `TasksPanel` to `AppShell`. The calendar module remains responsible for scheduling, timeline editing, and drag-based planning.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, Tailwind CSS.

---

## File Structure

- Modify: `src/modules/tasks/controllers/useTaskFilterController.ts` - date scope type, runtime-today anchor, natural-week filtering.
- Modify: `src/modules/tasks/controllers/useTaskFilterController.test.ts` - metadata and date-scope tests.
- Modify: `src/modules/tasks/controllers/useTaskDraftController.ts` - schedule default application without clobbering touched schedule fields.
- Create: `src/modules/tasks/controllers/useTasksPanelController.test.ts` - hook tests for task-library date anchor and create defaults.
- Modify: `src/modules/tasks/controllers/useTasksPanelController.ts` - remove `selectedDate` input, wire date-scope defaults into create draft.
- Modify: `src/modules/tasks/components/TaskFilterBar.tsx` - replace date select with explicit scope buttons and remove calendar toggle props.
- Modify: `src/modules/tasks/components/TaskList.tsx` - remove calendar visibility props and pass simpler filter props.
- Modify: `src/modules/tasks/components/TaskListItem.tsx` - remove task-library drag handle and calendar helper imports.
- Modify: `src/modules/tasks/components/TasksPanel.tsx` - remove embedded calendar state/rendering and add `onOpenCalendar`.
- Modify: `src/modules/tasks/components/TasksPanel.test.tsx` - update expectations for no embedded calendar, no drag handle, scope buttons, and calendar navigation callback.
- Modify: `src/app/AppShell.tsx` - stop passing `selectedDate` to task-library controller and pass `onOpenCalendar`.
- Create: `src/app/AppShell.test.tsx` - verify task-library “go to calendar” navigation reaches full calendar.
- Modify or delete if still compiled: `src/modules/tasks/controllers/useTasksController.ts` and `src/modules/tasks/controllers/taskFilters.test.ts` - migrate legacy `seven-days` or remove dead tests.

---

### Task 0: Execution Guardrails

**Files:**
- Inspect only.

- [ ] **Step 1: Verify worktree state**

Run:

```bash
git status --short --branch
```

Expected: only planned docs commits already present, no unrelated modified files. If unrelated changes appear, inspect before editing and do not stage them.

- [ ] **Step 2: Record base SHA**

Run:

```bash
git rev-parse HEAD > .git/task-library-calendar-simplification-base
cat .git/task-library-calendar-simplification-base
```

Expected: prints one commit SHA. Use it for final diff review.

---

### Task 1: Natural Week Task-Library Date Scope

**Files:**
- Modify: `src/modules/tasks/controllers/useTaskFilterController.test.ts`
- Modify: `src/modules/tasks/controllers/useTaskFilterController.ts`

- [ ] **Step 1: Write failing date-scope tests**

Append these tests before the closing `});` of `describe('filterTasksWithMetadata', () => {` in `src/modules/tasks/controllers/useTaskFilterController.test.ts`:

```ts
  it('filters today and this-week from a runtime today anchor', () => {
    const tasks = [
      {...taskA, id: 10, title: '周一', plannedDate: '2026-06-01'},
      {...taskA, id: 11, title: '周日', plannedDate: '2026-06-07'},
      {...taskA, id: 12, title: '下周一', plannedDate: '2026-06-08'},
      {...taskA, id: 13, title: '未安排', plannedDate: undefined},
    ];

    expect(filterTasksWithMetadata(tasks, {
      category: 'all',
      status: 'all',
      dateScope: 'today',
      today: '2026-06-03',
      tagIds: [],
      priority: 'all',
      query: '',
    }).map((task) => task.title)).toEqual([]);

    expect(filterTasksWithMetadata(tasks, {
      category: 'all',
      status: 'all',
      dateScope: 'this-week',
      today: '2026-06-03',
      tagIds: [],
      priority: 'all',
      query: '',
    }).map((task) => task.title)).toEqual(['周一', '周日']);
  });

  it('keeps unscheduled tasks out of date scopes and inside unscheduled scope', () => {
    const tasks = [
      {...taskA, id: 20, title: '今日任务', plannedDate: '2026-06-03'},
      {...taskA, id: 21, title: '未安排任务', plannedDate: undefined},
    ];

    expect(filterTasksWithMetadata(tasks, {
      category: 'all',
      status: 'all',
      dateScope: 'this-week',
      today: '2026-06-03',
      tagIds: [],
      priority: 'all',
      query: '',
    }).map((task) => task.title)).toEqual(['今日任务']);

    expect(filterTasksWithMetadata(tasks, {
      category: 'all',
      status: 'all',
      dateScope: 'unscheduled',
      today: '2026-06-03',
      tagIds: [],
      priority: 'all',
      query: '',
    }).map((task) => task.title)).toEqual(['未安排任务']);
  });
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm test -- src/modules/tasks/controllers/useTaskFilterController.test.ts
```

Expected: FAIL because `dateScope: 'this-week'` and `today` are not supported yet.

- [ ] **Step 3: Implement the natural-week scope**

In `src/modules/tasks/controllers/useTaskFilterController.ts`, replace the date-scope state shape with:

```ts
import {useMemo, useState} from 'react';

import type {Task} from '../../../../shared/domain/entities';
import type {TaskPriority, TaskStatus} from '../../../../shared/domain/status';
import {addIsoDateDays, getWeekStart, toIsoDate} from '../../../../shared/lib/date';

export type TaskFilterDateScope = 'today' | 'this-week' | 'all' | 'unscheduled';
export type TaskPriorityFilter = 'all' | 'none' | TaskPriority;

export interface TaskMetadataFilterState {
  category: string;
  status: 'all' | TaskStatus;
  dateScope: TaskFilterDateScope;
  today: string;
  tagIds: number[];
  priority: TaskPriorityFilter;
  query: string;
}

function isInCurrentWeek(plannedDate: string | undefined, today: string): boolean {
  if (!plannedDate) return false;
  const weekStart = getWeekStart(today);
  const weekEnd = addIsoDateDays(weekStart, 6);
  return plannedDate >= weekStart && plannedDate <= weekEnd;
}
```

Then update the date filtering branch to:

```ts
    if (filters.dateScope === 'today' && task.plannedDate !== filters.today) {
      return false;
    }

    if (filters.dateScope === 'unscheduled' && task.plannedDate) {
      return false;
    }

    if (filters.dateScope === 'this-week' && !isInCurrentWeek(task.plannedDate, filters.today)) {
      return false;
    }
```

Update the hook signature and internal state:

```ts
export function useTaskFilterController(tasks: Task[], today = toIsoDate(new Date())) {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const [dateScope, setDateScope] = useState<TaskFilterDateScope>('today');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [priority, setPriority] = useState<TaskPriorityFilter>('all');
  const [query, setQuery] = useState('');

  const filteredTaskItems = useMemo(
    () => filterTasksWithMetadata(tasks, {
      category,
      status,
      dateScope,
      today,
      tagIds,
      priority,
      query,
    }),
    [category, dateScope, priority, query, status, tagIds, tasks, today],
  );
```

- [ ] **Step 4: Run the date-scope tests**

Run:

```bash
npm test -- src/modules/tasks/controllers/useTaskFilterController.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/modules/tasks/controllers/useTaskFilterController.ts src/modules/tasks/controllers/useTaskFilterController.test.ts
git commit -m "feat: use natural week task library scope"
```

---

### Task 2: Task Create Defaults Follow Task-Library Scope

**Files:**
- Modify: `src/modules/tasks/controllers/useTaskDraftController.ts`
- Modify: `src/modules/tasks/controllers/useTasksPanelController.ts`
- Create: `src/modules/tasks/controllers/useTasksPanelController.test.ts`

- [ ] **Step 1: Write failing hook tests**

Create `src/modules/tasks/controllers/useTasksPanelController.test.ts`:

```ts
import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {Category, Tag, Task} from '../../../../shared/domain/entities';
import {useTasksPanelController} from './useTasksPanelController';

const categories: Category[] = [{
  id: 1,
  userId: 1,
  name: '工作',
  color: '#ef4444',
  sortOrder: 1,
  createdAt: '',
  updatedAt: '',
}];

const allTasks: Task[] = [{
  id: 1,
  userId: 1,
  categoryId: 1,
  title: '今日任务',
  plannedDate: '2026-06-03',
  allDay: true,
  status: 'TODO',
  priority: null,
  tagIds: [],
  createdAt: '',
  updatedAt: '',
}];

function renderController() {
  return renderHook(() => useTasksPanelController({
    categories,
    tags: [] as Tag[],
    allTasks,
    setLoading: vi.fn(),
    showToast: vi.fn(),
    refreshTags: vi.fn().mockResolvedValue([]),
    refreshAllTasks: vi.fn().mockResolvedValue([]),
    loadTasksForSelectedDate: vi.fn().mockResolvedValue(undefined),
    stopRunningSessionForTask: vi.fn().mockResolvedValue(undefined),
    refreshReports: vi.fn().mockResolvedValue(undefined),
    updateTaskStatus: vi.fn(),
    startSession: vi.fn(),
    today: '2026-06-03',
  }));
}

describe('useTasksPanelController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the task-library today anchor for today scope and create defaults', () => {
    const {result} = renderController();

    expect(result.current.filters.dateScope).toBe('today');
    expect(result.current.filteredTaskItems.map((task) => task.title)).toEqual(['今日任务']);
    expect(result.current.createDraft.unscheduled).toBe(false);
    expect(result.current.createDraft.plannedDate).toBe('2026-06-03');
  });

  it('makes unscheduled scope default new tasks to unscheduled without clearing other filters', () => {
    const {result} = renderController();

    act(() => {
      result.current.filters.setQuery('今日');
      result.current.filters.setDateScope('unscheduled');
    });

    expect(result.current.filters.query).toBe('今日');
    expect(result.current.createDraft.unscheduled).toBe(true);
  });

  it('does not overwrite manually touched create schedule when scope changes', () => {
    const {result} = renderController();

    act(() => {
      result.current.createDraft.setPlannedDate('2026-06-06');
      result.current.filters.setDateScope('unscheduled');
    });

    expect(result.current.createDraft.plannedDate).toBe('2026-06-06');
    expect(result.current.createDraft.unscheduled).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing hook tests**

Run:

```bash
npm test -- src/modules/tasks/controllers/useTasksPanelController.test.ts
```

Expected: FAIL because `selectedDate` is still required, `today` is unsupported, and create defaults do not follow scope.

- [ ] **Step 3: Add schedule default support to the draft controller**

In `src/modules/tasks/controllers/useTaskDraftController.ts`, add this interface near the existing draft interfaces:

```ts
interface CreateScheduleDefaults {
  plannedDate: string;
  unscheduled: boolean;
}
```

Add schedule touched state after `unscheduled`:

```ts
  const [scheduleTouched, setScheduleTouched] = useState(false);
```

Replace `resetCreateDraft` with:

```ts
  function resetCreateDraft(nextCategoryId = defaultCategoryId, scheduleDefaults?: CreateScheduleDefaults) {
    setTitle('');
    setCategoryId(nextCategoryId);
    setTagIds([]);
    setPriority(null);
    if (scheduleDefaults) {
      setPlannedDate(scheduleDefaults.plannedDate);
      setUnscheduled(scheduleDefaults.unscheduled);
    }
    setScheduleTouched(false);
  }

  function setCreatePlannedDate(value: string) {
    setScheduleTouched(true);
    setPlannedDate(value);
  }

  function setCreateUnscheduled(value: boolean) {
    setScheduleTouched(true);
    setUnscheduled(value);
  }

  function applyScheduleDefaults(defaults: CreateScheduleDefaults) {
    if (scheduleTouched) return;
    setPlannedDate(defaults.plannedDate);
    setUnscheduled(defaults.unscheduled);
  }
```

Update `createDraft` return values:

```ts
      setPlannedDate: setCreatePlannedDate,
      setUnscheduled: setCreateUnscheduled,
      applyScheduleDefaults,
      reset: resetCreateDraft,
```

- [ ] **Step 4: Wire defaults in the task panel controller**

In `src/modules/tasks/controllers/useTasksPanelController.ts`, import `useEffect` and `toIsoDate`:

```ts
import {useCallback, useEffect} from 'react';
import {toIsoDate} from '../../../../shared/lib/date';
import type {TaskFilterDateScope} from './useTaskFilterController';
```

Remove `selectedDate` from `UseTasksPanelControllerInput` and add optional `today`:

```ts
  today?: string;
```

Add helper above the hook:

```ts
function buildCreateScheduleDefaults(dateScope: TaskFilterDateScope, today: string) {
  return {
    plannedDate: today,
    unscheduled: dateScope === 'unscheduled',
  };
}
```

Inside the hook:

```ts
  const taskLibraryToday = today ?? toIsoDate(new Date());
  const filterController = useTaskFilterController(allTasks, taskLibraryToday);
  const createScheduleDefaults = buildCreateScheduleDefaults(filterController.filters.dateScope, taskLibraryToday);

  useEffect(() => {
    draftController.createDraft.applyScheduleDefaults(createScheduleDefaults);
  }, [createScheduleDefaults.plannedDate, createScheduleDefaults.unscheduled, draftController.createDraft]);
```

Update successful create reset:

```ts
      draftController.createDraft.reset(categoryId, createScheduleDefaults);
```

Add `createScheduleDefaults` to the `createTask` dependency array.

- [ ] **Step 5: Run hook tests**

Run:

```bash
npm test -- src/modules/tasks/controllers/useTasksPanelController.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/modules/tasks/controllers/useTaskDraftController.ts src/modules/tasks/controllers/useTasksPanelController.ts src/modules/tasks/controllers/useTasksPanelController.test.ts
git commit -m "feat: sync task library create defaults"
```

---

### Task 3: Remove Embedded Calendar And Task-List Drag From Task Library

**Files:**
- Modify: `src/modules/tasks/components/TasksPanel.test.tsx`
- Modify: `src/modules/tasks/components/TasksPanel.tsx`
- Modify: `src/modules/tasks/components/TaskFilterBar.tsx`
- Modify: `src/modules/tasks/components/TaskList.tsx`
- Modify: `src/modules/tasks/components/TaskListItem.tsx`

- [ ] **Step 1: Rewrite component tests for the new boundary**

In `src/modules/tasks/components/TasksPanel.test.tsx`:

1. Delete the import of `readCalendarDragPayload`.
2. Delete the `vi.mock('../../calendar/components/EmbeddedCalendarPanel', () => ({ EmbeddedCalendarPanel: () => <div data-testid="embedded-calendar" /> }))` block.
3. Delete `createDragData()`.
4. Change the date scope union in `baseController()` to:

```ts
      dateScope: 'today' as 'today' | 'this-week' | 'all' | 'unscheduled',
```

5. Change `renderPanel` to accept an `onOpenCalendar` callback:

```ts
function renderPanel(controller: TestController = baseController(), onOpenCalendar = vi.fn()) {
  return render(
    <TasksPanel
      styleContext={{primary: '#fb7185', primaryLight: '#fff1f2', secondary: '#fda4af'}}
      controller={controller}
      onOpenCalendar={onOpenCalendar}
    />,
  );
}
```

6. Replace the embedded-calendar and drag tests with:

```ts
  it('does not render the embedded calendar toggle or task drag handle', () => {
    renderPanel();

    expect(screen.queryByRole('button', {name: '显示日历'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: '隐藏日历'})).not.toBeInTheDocument();
    expect(screen.queryByLabelText('拖拽任务 写周报')).not.toBeInTheDocument();
  });

  it('opens the full calendar through the navigation callback', () => {
    const onOpenCalendar = vi.fn();
    renderPanel(baseController(), onOpenCalendar);

    fireEvent.click(screen.getByRole('button', {name: '去日历安排'}));

    expect(onOpenCalendar).toHaveBeenCalledOnce();
  });

  it('switches task date scope through explicit buttons', () => {
    const controller = baseController();
    renderPanel(controller);

    fireEvent.click(screen.getByRole('button', {name: '本周'}));

    expect(controller.filters.setDateScope).toHaveBeenCalledWith('this-week');
  });
```

Update the old unscheduled filter option test to look for a button:

```ts
    expect(screen.getByRole('button', {name: '未安排'})).toBeInTheDocument();
```

- [ ] **Step 2: Run the failing component tests**

Run:

```bash
npm test -- src/modules/tasks/components/TasksPanel.test.tsx
```

Expected: FAIL because props and UI still expose embedded calendar and drag.

- [ ] **Step 3: Update `TaskFilterBar`**

In `src/modules/tasks/components/TaskFilterBar.tsx`, change the date scope type:

```ts
type TaskFilterDateScope = 'today' | 'this-week' | 'all' | 'unscheduled';
```

Remove `calendarVisible` and `onToggleCalendar` from props and destructuring.

Replace the date `<select>` block with:

```tsx
        <div className="space-y-0.5">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest pl-1">日期</p>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {[
              {value: 'today', label: '今日'},
              {value: 'this-week', label: '本周'},
              {value: 'unscheduled', label: '未安排'},
              {value: 'all', label: '全部'},
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTaskFilterDateScope(item.value as TaskFilterDateScope)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                  taskFilterDateScope === item.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
```

Remove the calendar toggle button from the right-side action group.

- [ ] **Step 4: Update `TaskList`**

In `src/modules/tasks/components/TaskList.tsx`:

1. Change `TaskFilterDateScope` to `'today' | 'this-week' | 'all' | 'unscheduled'`.
2. Remove `calendarVisible` and `onToggleCalendar` from `TaskListProps`.
3. Remove them from component destructuring.
4. Stop passing them to `TaskFilterBar`.

- [ ] **Step 5: Update `TaskListItem`**

In `src/modules/tasks/components/TaskListItem.tsx`:

1. Change the icon import to:

```ts
import {Calendar, Edit3, Trash2} from 'lucide-react';
```

2. Delete these imports:

```ts
import {writeCalendarDragPayload} from '../../calendar/controllers/schedulingDrag';
import {timedTaskDurationMinutes} from '../../calendar/controllers/weekTimelineLayout';
```

3. Delete `writeTaskListDragPayload`.
4. Delete the drag button block with `aria-label={`拖拽任务 ${task.title}`}`.

- [ ] **Step 6: Update `TasksPanel`**

In `src/modules/tasks/components/TasksPanel.tsx`:

1. Delete `useState` import.
2. Delete `EmbeddedCalendarPanel` import.
3. Add `onOpenCalendar` prop:

```ts
interface TasksPanelProps {
  styleContext: {
    primary: string;
    primaryLight: string;
    secondary: string;
  };
  controller: TasksPanelController;
  onOpenCalendar: () => void;
}
```

4. Render the header action:

```tsx
        <button
          type="button"
          onClick={onOpenCalendar}
          className="mt-3 w-fit px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          去日历安排
        </button>
```

5. Remove `calendarVisible` state.
6. Remove `calendarVisible` and `onToggleCalendar` props from `TaskList`.
7. Replace the conditional calendar layout with this single-layout structure. Keep the existing `TaskCreateForm` props unchanged inside the indicated position:

```tsx
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TaskCreateForm
          styleContext={styleContext}
          categories={controller.categories}
          tags={controller.tags}
          taskFormTitle={controller.createDraft.title}
          taskFormCategory={controller.createDraft.categoryId}
          taskFormDate={controller.createDraft.plannedDate}
          taskFormUnscheduled={controller.createDraft.unscheduled}
          selectedTagIds={controller.createDraft.tagIds}
          priority={controller.createDraft.priority}
          setTaskFormTitle={controller.createDraft.setTitle}
          setTaskFormCategory={controller.createDraft.setCategoryId}
          setTaskFormDate={controller.createDraft.setPlannedDate}
          setTaskFormUnscheduled={controller.createDraft.setUnscheduled}
          onTagIdsChange={controller.createDraft.setTagIds}
          onPriorityChange={controller.createDraft.setPriority}
          onCreateTag={controller.tagActions.createTag}
          handleCreateTask={controller.mutations.createTask}
        />
        {taskList}
      </div>
```

- [ ] **Step 7: Run component tests**

Run:

```bash
npm test -- src/modules/tasks/components/TasksPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/modules/tasks/components/TasksPanel.tsx src/modules/tasks/components/TaskFilterBar.tsx src/modules/tasks/components/TaskList.tsx src/modules/tasks/components/TaskListItem.tsx src/modules/tasks/components/TasksPanel.test.tsx
git commit -m "feat: simplify task library surface"
```

---

### Task 4: AppShell Calendar Navigation

**Files:**
- Modify: `src/app/AppShell.tsx`
- Create: `src/app/AppShell.test.tsx`

- [ ] **Step 1: Write failing AppShell navigation test**

Create `src/app/AppShell.test.tsx`:

```tsx
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import AppShell from './AppShell';
import {tasksApi} from '../modules/tasks/api/tasksApi';
import {categoriesApi} from '../modules/categories/api/categoriesApi';
import {tagsApi} from '../modules/tags/api/tagsApi';
import {focusApi} from '../modules/focus/api/focusApi';
import {calendarApi} from '../modules/calendar/api/calendarApi';

vi.mock('../modules/tasks/api/tasksApi', () => ({
  tasksApi: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    updateTaskDetails: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

vi.mock('../modules/categories/api/categoriesApi', () => ({
  categoriesApi: {
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

vi.mock('../modules/tags/api/tagsApi', () => ({
  tagsApi: {
    listTags: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}));

vi.mock('../modules/focus/api/focusApi', () => ({
  focusApi: {
    getRunningSession: vi.fn(),
    getSessions: vi.fn(),
    startSession: vi.fn(),
    stopSession: vi.fn(),
    pauseSession: vi.fn(),
    resumeSession: vi.fn(),
  },
}));

vi.mock('../modules/calendar/api/calendarApi', () => ({
  calendarApi: {
    getCalendarTasks: vi.fn(),
    getFocusSessions: vi.fn(),
    getUnscheduledTasks: vi.fn(),
    getAllDayWithoutTimeTasks: vi.fn(),
    updateTaskSchedule: vi.fn(),
    batchScheduleDate: vi.fn(),
    batchUnschedule: vi.fn(),
    createCalendarTask: vi.fn(),
  },
}));

describe('AppShell task library calendar navigation', () => {
  it('opens the full calendar from the task library CTA', async () => {
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([{
      id: 1,
      userId: 1,
      name: '工作',
      color: '#ef4444',
      sortOrder: 1,
      createdAt: '',
      updatedAt: '',
    }]);
    vi.mocked(tagsApi.listTags).mockResolvedValue([]);
    vi.mocked(tasksApi.getTasks).mockResolvedValue([{
      id: 1,
      userId: 1,
      categoryId: 1,
      title: '写周报',
      plannedDate: '2026-06-03',
      allDay: true,
      status: 'TODO',
      priority: null,
      tagIds: [],
      createdAt: '',
      updatedAt: '',
    }]);
    vi.mocked(focusApi.getRunningSession).mockResolvedValue(null);
    vi.mocked(focusApi.getSessions).mockResolvedValue([]);
    vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
    vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);
    vi.mocked(calendarApi.getUnscheduledTasks).mockResolvedValue([]);
    vi.mocked(calendarApi.getAllDayWithoutTimeTasks).mockResolvedValue([]);

    render(<AppShell />);

    fireEvent.click(screen.getByRole('button', {name: '任务库'}));
    fireEvent.click(await screen.findByRole('button', {name: '去日历安排'}));

    await waitFor(() => expect(screen.getByRole('heading', {name: '日历'})).toBeInTheDocument());
    expect(screen.getByText('安排任务')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm test -- src/app/AppShell.test.tsx
```

Expected: FAIL because `TasksPanel` requires `onOpenCalendar` but `AppShell` has not passed it yet.

- [ ] **Step 3: Wire AppShell**

In `src/app/AppShell.tsx`, remove `selectedDate` from the task panel controller input:

```ts
  const tasksPanelController = useTasksPanelController({
    categories,
    tags,
    allTasks,
    setLoading,
```

Then pass the calendar navigation callback:

```tsx
          <TasksPanel
            styleContext={{primary: styleContext.primary, primaryLight: styleContext.primaryLight, secondary: styleContext.secondary}}
            controller={tasksPanelController}
            onOpenCalendar={() => setActiveTab('calendar')}
          />
```

- [ ] **Step 4: Run AppShell test**

Run:

```bash
npm test -- src/app/AppShell.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/AppShell.tsx src/app/AppShell.test.tsx
git commit -m "feat: route task library to calendar"
```

---

### Task 5: Legacy Scope Migration

**Files:**
- Modify: `src/modules/tasks/controllers/useTasksController.ts`
- Modify: `src/modules/tasks/controllers/taskFilters.test.ts`
- Search: all `seven-days` and `未来7天` references.

- [ ] **Step 1: Update legacy tests**

In `src/modules/tasks/controllers/taskFilters.test.ts`, replace `seven-days` cases with `this-week` natural-week cases:

```ts
    expect(filterTasks([unscheduled, scheduled], {
      category: 'all',
      status: 'all',
      dateScope: 'this-week',
      today: '2026-06-05',
    }).map((task) => task.title)).not.toContain('未安排');
```

Add a natural-week boundary assertion:

```ts
  it('filters this-week by natural week boundaries', () => {
    expect(filterTasks([
      {...baseTask, id: 1, plannedDate: '2026-06-01', title: '周一'},
      {...baseTask, id: 2, plannedDate: '2026-06-07', title: '周日'},
      {...baseTask, id: 3, plannedDate: '2026-06-08', title: '下周一'},
    ], {
      category: 'all',
      status: 'all',
      dateScope: 'this-week',
      today: '2026-06-03',
    }).map((task) => task.title)).toEqual(['周一', '周日']);
  });
```

- [ ] **Step 2: Run failing legacy tests**

Run:

```bash
npm test -- src/modules/tasks/controllers/taskFilters.test.ts
```

Expected: FAIL because `useTasksController` still uses `selectedDate` and `seven-days`.

- [ ] **Step 3: Migrate legacy filter implementation**

In `src/modules/tasks/controllers/useTasksController.ts`, update imports:

```ts
import {addIsoDateDays, getWeekStart} from '../../../../shared/lib/date';
```

Update the type:

```ts
export interface TaskFilterState {
  category: string;
  status: 'all' | TaskStatus;
  dateScope: 'today' | 'this-week' | 'all' | 'unscheduled';
  today: string;
}
```

Update date branches:

```ts
    if (filters.dateScope === 'today') {
      return task.plannedDate === filters.today;
    }

    if (filters.dateScope === 'unscheduled') {
      return !task.plannedDate;
    }

    if (filters.dateScope === 'this-week') {
      if (!task.plannedDate) {
        return false;
      }
      const weekStart = getWeekStart(filters.today);
      const weekEnd = addIsoDateDays(weekStart, 6);
      return task.plannedDate >= weekStart && task.plannedDate <= weekEnd;
    }
```

- [ ] **Step 4: Remove stale references**

Run:

```bash
rg -n "seven-days|未来7天|selectedDate:" src/modules/tasks
```

Expected: no `seven-days` or `未来7天` references remain in task-library code. If `selectedDate:` remains only in unrelated old `useTaskActions` tests, inspect whether the path is still used. Do not remove active behavior outside this feature.

- [ ] **Step 5: Run legacy tests**

Run:

```bash
npm test -- src/modules/tasks/controllers/taskFilters.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/modules/tasks/controllers/useTasksController.ts src/modules/tasks/controllers/taskFilters.test.ts
git commit -m "refactor: migrate legacy task date scope"
```

---

### Task 6: Final Verification And Scope Audit

**Files:**
- Inspect all changed files.

- [ ] **Step 1: Run targeted task-library tests**

Run:

```bash
npm test -- src/modules/tasks/controllers/useTaskFilterController.test.ts src/modules/tasks/controllers/useTasksPanelController.test.ts src/modules/tasks/controllers/taskFilters.test.ts src/modules/tasks/components/TasksPanel.test.tsx src/app/AppShell.test.tsx
```

Expected: all targeted tests PASS.

- [ ] **Step 2: Run full suite**

Run:

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Check whitespace**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 6: Scope audit**

Run:

```bash
BASE_SHA=$(cat .git/task-library-calendar-simplification-base)
git diff --name-only "$BASE_SHA"..HEAD
rg -n "EmbeddedCalendarPanel|calendarVisible|onToggleCalendar|拖拽任务|seven-days|未来7天" src/modules/tasks src/app
```

Expected:

- Diff only includes task-library, AppShell, tests, and this plan/spec work.
- `EmbeddedCalendarPanel` may still exist in `src/modules/calendar`, but no task-library code imports or renders it.
- No `calendarVisible`, `onToggleCalendar`, task-library drag handle, `seven-days`, or `未来7天` references remain in task-library code.

- [ ] **Step 7: Final commit if verification changed files**

If verification required any fixes, stage the exact files reported by `git status --short` and commit them. For example, if only `src/modules/tasks/components/TaskFilterBar.tsx` changed, run:

```bash
git add src/modules/tasks/components/TaskFilterBar.tsx
git commit -m "fix: complete task library simplification"
```

If no files changed, do not create an empty commit.

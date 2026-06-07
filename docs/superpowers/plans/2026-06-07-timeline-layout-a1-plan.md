# Today Timeline Layout A1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 今日执行页 Layout A1 execution flow: left-side time rail, global Gap inference, timed task flow, untimed task queue, and preserved execution actions.

**Architecture:** Keep A1 inside the dashboard module. Add a pure dashboard helper for interval union/complement and task partitioning, expose derived flow data from `useDashboardController`, and split `DashboardPanel` into focused presentational components. Do not modify `CalendarPanel`, `WeekTimelineView`, task-library metadata editing, or today quick-create metadata semantics.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Tailwind CSS.

---

## File Structure

- Create: `src/modules/dashboard/controllers/todayTimelineFlow.ts` - pure Gap inference, visible timed interval extraction, and today task partitioning.
- Create: `src/modules/dashboard/controllers/todayTimelineFlow.test.ts` - four rehearsal scenarios plus edge cases.
- Modify: `src/modules/dashboard/controllers/useDashboardController.ts` - expose `todayTimelineFlow` and `todayTaskQueue`.
- Modify: `src/modules/dashboard/controllers/useDashboardController.test.ts` - controller derivation tests.
- Create: `src/modules/dashboard/components/TodaySummaryHeader.tsx` - date, counts, focus chart/summary.
- Create: `src/modules/dashboard/components/TodayQuickCreateBar.tsx` - title/category quick create only.
- Create: `src/modules/dashboard/components/TodayFocusFeedback.tsx` - stopped-session follow-up panel.
- Create: `src/modules/dashboard/components/TodayCurrentAction.tsx` - running task primary stop surface.
- Create: `src/modules/dashboard/components/TodayTimelineFlow.tsx` - timed task and Gap flow renderer.
- Create: `src/modules/dashboard/components/TodayTimelineTaskNode.tsx` - one task node with execution actions.
- Create: `src/modules/dashboard/components/TodayTimelineGapNode.tsx` - one stable Gap node.
- Create: `src/modules/dashboard/components/TodayTaskQueue.tsx` - untimed/all-day/invalid-time task queue.
- Modify: `src/modules/dashboard/components/DashboardPanel.tsx` - orchestrate new components only.
- Modify: `src/modules/dashboard/components/DashboardPanel.test.tsx` - component regression tests for preserved actions and Gap rendering.

Do not edit `src/modules/calendar/controllers/weekTimelineLayout.ts`, `src/modules/calendar/controllers/weekTimelineLayout.test.ts`, or `src/modules/calendar/components/WeekTimelineView.tsx` for this feature. Existing dirty changes in those files are outside this plan.

---

### Task 0: Guardrails

**Files:**
- Inspect only.

- [ ] **Step 1: Verify worktree state before editing**

Run:

```bash
git status --short
```

Expected: any pre-existing dirty files are noted before edits. If `src/modules/calendar/controllers/weekTimelineLayout.test.ts` or `.claude/` appears, leave them untouched.

- [ ] **Step 2: Record baseline**

Run:

```bash
git rev-parse HEAD
```

Expected: one commit SHA. Use it for final diff review.

---

### Task 1: Pure Today Timeline Flow Helper

**Files:**
- Create: `src/modules/dashboard/controllers/todayTimelineFlow.ts`
- Create: `src/modules/dashboard/controllers/todayTimelineFlow.test.ts`

- [ ] **Step 1: Write failing four-scenario tests**

Create `src/modules/dashboard/controllers/todayTimelineFlow.test.ts`:

```typescript
import {describe, expect, it} from 'vitest';

import {
  buildTodayTimelineFlow,
  partitionTodayExecutionTasks,
} from './todayTimelineFlow';

function timedTask(id: number, start: string, end: string) {
  return {
    id,
    userId: 1,
    categoryId: 1,
    title: `任务 ${id}`,
    plannedDate: '2026-06-07',
    startAt: `2026-06-07T${start}:00.000`,
    endAt: `2026-06-07T${end}:00.000`,
    allDay: false,
    status: 'TODO' as const,
    priority: null,
    tagIds: [] as number[],
    createdAt: '',
    updatedAt: '',
  };
}

describe('todayTimelineFlow', () => {
  it('returns empty flow when no timed tasks are provided', () => {
    expect(buildTodayTimelineFlow({
      date: '2026-06-07',
      tasks: [],
    })).toEqual([]);
  });

  it('standard flow inserts one compact-boundary gap', () => {
    const result = buildTodayTimelineFlow({
      date: '2026-06-07',
      tasks: [
        timedTask(1, '09:00', '10:30'),
        timedTask(2, '11:30', '12:30'),
      ],
    });

    expect(result.map((item) => item.type)).toEqual(['task', 'gap', 'task']);
    expect(result[1]).toEqual({
      type: 'gap',
      startMinutes: 630,
      endMinutes: 690,
      durationMinutes: 60,
    });
  });

  it('overlap flow removes local fake idle gaps', () => {
    const result = buildTodayTimelineFlow({
      date: '2026-06-07',
      tasks: [
        timedTask(1, '09:00', '10:30'),
        timedTask(2, '10:00', '11:30'),
      ],
    });

    expect(result.some((item) => item.type === 'gap')).toBe(false);
    expect(result.map((item) => item.type)).toEqual(['task', 'task']);
  });

  it('contained flow has no gap when the large interval covers the small one', () => {
    const result = buildTodayTimelineFlow({
      date: '2026-06-07',
      tasks: [
        timedTask(1, '09:00', '12:00'),
        timedTask(2, '10:00', '11:00'),
      ],
    });

    expect(result.some((item) => item.type === 'gap')).toBe(false);
  });

  it('fragmented flow extracts multiple independent gaps without edge gaps', () => {
    const result = buildTodayTimelineFlow({
      date: '2026-06-07',
      tasks: [
        timedTask(1, '09:00', '10:00'),
        timedTask(2, '10:30', '11:15'),
        timedTask(3, '12:00', '13:00'),
      ],
    });

    expect(result.map((item) => item.type)).toEqual(['task', 'gap', 'task', 'gap', 'task']);
    expect(result.filter((item) => item.type === 'gap')).toEqual([
      {type: 'gap', startMinutes: 600, endMinutes: 630, durationMinutes: 30},
      {type: 'gap', startMinutes: 675, endMinutes: 720, durationMinutes: 45},
    ]);
  });

  it('does not create gaps shorter than fifteen minutes', () => {
    const result = buildTodayTimelineFlow({
      date: '2026-06-07',
      tasks: [
        timedTask(1, '09:00', '10:00'),
        timedTask(2, '10:10', '11:00'),
      ],
    });

    expect(result.some((item) => item.type === 'gap')).toBe(false);
  });

  it('does not create zero-minute gaps for touching intervals', () => {
    const result = buildTodayTimelineFlow({
      date: '2026-06-07',
      tasks: [
        timedTask(1, '09:00', '10:00'),
        timedTask(2, '10:00', '11:00'),
      ],
    });

    expect(result.some((item) => item.type === 'gap')).toBe(false);
    expect(result.map((item) => item.type)).toEqual(['task', 'task']);
  });

  it('ignores invalid timed intervals', () => {
    const invalid = {
      ...timedTask(1, '09:00', '10:00'),
      startAt: '2026-06-07T11:00:00.000',
      endAt: '2026-06-07T10:00:00.000',
    };

    expect(buildTodayTimelineFlow({
      date: '2026-06-07',
      tasks: [invalid],
    })).toEqual([]);
  });

  it('clips cross-day tasks to the selected date before building flow', () => {
    const result = buildTodayTimelineFlow({
      date: '2026-06-07',
      tasks: [
        {
          ...timedTask(1, '09:00', '10:00'),
          startAt: '2026-06-06T23:00:00.000',
          endAt: '2026-06-07T01:00:00.000',
        },
        timedTask(2, '02:00', '03:00'),
      ],
    });

    expect(result).toEqual([
      {type: 'task', taskId: 1, startMinutes: 0, endMinutes: 60, durationMinutes: 60},
      {type: 'gap', startMinutes: 60, endMinutes: 120, durationMinutes: 60},
      {type: 'task', taskId: 2, startMinutes: 120, endMinutes: 180, durationMinutes: 60},
    ]);
  });

  it('partitions untimed and all-day tasks into the queue', () => {
    const allDay = {...timedTask(3, '09:00', '10:00'), allDay: true, startAt: undefined, endAt: undefined};
    const untimed = {...timedTask(4, '09:00', '10:00'), startAt: undefined, endAt: undefined};
    const partition = partitionTodayExecutionTasks({
      date: '2026-06-07',
      tasks: [timedTask(1, '09:00', '10:00'), allDay, untimed],
    });

    expect(partition.timelineFlow.map((item) => item.type)).toEqual(['task']);
    expect(partition.taskQueue.map((task) => task.id)).toEqual([3, 4]);
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- src/modules/dashboard/controllers/todayTimelineFlow.test.ts
```

Expected: FAIL because `todayTimelineFlow.ts` does not exist.

- [ ] **Step 3: Implement pure helper**

Create `src/modules/dashboard/controllers/todayTimelineFlow.ts`:

```typescript
import type {Task} from '../../../../shared/domain/entities';
import type {TaskStatus} from '../../../../shared/domain/status';
import {addIsoDateDays} from '../../../../shared/lib/date';

const MINUTES_PER_HOUR = 60;
const MIN_GAP_MINUTES = 15;

export interface TodayTimedTaskInput {
  id: number;
  title: string;
  startAt?: string;
  endAt?: string;
  allDay: boolean;
  status: TaskStatus;
}

export interface TodayTimelineTaskItem {
  type: 'task';
  taskId: number;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

export interface TodayTimelineGapItem {
  type: 'gap';
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

export type TodayTimelineFlowItem = TodayTimelineTaskItem | TodayTimelineGapItem;

interface TimedInterval {
  task: Task;
  startMinutes: number;
  endMinutes: number;
}

function minutesFromLocalDateTime(value: string): number {
  return Number(value.slice(11, 13)) * MINUTES_PER_HOUR + Number(value.slice(14, 16));
}

function localDateFromDateTime(value: string): string {
  return value.slice(0, 10);
}

function dateStartMinuteValue(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 60_000);
}

function localDateTimeMinuteValue(value: string): number {
  return dateStartMinuteValue(localDateFromDateTime(value)) + minutesFromLocalDateTime(value);
}

function visibleTimedIntervalForDate(task: Task, date: string): TimedInterval | null {
  if (task.allDay || !task.startAt || !task.endAt) {
    return null;
  }

  const startValue = localDateTimeMinuteValue(task.startAt);
  const endValue = localDateTimeMinuteValue(task.endAt);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || endValue <= startValue) {
    return null;
  }

  const dayStart = dateStartMinuteValue(date);
  const dayEnd = dateStartMinuteValue(addIsoDateDays(date, 1));
  const visibleStart = Math.max(startValue, dayStart);
  const visibleEnd = Math.min(endValue, dayEnd);
  if (visibleEnd <= visibleStart) {
    return null;
  }

  return {
    task,
    startMinutes: visibleStart - dayStart,
    endMinutes: visibleEnd - dayStart,
  };
}

export function buildTodayTimelineFlow(input: {
  date: string;
  tasks: Task[];
}): TodayTimelineFlowItem[] {
  const intervals = input.tasks
    .map((task) => visibleTimedIntervalForDate(task, input.date))
    .filter((interval): interval is TimedInterval => Boolean(interval))
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes || a.task.id - b.task.id);

  if (intervals.length === 0) {
    return [];
  }

  const busyIntervals: Array<{startMinutes: number; endMinutes: number}> = [];
  for (const interval of intervals) {
    const last = busyIntervals[busyIntervals.length - 1];
    if (!last || interval.startMinutes > last.endMinutes) {
      busyIntervals.push({startMinutes: interval.startMinutes, endMinutes: interval.endMinutes});
    } else {
      last.endMinutes = Math.max(last.endMinutes, interval.endMinutes);
    }
  }

  const gaps: TodayTimelineGapItem[] = [];
  for (let index = 0; index < busyIntervals.length - 1; index += 1) {
    const startMinutes = busyIntervals[index].endMinutes;
    const endMinutes = busyIntervals[index + 1].startMinutes;
    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes >= MIN_GAP_MINUTES) {
      gaps.push({type: 'gap', startMinutes, endMinutes, durationMinutes});
    }
  }

  const taskItems: TodayTimelineTaskItem[] = intervals.map((interval) => ({
    type: 'task',
    taskId: interval.task.id,
    startMinutes: interval.startMinutes,
    endMinutes: interval.endMinutes,
    durationMinutes: interval.endMinutes - interval.startMinutes,
  }));

  return [...taskItems, ...gaps].sort((a, b) => {
    const aStart = a.startMinutes;
    const bStart = b.startMinutes;
    if (aStart !== bStart) return aStart - bStart;
    if (a.type !== b.type) return a.type === 'task' ? -1 : 1;
    if (a.type === 'task' && b.type === 'task') {
      if (a.endMinutes !== b.endMinutes) return a.endMinutes - b.endMinutes;
      return a.taskId - b.taskId;
    }
    return a.endMinutes - b.endMinutes;
  });
}

export function partitionTodayExecutionTasks(input: {
  date: string;
  tasks: Task[];
}) {
  const timelineFlow = buildTodayTimelineFlow(input);
  const timelineTaskIds = new Set(
    timelineFlow
      .filter((item): item is TodayTimelineTaskItem => item.type === 'task')
      .map((item) => item.taskId),
  );

  return {
    timelineFlow,
    taskQueue: input.tasks.filter((task) => !timelineTaskIds.has(task.id)),
  };
}
```

- [ ] **Step 4: Run helper tests and verify GREEN**

Run:

```bash
npm test -- src/modules/dashboard/controllers/todayTimelineFlow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit helper**

Run:

```bash
git add src/modules/dashboard/controllers/todayTimelineFlow.ts src/modules/dashboard/controllers/todayTimelineFlow.test.ts
git commit -m "feat: add today timeline gap flow"
```

---

### Task 2: Dashboard Controller Derivations

**Files:**
- Modify: `src/modules/dashboard/controllers/useDashboardController.ts`
- Modify: `src/modules/dashboard/controllers/useDashboardController.test.ts`

- [ ] **Step 1: Write failing controller tests**

Append to `src/modules/dashboard/controllers/useDashboardController.test.ts`:

```typescript
import {renderHook} from '@testing-library/react';

import {useDashboardController} from './useDashboardController';

it('exposes today timeline flow and untimed queue', () => {
  const timedTask = {
    id: 10,
    userId: 1,
    categoryId: 1,
    title: '定时任务',
    plannedDate: '2026-06-07',
    startAt: '2026-06-07T09:00:00.000',
    endAt: '2026-06-07T10:00:00.000',
    allDay: false,
    status: 'TODO' as const,
    priority: null,
    tagIds: [] as number[],
    createdAt: '',
    updatedAt: '',
  };
  const untimedTask = {...timedTask, id: 11, title: '无时间任务', startAt: undefined, endAt: undefined};
  const {result} = renderHook(() => useDashboardController({
    categories,
    tasks: [timedTask, untimedTask],
    allTasks: [timedTask, untimedTask],
    selectedDateSessions: [],
    runningSession: null,
    focusTimeElapsed: 0,
    selectedDate: '2026-06-07',
  }));

  expect(result.current.todayTimelineFlow.map((item) => item.type)).toEqual(['task']);
  expect(result.current.todayTaskQueue.map((task) => task.id)).toEqual([11]);
});
```

- [ ] **Step 2: Run controller tests and verify RED**

Run:

```bash
npm test -- src/modules/dashboard/controllers/useDashboardController.test.ts
```

Expected: FAIL because `selectedDate`, `todayTimelineFlow`, and `todayTaskQueue` are not supported.

- [ ] **Step 3: Wire controller derivations**

Modify `src/modules/dashboard/controllers/useDashboardController.ts`:

```typescript
import {partitionTodayExecutionTasks} from './todayTimelineFlow';
```

Extend `DashboardControllerArgs`:

```typescript
interface DashboardControllerArgs extends TodayCategoryFocusArgs {
  runningSession: TaskExecutionSession | null;
  focusTimeElapsed: number;
  selectedDate: string;
}
```

Inside `useDashboardController`:

```typescript
const todayPartition = useMemo(
  () => partitionTodayExecutionTasks({date: selectedDate, tasks}),
  [selectedDate, tasks],
);
```

Return:

```typescript
return {
  todayCategoryFocusData,
  getTaskFocusMinutes: getTaskFocusMinutesForTask,
  todayTimelineFlow: todayPartition.timelineFlow,
  todayTaskQueue: todayPartition.taskQueue,
};
```

Update the `AppShell` call site to pass `selectedDate`.

- [ ] **Step 4: Run controller tests and verify GREEN**

Run:

```bash
npm test -- src/modules/dashboard/controllers/useDashboardController.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit controller derivation**

Run:

```bash
git add src/modules/dashboard/controllers/useDashboardController.ts src/modules/dashboard/controllers/useDashboardController.test.ts src/app/AppShell.tsx
git commit -m "feat: expose today execution timeline flow"
```

---

### Task 3: Component Split And A1 Rendering

**Files:**
- Create: dashboard components listed in File Structure.
- Modify: `src/modules/dashboard/components/DashboardPanel.tsx`
- Modify: `src/modules/dashboard/components/DashboardPanel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Extend `DashboardPanel.test.tsx` with:

```typescript
it('renders gap nodes with stable accessible labels', () => {
  render(
    <DashboardPanel
      styleContext={{primary: '#fb7185', primaryLight: '#fff1f2', secondary: '#fda4af'}}
      categories={categories}
      tasks={tasks}
      selectedDate="2026-06-05"
      setSelectedDate={vi.fn()}
      todayCategoryFocusData={[]}
      todayTimelineFlow={[
        {type: 'task', taskId: 1, startMinutes: 540, endMinutes: 600, durationMinutes: 60},
        {type: 'gap', startMinutes: 600, endMinutes: 630, durationMinutes: 30},
      ]}
      todayTaskQueue={[]}
      todayQuickCreate={{
        title: '',
        categoryId: 1,
        isCreating: false,
        setTitle: vi.fn(),
        setCategoryId: vi.fn(),
        createTodayTask: vi.fn(),
      }}
      handleUpdateTaskStatus={vi.fn()}
      handleStartSession={vi.fn()}
      handleStopSession={vi.fn()}
      runningSession={null}
      lastFinishedSessionTask={null}
      setLastFinishedSessionTask={vi.fn()}
      getTaskFocusMinutes={() => 0}
    />,
  );

  expect(screen.getByLabelText('空闲 30 分钟 10:00-10:30')).toBeInTheDocument();
});

it('keeps the current action visible for a running session', () => {
  renderDashboardWithRunningSession();

  expect(screen.getAllByRole('button', {name: '停止'})).toHaveLength(1);
  expect(screen.getByText('专注进行中')).toBeInTheDocument();
});

it('keeps focus feedback actions visible after a session stops', () => {
  const handleUpdateTaskStatus = vi.fn();
  const setLastFinishedSessionTask = vi.fn();
  renderDashboard({
    lastFinishedSessionTask: tasks[0],
    handleUpdateTaskStatus,
    setLastFinishedSessionTask,
  });

  fireEvent.click(screen.getByRole('button', {name: '✓ 完美标记'}));
  expect(handleUpdateTaskStatus).toHaveBeenCalledWith(1, 'DONE');
  expect(setLastFinishedSessionTask).toHaveBeenCalledWith(null);

  fireEvent.click(screen.getByRole('button', {name: '稍后处理'}));
  expect(setLastFinishedSessionTask).toHaveBeenCalledWith(null);
});

it('renders the existing empty state when there are no tasks', () => {
  renderDashboard({tasks: [], todayTimelineFlow: [], todayTaskQueue: []});

  expect(screen.getByText('今日暂无行动计划')).toBeInTheDocument();
});

it('renders untimed tasks in the queue without an empty timeline', () => {
  renderDashboard({
    tasks,
    todayTimelineFlow: [],
    todayTaskQueue: tasks,
  });

  expect(screen.getByText('今日待执行队列')).toBeInTheDocument();
  expect(screen.queryByText(/空闲 \d+ 分钟/)).not.toBeInTheDocument();
});

it('renders a timed-only flow without showing the untimed queue empty state', () => {
  renderDashboard({
    tasks,
    todayTimelineFlow: [
      {type: 'task', taskId: 1, startMinutes: 540, endMinutes: 600, durationMinutes: 60},
    ],
    todayTaskQueue: [],
  });

  expect(screen.getByText('写方案')).toBeInTheDocument();
  expect(screen.queryByText('今日待执行队列')).not.toBeInTheDocument();
  expect(screen.queryByText('今日暂无行动计划')).not.toBeInTheDocument();
});

it('renders multiple gap nodes from the fragmented rehearsal scenario', () => {
  renderDashboard({
    todayTimelineFlow: [
      {type: 'task', taskId: 1, startMinutes: 540, endMinutes: 600, durationMinutes: 60},
      {type: 'gap', startMinutes: 600, endMinutes: 630, durationMinutes: 30},
      {type: 'task', taskId: 2, startMinutes: 630, endMinutes: 675, durationMinutes: 45},
      {type: 'gap', startMinutes: 675, endMinutes: 720, durationMinutes: 45},
      {type: 'task', taskId: 3, startMinutes: 720, endMinutes: 780, durationMinutes: 60},
    ],
  });

  expect(screen.getByLabelText('空闲 30 分钟 10:00-10:30')).toBeInTheDocument();
  expect(screen.getByLabelText('空闲 45 分钟 11:15-12:00')).toBeInTheDocument();
});
```

Define `renderDashboard()` and `renderDashboardWithRunningSession()` helpers in the test file so each test can override only the relevant props. `renderDashboard()` must default to three task fixtures with ids `1`, `2`, and `3`, so multi-Gap flow items always resolve to real tasks. `renderDashboardWithRunningSession()` must use task id `1` and a `runningSession` with `taskId: 1`.

- [ ] **Step 2: Run component tests and verify RED**

Run:

```bash
npm test -- src/modules/dashboard/components/DashboardPanel.test.tsx
```

Expected: FAIL because `DashboardPanel` does not accept `todayTimelineFlow` or render Gap nodes/current action.

- [ ] **Step 3: Extract presentational components**

Create the listed component files. Move existing JSX out of `DashboardPanel.tsx` without changing behavior first:

```txt
TodaySummaryHeader.tsx      -> old header summary/chart/date/counts
TodayQuickCreateBar.tsx     -> old quick-create input/select/button
TodayFocusFeedback.tsx      -> old lastFinishedSessionTask panel
TodayCurrentAction.tsx      -> running task primary surface with the only main stop button
TodayTimelineTaskNode.tsx   -> old task node card and action buttons
TodayTaskQueue.tsx          -> queue wrapper for untimed/all-day tasks
```

Each component receives data and callbacks through props only. None imports API modules.

- [ ] **Step 4: Add current action renderer**

Create `TodayCurrentAction.tsx`:

```tsx
import type {Task, TaskExecutionSession} from '../../../../shared/domain/entities';

interface TodayCurrentActionProps {
  task: Task;
  runningSession: TaskExecutionSession;
  focusMinutes: number;
  primaryColor: string;
  onStopSession: () => void;
}

export function TodayCurrentAction({task, focusMinutes, primaryColor, onStopSession}: TodayCurrentActionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="当前行动">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400">当前行动</p>
          <h3 className="truncate text-sm font-extrabold text-slate-800">{task.title}</h3>
          <p className="text-[11px] font-semibold text-slate-500">专注进行中 · {focusMinutes} 分钟</p>
        </div>
        <button
          type="button"
          onClick={onStopSession}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
          style={{boxShadow: `0 0 0 1px ${primaryColor}22`}}
        >
          停止
        </button>
      </div>
    </section>
  );
}
```

`DashboardPanel` renders this section above the timeline when `runningSession` matches a task in `tasks`.

- [ ] **Step 5: Add Gap renderer**

Create `TodayTimelineGapNode.tsx`:

```tsx
interface TodayTimelineGapNodeProps {
  startLabel: string;
  endLabel: string;
  durationMinutes: number;
}

export function TodayTimelineGapNode({startLabel, endLabel, durationMinutes}: TodayTimelineGapNodeProps) {
  const label = `空闲 ${durationMinutes} 分钟 ${startLabel}-${endLabel}`;
  return (
    <div className="flex items-center gap-3 py-2 text-slate-400" aria-label={label}>
      <div className="w-[72px] shrink-0 text-right text-[11px] font-semibold">{startLabel}</div>
      <div className="h-8 border-l-2 border-dashed border-slate-300" />
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] italic">
        {label}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add flow renderer**

Create `TodayTimelineFlow.tsx` that maps `todayTimelineFlow`:

```tsx
function formatTimelineClock(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
```

For `type: 'task'`, find the task by `taskId` and render `TodayTimelineTaskNode`. For `type: 'gap'`, render `TodayTimelineGapNode` with formatted start/end labels.

If the item task is the active running task, `TodayTimelineTaskNode` must show the running state but must not render a primary `停止` button. The only primary stop button lives in `TodayCurrentAction`.

- [ ] **Step 7: Wire `DashboardPanel` props**

Extend `DashboardPanelProps`:

```typescript
todayTimelineFlow: TodayTimelineFlowItem[];
todayTaskQueue: Task[];
```

Use `TodayTimelineFlow` for timed tasks and `TodayTaskQueue` for untimed/all-day tasks. Preserve existing quick-create, feedback, focus, completion, postpone, and reset callbacks.

In `src/app/AppShell.tsx`, update the `<DashboardPanel />` call:

```tsx
todayTimelineFlow={dashboardController.todayTimelineFlow}
todayTaskQueue={dashboardController.todayTaskQueue}
```

- [ ] **Step 8: Run component tests and verify GREEN**

Run:

```bash
npm test -- src/modules/dashboard/components/DashboardPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit component split**

Run:

```bash
git add src/modules/dashboard/components src/modules/dashboard/controllers/useDashboardController.ts src/app/AppShell.tsx
git commit -m "feat: render today execution timeline layout"
```

---

### Task 4: Full Regression And Visual Checks

**Files:**
- Inspect changed files only.

- [ ] **Step 1: Run focused dashboard tests**

Run:

```bash
npm test -- \
  src/modules/dashboard/controllers/todayTimelineFlow.test.ts \
  src/modules/dashboard/controllers/useDashboardController.test.ts \
  src/modules/dashboard/controllers/useTodayQuickCreateController.test.ts \
  src/modules/dashboard/components/DashboardPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Browser visual check**

Run the app at `http://127.0.0.1:3000`, open 今日执行页, and verify:

- Gap label text matches the four rehearsal scenario expectations when data is seeded for those scenarios.
- Desktop layout has no overlapping time labels, task titles, Gap nodes, or action buttons.
- Narrow width keeps action buttons clickable and text inside containers.
- Quick create, start focus, stop focus, done, postponed, and reset actions remain reachable.

- [ ] **Step 4: Final diff review**

Run:

```bash
git diff --stat HEAD
git status --short
```

Expected: changes stay inside dashboard module plus `src/app/AppShell.tsx`. Calendar files are not part of this feature unless they were already dirty before Task 0.

---

## Self-Review

Spec coverage:

- Four rehearsal scenarios: Task 1.
- Dashboard-only boundary: Tasks 1-4.
- Quick-create metadata stays light: Task 4 includes existing quick-create regression.
- Current action, feedback, task actions: Task 3.
- No calendar coupling: Task 0 and Task 4.
- Visual checks: Task 4.

Placeholder scan: no unresolved placeholders are intended. `TODO` appears only as the task status enum in test data.

Type consistency:

- `TodayTimelineFlowItem` is defined in `todayTimelineFlow.ts`.
- `DashboardPanel` receives `todayTimelineFlow` and `todayTaskQueue`.
- `useDashboardController` owns dashboard-only derived data.

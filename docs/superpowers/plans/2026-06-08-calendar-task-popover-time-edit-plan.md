# Calendar Task Popover Time Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bounded time refinement to week-view quick create, and add a click-to-edit/delete popover for existing timed calendar tasks.

**Architecture:** Keep pure time math in `weekTimelineInteraction.ts`, keep calendar mutations in controller/API layers, and keep popovers as focused UI components. The implementation must preserve existing drag, drop, resize, quick-create, and scheduling-sidebar behavior.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing `calendarApi`/`tasksApi`, existing `shared/lib/schedule` local datetime helpers.

---

## File Structure

- Modify `src/modules/calendar/controllers/weekTimelineInteraction.ts`
  - Extend timed quick-create drafts with `editableStartAt` / `editableEndAt`.
  - Add pure validation helpers for bounded timed ranges.
- Modify `src/modules/calendar/controllers/weekTimelineInteraction.test.ts`
  - Lock range C behavior, final-hour clamping, and validation.
- Modify `src/modules/calendar/api/calendarApi.ts`
  - Add thin wrappers for task details update and task deletion.
- Modify `src/modules/calendar/api/calendarApi.test.ts`
  - Verify wrappers preserve full payloads.
- Modify `src/modules/calendar/components/CalendarQuickCreatePopover.tsx`
  - Add timed start/end inputs and bounded submit validation.
- Modify `src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx`
  - Verify refined time submission and invalid range handling.
- Create `src/modules/calendar/components/CalendarTaskPopover.tsx`
  - Focused edit/delete popover for existing timed tasks.
- Create `src/modules/calendar/components/CalendarTaskPopover.test.tsx`
  - Component behavior for save, delete confirmation, close, invalid ranges, duplicate submit guard.
- Modify `src/modules/calendar/controllers/useCalendarController.ts`
  - Track task editor state and add save/delete handlers.
- Modify `src/modules/calendar/controllers/useCalendarController.test.ts`
  - Verify save/delete mutation ordering, data preservation, refresh, error behavior.
- Modify `src/modules/calendar/components/WeekTimelineView.tsx`
  - Add task click handler, drag/click guard, and editor-open callback.
- Modify `src/modules/calendar/components/WeekTimelineView.test.tsx`
  - Verify task click opens editor and drag/resize do not.
- Modify `src/modules/calendar/components/CalendarSurface.tsx`
  - Pass editor-open callback through to week view.
- Modify `src/modules/calendar/components/CalendarPanel.tsx`
  - Render `CalendarTaskPopover` and wire controller handlers.
- Modify `src/modules/calendar/components/CalendarPanel.test.tsx`
  - Verify end-to-end week-view edit/delete popover flow.

---

### Task 1: Pure Time Drafts and Validation

**Files:**
- Modify: `src/modules/calendar/controllers/weekTimelineInteraction.ts`
- Test: `src/modules/calendar/controllers/weekTimelineInteraction.test.ts`

- [ ] **Step 1: Write failing tests for range C point creation**

Add these tests to `weekTimelineInteraction.test.ts` near the existing timed draft tests:

```ts
it('uses the clicked hour as point quick-create editable bounds and default range', () => {
  expect(buildTimedQuickCreateDraftFromPoint({
    date: '2026-06-06',
    hour: 9,
    clientY: 132,
    rectTop: 100,
    hourHeight: 64,
    anchor: {x: 20, y: 132},
  })).toEqual({
    kind: 'timed',
    plannedDate: '2026-06-06',
    startAt: '2026-06-06T09:00:00.000',
    endAt: '2026-06-06T10:00:00.000',
    editableStartAt: '2026-06-06T09:00:00.000',
    editableEndAt: '2026-06-06T10:00:00.000',
    anchor: {x: 20, y: 132},
  });
});

it('clamps final-hour point quick-create bounds and default range to 23:59', () => {
  expect(buildTimedQuickCreateDraftFromPoint({
    date: '2026-06-06',
    hour: 23,
    clientY: 132,
    rectTop: 100,
    hourHeight: 64,
    anchor: {x: 20, y: 132},
  })).toMatchObject({
    startAt: '2026-06-06T23:00:00.000',
    endAt: '2026-06-06T23:59:00.000',
    editableStartAt: '2026-06-06T23:00:00.000',
    editableEndAt: '2026-06-06T23:59:00.000',
  });
});
```

- [ ] **Step 2: Run range C point tests and verify RED**

Run:

```bash
npm test -- src/modules/calendar/controllers/weekTimelineInteraction.test.ts
```

Expected: tests fail because timed drafts do not expose `editableStartAt` / `editableEndAt`, and point creation still uses pointer minute.

- [ ] **Step 3: Write failing tests for drag bounds and validation helper**

Add imports for the new helper:

```ts
import {
  validateTimedRangeWithinBounds,
  // existing imports stay unchanged
} from './weekTimelineInteraction';
```

Add tests:

```ts
it('uses normalized drag range as timed quick-create editable bounds', () => {
  expect(buildTimedQuickCreateDraftFromDrag({
    date: '2026-06-06',
    startHour: 12,
    startClientY: 100,
    endHour: 10,
    endClientY: 132,
    startRectTop: 100,
    endRectTop: 100,
    hourHeight: 64,
    anchor: {x: 40, y: 100},
  })).toMatchObject({
    startAt: '2026-06-06T10:30:00.000',
    endAt: '2026-06-06T12:00:00.000',
    editableStartAt: '2026-06-06T10:30:00.000',
    editableEndAt: '2026-06-06T12:00:00.000',
  });
});

it('validates candidate timed ranges inside editable bounds', () => {
  expect(validateTimedRangeWithinBounds({
    startAt: '2026-06-06T09:15:00.000',
    endAt: '2026-06-06T09:45:00.000',
    editableStartAt: '2026-06-06T09:00:00.000',
    editableEndAt: '2026-06-06T10:00:00.000',
  })).toEqual({ok: true});
});

it('rejects invalid timed ranges with stable messages', () => {
  expect(validateTimedRangeWithinBounds({
    startAt: '2026-06-06T09:45:00.000',
    endAt: '2026-06-06T09:45:00.000',
    editableStartAt: '2026-06-06T09:00:00.000',
    editableEndAt: '2026-06-06T10:00:00.000',
  })).toEqual({ok: false, message: '结束时间必须晚于开始时间'});

  expect(validateTimedRangeWithinBounds({
    startAt: '2026-06-06T09:00:00.000',
    endAt: '2026-06-06T09:10:00.000',
    editableStartAt: '2026-06-06T09:00:00.000',
    editableEndAt: '2026-06-06T10:00:00.000',
  })).toEqual({ok: false, message: '任务时长不能少于 15 分钟'});

  expect(validateTimedRangeWithinBounds({
    startAt: '2026-06-06T08:45:00.000',
    endAt: '2026-06-06T09:30:00.000',
    editableStartAt: '2026-06-06T09:00:00.000',
    editableEndAt: '2026-06-06T10:00:00.000',
  })).toEqual({ok: false, message: '只能在 09:00-10:00 内调整'});
});
```

- [ ] **Step 4: Run validation tests and verify RED**

Run:

```bash
npm test -- src/modules/calendar/controllers/weekTimelineInteraction.test.ts
```

Expected: fails because helper does not exist and drag drafts do not expose editable bounds.

- [ ] **Step 5: Implement minimal pure helper and draft fields**

In `weekTimelineInteraction.ts`, update `CalendarQuickCreateDraft` timed variant:

```ts
export type CalendarQuickCreateDraft =
  | {
      kind: 'timed';
      plannedDate: string;
      startAt: string;
      endAt: string;
      editableStartAt: string;
      editableEndAt: string;
      anchor: PopoverAnchor;
    }
  | {
      kind: 'all-day';
      plannedDate: string;
      plannedEndDate?: string;
      anchor: PopoverAnchor;
    };
```

Add helpers:

```ts
interface TimedRangeValidationInput {
  startAt: string;
  endAt: string;
  editableStartAt: string;
  editableEndAt: string;
}

export type TimedRangeValidationResult = {ok: true} | {ok: false; message: string};

function minuteOfDayFromLocalDateTime(value: string): number | null {
  if (!isLocalDateTimeString(value)) return null;
  return Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
}

function formatMinuteOfDay(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function validateTimedRangeWithinBounds(input: TimedRangeValidationInput): TimedRangeValidationResult {
  const start = minuteOfDayFromLocalDateTime(input.startAt);
  const end = minuteOfDayFromLocalDateTime(input.endAt);
  const boundStart = minuteOfDayFromLocalDateTime(input.editableStartAt);
  const boundEnd = minuteOfDayFromLocalDateTime(input.editableEndAt);

  if (start === null || end === null || boundStart === null || boundEnd === null) {
    return {ok: false, message: '时间格式无效'};
  }
  if (input.startAt.slice(0, 10) !== input.endAt.slice(0, 10)) {
    return {ok: false, message: '只能在 00:00-23:59 内调整'};
  }
  if (end <= start) {
    return {ok: false, message: '结束时间必须晚于开始时间'};
  }
  if (end - start < MIN_TIMED_TASK_DURATION_MINUTES) {
    return {ok: false, message: '任务时长不能少于 15 分钟'};
  }
  if (start < boundStart || end > boundEnd) {
    return {ok: false, message: `只能在 ${formatMinuteOfDay(boundStart)}-${formatMinuteOfDay(boundEnd)} 内调整`};
  }
  return {ok: true};
}
```

Update point draft builder to set default and editable bounds from hour start/end:

```ts
const hourStart = clampStartMinute(Math.min(23, Math.max(0, Math.floor(input.hour))) * 60);
const hourEnd = Math.min(END_OF_DAY_MINUTES, hourStart + DEFAULT_TIMED_TASK_DURATION_MINUTES);

return {
  kind: 'timed',
  plannedDate: input.date,
  startAt: makeDateTimeFromMinute(input.date, hourStart),
  endAt: makeDateTimeFromMinute(input.date, hourEnd),
  editableStartAt: makeDateTimeFromMinute(input.date, hourStart),
  editableEndAt: makeDateTimeFromMinute(input.date, hourEnd),
  anchor: input.anchor,
};
```

Update drag draft builder to include editable bounds equal to `rangeStart` / `rangeEnd`.

- [ ] **Step 6: Run Task 1 tests and commit**

Run:

```bash
npm test -- src/modules/calendar/controllers/weekTimelineInteraction.test.ts
npm run lint
```

Expected: targeted tests pass and TypeScript passes.

Commit:

```bash
git add src/modules/calendar/controllers/weekTimelineInteraction.ts src/modules/calendar/controllers/weekTimelineInteraction.test.ts
git commit -m "feat: bound calendar quick create time ranges"
```

---

### Task 2: Calendar API Wrappers

**Files:**
- Modify: `src/modules/calendar/api/calendarApi.ts`
- Test: `src/modules/calendar/api/calendarApi.test.ts`

- [ ] **Step 1: Write failing API wrapper tests**

In `calendarApi.test.ts`, extend the `tasksApi` mock:

```ts
updateTaskDetails: vi.fn(),
deleteTask: vi.fn(),
```

Add tests:

```ts
it('forwards task detail updates to tasks API without dropping metadata', async () => {
  vi.mocked(tasksApi.updateTaskDetails).mockResolvedValue({id: 1} as never);

  await calendarApi.updateTaskDetails(1, {
    title: '数学',
    categoryId: 2,
    priority: 'P1',
    tagIds: [3, 4],
  });

  expect(tasksApi.updateTaskDetails).toHaveBeenCalledWith(1, {
    title: '数学',
    categoryId: 2,
    priority: 'P1',
    tagIds: [3, 4],
  });
});

it('forwards task deletion to tasks API', async () => {
  vi.mocked(tasksApi.deleteTask).mockResolvedValue(undefined);

  await calendarApi.deleteTask(9);

  expect(tasksApi.deleteTask).toHaveBeenCalledWith(9);
});
```

- [ ] **Step 2: Run API tests and verify RED**

Run:

```bash
npm test -- src/modules/calendar/api/calendarApi.test.ts
```

Expected: fails because `calendarApi.updateTaskDetails` and `calendarApi.deleteTask` do not exist.

- [ ] **Step 3: Implement wrappers**

In `calendarApi.ts`, add imports/types if needed and wrappers:

```ts
updateTaskDetails(
  taskId: number,
  details: {title: string; categoryId: number; priority: TaskPriority | null; tagIds: number[]},
): Promise<Task> {
  return tasksApi.updateTaskDetails(taskId, details);
},

deleteTask(taskId: number): Promise<void> {
  return tasksApi.deleteTask(taskId);
},
```

- [ ] **Step 4: Run API tests and commit**

Run:

```bash
npm test -- src/modules/calendar/api/calendarApi.test.ts
npm run lint
```

Expected: targeted tests pass and TypeScript passes.

Commit:

```bash
git add src/modules/calendar/api/calendarApi.ts src/modules/calendar/api/calendarApi.test.ts
git commit -m "feat: expose calendar task detail mutations"
```

---

### Task 3: Quick Create Time Inputs

**Files:**
- Modify: `src/modules/calendar/components/CalendarQuickCreatePopover.tsx`
- Test: `src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx`
- Modify: `src/modules/calendar/controllers/useCalendarController.ts`
- Test: `src/modules/calendar/controllers/useCalendarController.test.ts`

- [ ] **Step 1: Write failing popover tests for refined timed submit**

Update `timedDraft` fixture in `CalendarQuickCreatePopover.test.tsx`:

```ts
const timedDraft: CalendarQuickCreateDraft = {
  kind: 'timed',
  plannedDate: '2026-06-06',
  startAt: '2026-06-06T09:00:00.000',
  endAt: '2026-06-06T10:00:00.000',
  editableStartAt: '2026-06-06T09:00:00.000',
  editableEndAt: '2026-06-06T10:00:00.000',
  anchor: {x: 30, y: 40},
};
```

Change the existing submit expectation to include time:

```ts
await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
  title: '写方案',
  categoryId: 2,
  startAt: '2026-06-06T09:15:00.000',
  endAt: '2026-06-06T09:45:00.000',
}));
```

Before clicking save, set time inputs:

```ts
fireEvent.change(screen.getByLabelText('开始时间'), {target: {value: '09:15'}});
fireEvent.change(screen.getByLabelText('结束时间'), {target: {value: '09:45'}});
```

- [ ] **Step 2: Add failing invalid range and all-day tests**

Add tests:

```ts
it('rejects timed quick-create edits outside editable bounds', () => {
  const onSubmit = vi.fn();
  render(
    <CalendarQuickCreatePopover
      draft={timedDraft}
      categories={categories}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />,
  );

  fireEvent.change(screen.getByLabelText('任务标题'), {target: {value: '写方案'}});
  fireEvent.change(screen.getByLabelText('开始时间'), {target: {value: '08:45'}});
  fireEvent.change(screen.getByLabelText('结束时间'), {target: {value: '09:30'}});
  fireEvent.click(screen.getByRole('button', {name: '保存'}));

  expect(screen.getByText('只能在 09:00-10:00 内调整')).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

it('does not render time inputs for all-day quick create', () => {
  render(
    <CalendarQuickCreatePopover
      draft={{kind: 'all-day', plannedDate: '2026-06-18', anchor: {x: 0, y: 0}}}
      categories={categories}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );

  expect(screen.queryByLabelText('开始时间')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('结束时间')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run popover tests and verify RED**

Run:

```bash
npm test -- src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx
```

Expected: fails because time inputs and refined submit contract do not exist.

- [ ] **Step 4: Implement timed inputs and validation**

In `CalendarQuickCreatePopover.tsx`, import validation helper:

```ts
import {
  validateTimedRangeWithinBounds,
  type CalendarQuickCreateDraft,
} from '../controllers/weekTimelineInteraction';
```

Add local time state:

```ts
const [startTime, setStartTime] = useState(() => draft.kind === 'timed' ? draft.startAt.slice(11, 16) : '');
const [endTime, setEndTime] = useState(() => draft.kind === 'timed' ? draft.endAt.slice(11, 16) : '');
```

Render inside the form for timed drafts:

```tsx
{draft.kind === 'timed' && (
  <div className="grid grid-cols-2 gap-2">
    <input
      aria-label="开始时间"
      type="time"
      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
      value={startTime}
      onChange={(event) => setStartTime(event.target.value)}
    />
    <input
      aria-label="结束时间"
      type="time"
      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
      value={endTime}
      onChange={(event) => setEndTime(event.target.value)}
    />
  </div>
)}
```

In `submitForm`, build refined datetimes:

```ts
if (draft.kind === 'timed') {
  const startAt = `${draft.plannedDate}T${startTime}:00.000`;
  const endAt = `${draft.plannedDate}T${endTime}:00.000`;
  const validation = validateTimedRangeWithinBounds({
    startAt,
    endAt,
    editableStartAt: draft.editableStartAt,
    editableEndAt: draft.editableEndAt,
  });
  if (!validation.ok) {
    setError(validation.message);
    return;
  }
  const result = await onSubmit({title: trimmedTitle, categoryId, startAt, endAt});
  // keep existing result handling
}
```

Update prop type:

```ts
onSubmit: (input: {
  title: string;
  categoryId: number;
  startAt?: string;
  endAt?: string;
}) => Promise<{ok: true} | {ok: false; message: string}>;
```

- [ ] **Step 5: Update controller quick-create submit contract**

In `useCalendarController.ts`, update signature:

```ts
async function submitQuickCreateDraft(input: {
  title: string;
  categoryId: number;
  startAt?: string;
  endAt?: string;
}): Promise<{ok: true} | {ok: false; message: string}> {
```

For timed drafts, use refined values when present:

```ts
const startAt = input.startAt ?? draft.startAt;
const endAt = input.endAt ?? draft.endAt;
```

- [ ] **Step 6: Run quick-create tests and commit**

Run:

```bash
npm test -- src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx src/modules/calendar/controllers/useCalendarController.test.ts
npm run lint
```

Expected: targeted tests pass and TypeScript passes.

Commit:

```bash
git add src/modules/calendar/components/CalendarQuickCreatePopover.tsx src/modules/calendar/components/CalendarQuickCreatePopover.test.tsx src/modules/calendar/controllers/useCalendarController.ts src/modules/calendar/controllers/useCalendarController.test.ts
git commit -m "feat: refine calendar quick create time"
```

---

### Task 4: Task Editor Controller Mutations

**Files:**
- Modify: `src/modules/calendar/controllers/useCalendarController.ts`
- Test: `src/modules/calendar/controllers/useCalendarController.test.ts`

- [ ] **Step 1: Extend calendar API test mock**

In `useCalendarController.test.ts`, add mocked functions:

```ts
updateTaskDetails: vi.fn(),
deleteTask: vi.fn(),
```

Use this fixture in new tests:

```ts
const editableTask = {
  id: 7,
  userId: 1,
  categoryId: 1,
  title: '数学',
  plannedDate: '2026-06-06',
  startAt: '2026-06-06T13:00:00.000',
  endAt: '2026-06-06T14:00:00.000',
  allDay: false,
  status: 'TODO',
  priority: 'P1',
  tagIds: [2, 3],
  createdAt: '',
  updatedAt: '',
} as const;
```

- [ ] **Step 2: Write failing controller tests for open/save**

Add tests:

```ts
it('opens and closes the task editor state', async () => {
  vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
  vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);
  const {result} = renderHook(() => useCalendarController({
    categories: [],
    initialDate: '2026-06-06',
    showToast: vi.fn(),
  }));

  act(() => result.current.openTaskEditor({task: editableTask, anchor: {x: 10, y: 20}}));
  expect(result.current.taskEditor).toEqual({task: editableTask, anchor: {x: 10, y: 20}});

  act(() => result.current.closeTaskEditor());
  expect(result.current.taskEditor).toBeUndefined();
});

it('saves task editor schedule then details while preserving metadata', async () => {
  vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
  vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);
  vi.mocked(calendarApi.updateTaskSchedule).mockResolvedValue({id: 7} as never);
  vi.mocked(calendarApi.updateTaskDetails).mockResolvedValue({id: 7} as never);
  const {result} = renderHook(() => useCalendarController({
    categories: [],
    initialDate: '2026-06-06',
    showToast: vi.fn(),
  }));

  act(() => result.current.openTaskEditor({task: editableTask, anchor: {x: 10, y: 20}}));
  await act(async () => {
    await result.current.submitTaskEditor({
      title: '高数',
      categoryId: 2,
      startAt: '2026-06-06T13:15:00.000',
      endAt: '2026-06-06T14:15:00.000',
    });
  });

  expect(calendarApi.updateTaskSchedule).toHaveBeenCalledWith(7, {
    plannedDate: '2026-06-06',
    plannedEndDate: undefined,
    startAt: '2026-06-06T13:15:00.000',
    endAt: '2026-06-06T14:15:00.000',
    allDay: false,
  });
  expect(calendarApi.updateTaskDetails).toHaveBeenCalledWith(7, {
    title: '高数',
    categoryId: 2,
    priority: 'P1',
    tagIds: [2, 3],
  });
  expect(result.current.taskEditor).toBeUndefined();
});
```

- [ ] **Step 3: Write failing controller tests for failure/delete**

Add tests:

```ts
it('keeps task editor open and refreshes when editor save fails', async () => {
  const showToast = vi.fn();
  vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
  vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);
  vi.mocked(calendarApi.updateTaskSchedule).mockRejectedValue(new Error('保存失败'));
  const {result} = renderHook(() => useCalendarController({
    categories: [],
    initialDate: '2026-06-06',
    showToast,
  }));

  act(() => result.current.openTaskEditor({task: editableTask, anchor: {x: 10, y: 20}}));
  const response = await result.current.submitTaskEditor({
    title: '数学',
    categoryId: 1,
    startAt: '2026-06-06T13:15:00.000',
    endAt: '2026-06-06T14:15:00.000',
  });

  expect(response).toEqual({ok: false, message: '保存失败'});
  expect(result.current.taskEditor).toEqual({task: editableTask, anchor: {x: 10, y: 20}});
  expect(calendarApi.getCalendarTasks).toHaveBeenCalled();
});

it('deletes a task editor task then refreshes and closes', async () => {
  const onMutationSuccess = vi.fn().mockResolvedValue(undefined);
  vi.mocked(calendarApi.getCalendarTasks).mockResolvedValue([]);
  vi.mocked(calendarApi.getFocusSessions).mockResolvedValue([]);
  vi.mocked(calendarApi.deleteTask).mockResolvedValue(undefined);
  const {result} = renderHook(() => useCalendarController({
    categories: [],
    initialDate: '2026-06-06',
    showToast: vi.fn(),
    onMutationSuccess,
  }));

  act(() => result.current.openTaskEditor({task: editableTask, anchor: {x: 10, y: 20}}));
  await act(async () => {
    await result.current.deleteTaskFromEditor();
  });

  expect(calendarApi.deleteTask).toHaveBeenCalledWith(7);
  expect(onMutationSuccess).toHaveBeenCalledOnce();
  expect(result.current.taskEditor).toBeUndefined();
});
```

- [ ] **Step 4: Run controller tests and verify RED**

Run:

```bash
npm test -- src/modules/calendar/controllers/useCalendarController.test.ts
```

Expected: fails because editor state and handlers do not exist.

- [ ] **Step 5: Implement editor state and handlers**

In `useCalendarController.ts`, add state:

```ts
const [taskEditor, setTaskEditor] = useState<{task: Task; anchor: {x: number; y: number}} | undefined>();
```

Add methods:

```ts
function openTaskEditor(input: {task: Task; anchor: {x: number; y: number}}): void {
  setTaskEditor(input);
}

function closeTaskEditor(): void {
  setTaskEditor(undefined);
}
```

Add `submitTaskEditor` and `deleteTaskFromEditor` using the spec rules: validate same-day `00:00-23:59`, call only changed mutations, call schedule before details when both changed, preserve `priority` / `tagIds`, refresh after failures, keep editor open on failure, close only on full success.

- [ ] **Step 6: Run controller tests and commit**

Run:

```bash
npm test -- src/modules/calendar/controllers/useCalendarController.test.ts
npm run lint
```

Expected: targeted tests pass and TypeScript passes.

Commit:

```bash
git add src/modules/calendar/controllers/useCalendarController.ts src/modules/calendar/controllers/useCalendarController.test.ts
git commit -m "feat: add calendar task editor mutations"
```

---

### Task 5: Existing Task Popover Component

**Files:**
- Create: `src/modules/calendar/components/CalendarTaskPopover.tsx`
- Test: `src/modules/calendar/components/CalendarTaskPopover.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `CalendarTaskPopover.test.tsx` with:

```ts
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {Category, Task} from '../../../../shared/domain/entities';
import {CalendarTaskPopover} from './CalendarTaskPopover';

const categories: Category[] = [
  {id: 1, userId: 1, name: '工作', color: '#ef4444', sortOrder: 1, createdAt: '', updatedAt: ''},
  {id: 2, userId: 1, name: '学习', color: '#3b82f6', sortOrder: 2, createdAt: '', updatedAt: ''},
];

const task: Task = {
  id: 7,
  userId: 1,
  categoryId: 1,
  title: '数学',
  plannedDate: '2026-06-06',
  startAt: '2026-06-06T13:00:00.000',
  endAt: '2026-06-06T14:00:00.000',
  allDay: false,
  status: 'TODO',
  priority: 'P1',
  tagIds: [2, 3],
  createdAt: '',
  updatedAt: '',
};

describe('CalendarTaskPopover', () => {
  it('submits edited task fields', async () => {
    const onSave = vi.fn().mockResolvedValue({ok: true});
    render(
      <CalendarTaskPopover
        task={task}
        categories={categories}
        anchor={{x: 30, y: 40}}
        onCancel={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('任务标题'), {target: {value: '高数'}});
    fireEvent.change(screen.getByLabelText('任务分类'), {target: {value: '2'}});
    fireEvent.change(screen.getByLabelText('开始时间'), {target: {value: '13:15'}});
    fireEvent.change(screen.getByLabelText('结束时间'), {target: {value: '14:15'}});
    fireEvent.click(screen.getByRole('button', {name: '保存'}));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      title: '高数',
      categoryId: 2,
      startAt: '2026-06-06T13:15:00.000',
      endAt: '2026-06-06T14:15:00.000',
    }));
  });

  it('rejects shorter-than-15-minute ranges', () => {
    const onSave = vi.fn();
    render(
      <CalendarTaskPopover
        task={task}
        categories={categories}
        anchor={{x: 30, y: 40}}
        onCancel={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('结束时间'), {target: {value: '13:10'}});
    fireEvent.click(screen.getByRole('button', {name: '保存'}));

    expect(screen.getByText('任务时长不能少于 15 分钟')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('requires two delete clicks before deleting', async () => {
    const onDelete = vi.fn().mockResolvedValue({ok: true});
    render(
      <CalendarTaskPopover
        task={task}
        categories={categories}
        anchor={{x: 30, y: 40}}
        onCancel={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: '删除'}));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: '确认删除'}));

    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce());
  });

  it('closes on Escape and outside pointer down without deleting', () => {
    const onCancel = vi.fn();
    const onDelete = vi.fn();
    render(
      <div>
        <button type="button">外部区域</button>
        <CalendarTaskPopover
          task={task}
          categories={categories}
          anchor={{x: 30, y: 40}}
          onCancel={onCancel}
          onSave={vi.fn()}
          onDelete={onDelete}
        />
      </div>,
    );

    fireEvent.keyDown(document, {key: 'Escape'});
    fireEvent.pointerDown(screen.getByRole('button', {name: '外部区域'}));

    expect(onCancel).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run new component tests and verify RED**

Run:

```bash
npm test -- src/modules/calendar/components/CalendarTaskPopover.test.tsx
```

Expected: fails because `CalendarTaskPopover.tsx` does not exist.

- [ ] **Step 3: Implement `CalendarTaskPopover`**

Create the component with:

- `role="dialog"` and `aria-label="编辑日历任务"`
- fixed viewport positioning with the same clamp pattern as `CalendarQuickCreatePopover`
- title, category, start time, end time controlled inputs
- inline validation using `validateTimedRangeWithinBounds`
- duplicate save/delete guard using refs and `isSubmitting`
- inline confirmation state for delete
- document Escape and outside pointer down cleanup

- [ ] **Step 4: Run component tests and commit**

Run:

```bash
npm test -- src/modules/calendar/components/CalendarTaskPopover.test.tsx
npm run lint
```

Expected: targeted tests pass and TypeScript passes.

Commit:

```bash
git add src/modules/calendar/components/CalendarTaskPopover.tsx src/modules/calendar/components/CalendarTaskPopover.test.tsx
git commit -m "feat: add calendar task edit popover"
```

---

### Task 6: Week View Wiring and Interaction Guards

**Files:**
- Modify: `src/modules/calendar/components/WeekTimelineView.tsx`
- Test: `src/modules/calendar/components/WeekTimelineView.test.tsx`
- Modify: `src/modules/calendar/components/CalendarSurface.tsx`
- Modify: `src/modules/calendar/components/CalendarPanel.tsx`
- Test: `src/modules/calendar/components/CalendarPanel.test.tsx`

- [ ] **Step 1: Write failing week-view open/guard tests**

In `WeekTimelineView.test.tsx`, add a timed task fixture:

```ts
const timedTask = {
  ...task,
  allDay: false,
  startAt: '2026-06-06T13:00:00.000',
  endAt: '2026-06-06T14:00:00.000',
};
```

Add tests:

```ts
it('opens the task editor when clicking a timed task', () => {
  const onOpenTaskEditor = vi.fn();
  renderWeek({
    tasksByDate: {'2026-06-06': [timedTask]},
    onOpenTaskEditor,
  });

  fireEvent.click(screen.getByLabelText('2026-06-06 13:00-14:00 写方案'));

  expect(onOpenTaskEditor).toHaveBeenCalledWith(expect.objectContaining({
    task: timedTask,
    anchor: expect.objectContaining({x: expect.any(Number), y: expect.any(Number)}),
  }));
});

it('does not open the task editor after timed task drag starts', () => {
  const onOpenTaskEditor = vi.fn();
  renderWeek({
    tasksByDate: {'2026-06-06': [timedTask]},
    onOpenTaskEditor,
  });
  const segment = screen.getByLabelText('2026-06-06 13:00-14:00 写方案');

  fireEvent.dragStart(segment);
  fireEvent.click(segment);

  expect(onOpenTaskEditor).not.toHaveBeenCalled();
});

it('does not open the task editor from the resize handle', () => {
  const onOpenTaskEditor = vi.fn();
  renderWeek({
    tasksByDate: {'2026-06-06': [timedTask]},
    onOpenTaskEditor,
  });

  fireEvent.pointerDown(screen.getByRole('button', {name: '调整写方案时长'}));

  expect(onOpenTaskEditor).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run week-view tests and verify RED**

Run:

```bash
npm test -- src/modules/calendar/components/WeekTimelineView.test.tsx
```

Expected: fails because `onOpenTaskEditor` prop does not exist and task blocks do not open editor.

- [ ] **Step 3: Implement week-view callback and guard**

In `WeekTimelineViewProps`, add:

```ts
onOpenTaskEditor?: (input: {task: Task; anchor: {x: number; y: number}}) => void;
```

Default it to no-op in props destructuring.

Add refs:

```ts
const taskPointerRef = useRef<{taskId: number; x: number; y: number} | null>(null);
const taskDragStartedRef = useRef(false);
```

On timed task block:

```tsx
onPointerDown={(event) => {
  taskPointerRef.current = {taskId: task.id, x: event.clientX, y: event.clientY};
  taskDragStartedRef.current = false;
}}
onDragStart={(event) => {
  taskDragStartedRef.current = true;
  // existing drag payload code remains
}}
onClick={(event) => {
  const pointer = taskPointerRef.current;
  const moved = pointer
    ? Math.abs(event.clientX - pointer.x) > 4 || Math.abs(event.clientY - pointer.y) > 4
    : false;
  if (taskDragStartedRef.current || moved) {
    taskDragStartedRef.current = false;
    return;
  }
  onOpenTaskEditor({task, anchor: {x: event.clientX, y: event.clientY}});
}}
```

Keep resize handle `event.stopPropagation()` on pointer down.

- [ ] **Step 4: Wire through surface and panel**

In `CalendarSurface.tsx`, pass:

```tsx
onOpenTaskEditor={controller.openTaskEditor}
```

In `CalendarPanel.tsx`, render:

```tsx
{controller.taskEditor && (
  <CalendarTaskPopover
    task={controller.taskEditor.task}
    anchor={controller.taskEditor.anchor}
    categories={categories}
    onCancel={controller.closeTaskEditor}
    onSave={controller.submitTaskEditor}
    onDelete={controller.deleteTaskFromEditor}
  />
)}
```

- [ ] **Step 5: Run week-view and panel tests and commit**

Run:

```bash
npm test -- src/modules/calendar/components/WeekTimelineView.test.tsx src/modules/calendar/components/CalendarPanel.test.tsx
npm run lint
```

Expected: targeted tests pass and TypeScript passes.

Commit:

```bash
git add src/modules/calendar/components/WeekTimelineView.tsx src/modules/calendar/components/WeekTimelineView.test.tsx src/modules/calendar/components/CalendarSurface.tsx src/modules/calendar/components/CalendarPanel.tsx src/modules/calendar/components/CalendarPanel.test.tsx
git commit -m "feat: wire calendar task editor"
```

---

### Task 7: Full Regression and Final Review

**Files:**
- Verify all files touched by Tasks 1-6.

- [ ] **Step 1: Run targeted calendar tests**

Run:

```bash
npm test -- src/modules/calendar
```

Expected: all calendar tests pass.

- [ ] **Step 2: Run full project verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected:

- Vitest reports all tests passed.
- `tsc --noEmit` exits 0.
- Vite/esbuild production build exits 0.
- `git diff --check` prints no whitespace errors.

- [ ] **Step 3: Manual browser smoke check**

Use the already running project at `http://127.0.0.1:3000/` if it is current. If not running, start it with:

```bash
npm run dev
```

Check week view manually:

- click a `09:00` time cell and verify quick-create defaults to `09:00-10:00`
- edit quick-create time to `09:15-09:45` and save
- try `08:45-09:30` and verify the popover rejects it
- click an existing timed task and verify edit popover opens
- edit title/category/time and save
- click delete, cancel, then delete with confirmation
- drag a timed task and verify the editor does not open
- use the resize handle and verify the editor does not open

- [ ] **Step 4: Commit any final fixes**

If verification reveals fixes, make focused fixes and commit them. If no fixes are needed, skip this step.

- [ ] **Step 5: Report completion evidence**

Report:

- final commit list
- verification command outputs
- manual smoke result
- any known limitation

---

## Self-Review

Spec coverage:

- Range C creation bounds: Task 1 and Task 3.
- Initial point value inside clicked hour: Task 1.
- Final-hour `23:59` clamp: Task 1.
- Existing timed task editor: Tasks 4, 5, and 6.
- Delete confirmation: Task 5.
- No done/postponed controls: Task 5 does not include status fields.
- Preserve `priority` / `tagIds`: Task 2 and Task 4.
- Drag/click/resize conflict guard: Task 6.
- API/controller/component testing: Tasks 2 through 7.

Placeholder scan:

- No placeholder markers.
- No unspecified test step.
- Each implementation task has exact files, failing tests, commands, and commit boundary.

Type consistency:

- `CalendarQuickCreateDraft` timed variant uses `editableStartAt` / `editableEndAt` consistently.
- Quick-create submit accepts optional `startAt` / `endAt`.
- Task editor save accepts required `title`, `categoryId`, `startAt`, and `endAt`.

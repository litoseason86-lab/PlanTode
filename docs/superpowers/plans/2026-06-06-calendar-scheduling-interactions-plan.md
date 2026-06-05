# Calendar Scheduling Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add week timeline rendering, drag scheduling, duration resizing, and focus-session overlay on top of the backend and frontend foundations.

**Architecture:** Keep drag and resize state inside the calendar controller and small interaction helpers. Week view consumes layout data and emits schedule commands; it does not call HTTP APIs directly.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, HTML drag/drop events, lucide-react.

---

## File Structure

- Create: `src/modules/calendar/controllers/weekTimelineLayout.ts`
- Create: `src/modules/calendar/controllers/weekTimelineLayout.test.ts`
- Create: `src/modules/calendar/components/WeekTimelineView.tsx`
- Create: `src/modules/calendar/components/UnscheduledTaskLane.tsx`
- Modify: `src/modules/calendar/controllers/useCalendarController.ts`
- Modify: `src/modules/calendar/controllers/useCalendarController.test.ts`
- Modify: `src/modules/calendar/components/CalendarPanel.tsx`
- Modify: `src/modules/calendar/components/CalendarPanel.test.tsx`

---

### Task 1: Week Timeline Layout

**Files:**
- Create: `src/modules/calendar/controllers/weekTimelineLayout.ts`
- Create: `src/modules/calendar/controllers/weekTimelineLayout.test.ts`

- [ ] **Step 1: Write failing layout tests**

```ts
expect(minutesFromDayStart('2026-06-06T09:30:00.000')).toBe(570);
expect(buildTimedTaskBlock({
  startAt: '2026-06-06T09:00:00.000',
  endAt: '2026-06-06T10:00:00.000',
})).toMatchObject({topMinutes: 540, durationMinutes: 60});
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm test src/modules/calendar/controllers/weekTimelineLayout.test.ts`

Expected: FAIL because helper file does not exist.

- [ ] **Step 3: Implement layout helpers**

```ts
export function minutesFromDayStart(isoDateTime: string): number {
  const date = new Date(isoDateTime);
  return date.getHours() * 60 + date.getMinutes();
}

export function buildTimedTaskBlock(input: {startAt: string; endAt: string}) {
  const topMinutes = minutesFromDayStart(input.startAt);
  const durationMinutes = Math.max(15, minutesFromDayStart(input.endAt) - topMinutes);
  return {topMinutes, durationMinutes};
}
```

- [ ] **Step 4: Run test and verify GREEN**

Run: `npm test src/modules/calendar/controllers/weekTimelineLayout.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/controllers/weekTimelineLayout.ts src/modules/calendar/controllers/weekTimelineLayout.test.ts
git commit -m "feat: add week timeline layout helpers"
```

---

### Task 2: Week Timeline Rendering

**Files:**
- Create: `src/modules/calendar/components/WeekTimelineView.tsx`
- Create: `src/modules/calendar/components/UnscheduledTaskLane.tsx`
- Modify: `src/modules/calendar/components/CalendarPanel.tsx`
- Modify: `src/modules/calendar/components/CalendarPanel.test.tsx`

- [ ] **Step 1: Write failing render test**

```ts
expect(screen.getByText('全天')).toBeInTheDocument();
expect(screen.getByText('09:00')).toBeInTheDocument();
expect(screen.getByText('Timed task')).toBeInTheDocument();
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: FAIL because week view does not exist.

- [ ] **Step 3: Implement week timeline**

Render fixed hours:

```tsx
const HOURS = Array.from({length: 18}, (_, index) => index + 6);
```

All-day lane:

```tsx
<div aria-label="全天" className="grid grid-cols-7 gap-px">
  {weekDays.map((day) => <div key={day.isoDate}>{allDayTasksByDate[day.isoDate]?.map(renderTask)}</div>)}
</div>
```

Time grid:

```tsx
{HOURS.map((hour) => (
  <div key={hour} className="grid grid-cols-[64px_1fr] border-t border-slate-100">
    <span>{String(hour).padStart(2, '0')}:00</span>
    <div className="grid grid-cols-7">{weekDays.map((day) => <div key={day.isoDate} />)}</div>
  </div>
))}
```

- [ ] **Step 4: Run test and verify GREEN**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/components/WeekTimelineView.tsx src/modules/calendar/components/UnscheduledTaskLane.tsx src/modules/calendar/components/CalendarPanel.tsx src/modules/calendar/components/CalendarPanel.test.tsx
git commit -m "feat: render calendar week timeline"
```

---

### Task 3: Drag Scheduling

**Files:**
- Modify: `src/modules/calendar/controllers/useCalendarController.ts`
- Modify: `src/modules/calendar/controllers/useCalendarController.test.ts`
- Modify: `src/modules/calendar/components/MonthCalendarView.tsx`
- Modify: `src/modules/calendar/components/WeekTimelineView.tsx`

- [ ] **Step 1: Write failing controller test**

```ts
await result.current.scheduleTaskAtTime({
  taskId: 1,
  date: '2026-06-06',
  hour: 9,
  minute: 0,
});
expect(calendarApi.updateTaskSchedule).toHaveBeenCalledWith(1, {
  plannedDate: '2026-06-06',
  startAt: '2026-06-06T09:00:00.000',
  endAt: '2026-06-06T10:00:00.000',
  allDay: false,
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm test src/modules/calendar/controllers/useCalendarController.test.ts`

Expected: FAIL because scheduling action does not exist.

- [ ] **Step 3: Implement scheduling actions**

```ts
async function scheduleTaskForDate(taskId: number, plannedDate: string) {
  await calendarApi.updateTaskSchedule(taskId, {plannedDate, allDay: true});
  await refreshCalendarData();
}

async function scheduleTaskAtTime(input: {taskId: number; date: string; hour: number; minute: number}) {
  const startAt = `${input.date}T${String(input.hour).padStart(2, '0')}:${String(input.minute).padStart(2, '0')}:00.000`;
  const endAt = `${input.date}T${String(input.hour + 1).padStart(2, '0')}:${String(input.minute).padStart(2, '0')}:00.000`;
  await calendarApi.updateTaskSchedule(input.taskId, {plannedDate: input.date, startAt, endAt, allDay: false});
  await refreshCalendarData();
}
```

- [ ] **Step 4: Wire drag/drop UI**

Use `data-task-id` on draggable task blocks and call controller actions from `onDrop`.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test src/modules/calendar/controllers/useCalendarController.test.ts src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/calendar/controllers/useCalendarController.ts src/modules/calendar/controllers/useCalendarController.test.ts src/modules/calendar/components/MonthCalendarView.tsx src/modules/calendar/components/WeekTimelineView.tsx
git commit -m "feat: add calendar drag scheduling"
```

---

### Task 4: Duration Resize

**Files:**
- Modify: `src/modules/calendar/controllers/useCalendarController.ts`
- Modify: `src/modules/calendar/controllers/useCalendarController.test.ts`
- Modify: `src/modules/calendar/components/WeekTimelineView.tsx`

- [ ] **Step 1: Write failing resize test**

```ts
await result.current.resizeTimedTask({
  taskId: 1,
  plannedDate: '2026-06-06',
  startAt: '2026-06-06T09:00:00.000',
  durationMinutes: 90,
});
expect(calendarApi.updateTaskSchedule).toHaveBeenCalledWith(1, {
  plannedDate: '2026-06-06',
  startAt: '2026-06-06T09:00:00.000',
  endAt: '2026-06-06T10:30:00.000',
  allDay: false,
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm test src/modules/calendar/controllers/useCalendarController.test.ts`

Expected: FAIL because resize action does not exist.

- [ ] **Step 3: Implement resize action and handle**

```ts
async function resizeTimedTask(input: {taskId: number; plannedDate: string; startAt: string; durationMinutes: number}) {
  const endAt = new Date(new Date(input.startAt).getTime() + input.durationMinutes * 60_000)
    .toISOString()
    .replace('Z', '');
  await calendarApi.updateTaskSchedule(input.taskId, {
    plannedDate: input.plannedDate,
    startAt: input.startAt,
    endAt,
    allDay: false,
  });
  await refreshCalendarData();
}
```

Add a bottom resize handle button with accessible label `调整时长`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test src/modules/calendar/controllers/useCalendarController.test.ts src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/controllers/useCalendarController.ts src/modules/calendar/controllers/useCalendarController.test.ts src/modules/calendar/components/WeekTimelineView.tsx
git commit -m "feat: resize calendar time blocks"
```

---

### Task 5: Focus Overlay

**Files:**
- Modify: `src/modules/calendar/components/WeekTimelineView.tsx`
- Modify: `src/modules/calendar/components/CalendarListView.tsx`
- Modify: `src/modules/calendar/components/CalendarPanel.test.tsx`

- [ ] **Step 1: Write failing overlay test**

```ts
expect(screen.getByText('专注 45m')).toBeInTheDocument();
await user.click(screen.getByLabelText('显示专注记录'));
expect(screen.queryByText('专注 45m')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: FAIL because focus overlay is not rendered.

- [ ] **Step 3: Implement focus overlay**

Render session blocks with derived minutes:

```tsx
const minutes = Math.round((session.durationSeconds ?? 0) / 60);
return <div className="rounded-md bg-indigo-50 text-indigo-600">专注 {minutes}m</div>;
```

Use `settings.showFocusSessions` to include or hide overlay.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/components/WeekTimelineView.tsx src/modules/calendar/components/CalendarListView.tsx src/modules/calendar/components/CalendarPanel.test.tsx
git commit -m "feat: show focus records in calendar"
```

---

### Interaction Final Verification

- [ ] Run: `npm test src/modules/calendar`
- [ ] Run: `npm test`
- [ ] Run: `npm run lint`
- [ ] Run: `npm run build`
- [ ] Expected: all commands exit 0.

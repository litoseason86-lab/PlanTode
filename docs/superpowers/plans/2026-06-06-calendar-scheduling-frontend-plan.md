# Calendar Scheduling Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Calendar tab, data-loading controller, month view, list view, and basic display settings.

**Architecture:** Create `src/modules/calendar` and keep `AppShell` as a composition layer. Calendar state lives in `useCalendarController`; layout and settings are pure functions where possible.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Tailwind CSS, lucide-react.

---

## File Structure

- Modify: `src/app/navigation.ts` - add `calendar` tab.
- Modify: `src/app/AppShell.tsx` - mount `CalendarPanel`.
- Create: `src/modules/calendar/api/calendarApi.ts`
- Create: `src/modules/calendar/controllers/calendarSettings.ts`
- Create: `src/modules/calendar/controllers/calendarSettings.test.ts`
- Create: `src/modules/calendar/controllers/calendarLayout.ts`
- Create: `src/modules/calendar/controllers/calendarLayout.test.ts`
- Create: `src/modules/calendar/controllers/useCalendarController.ts`
- Create: `src/modules/calendar/controllers/useCalendarController.test.ts`
- Create: `src/modules/calendar/components/CalendarPanel.tsx`
- Create: `src/modules/calendar/components/CalendarToolbar.tsx`
- Create: `src/modules/calendar/components/CalendarSettingsMenu.tsx`
- Create: `src/modules/calendar/components/MonthCalendarView.tsx`
- Create: `src/modules/calendar/components/CalendarListView.tsx`
- Create: `src/modules/calendar/components/CalendarPanel.test.tsx`

---

### Task 1: Calendar API and Settings

**Files:**
- Create: `src/modules/calendar/api/calendarApi.ts`
- Create: `src/modules/calendar/controllers/calendarSettings.ts`
- Create: `src/modules/calendar/controllers/calendarSettings.test.ts`

- [ ] **Step 1: Write failing settings tests**

```ts
import {describe, expect, it} from 'vitest';

import {DEFAULT_CALENDAR_SETTINGS, filterTasksForCalendar} from './calendarSettings';

describe('calendarSettings', () => {
  it('defaults to showing completed tasks and focus sessions', () => {
    expect(DEFAULT_CALENDAR_SETTINGS).toMatchObject({
      showCompleted: true,
      showFocusSessions: true,
      colorMode: 'category',
      visibleCategoryIds: [],
    });
  });

  it('filters hidden categories and completed tasks', () => {
    const tasks = [
      {id: 1, categoryId: 1, status: 'DONE'},
      {id: 2, categoryId: 2, status: 'TODO'},
    ] as never;
    expect(filterTasksForCalendar(tasks, {
      ...DEFAULT_CALENDAR_SETTINGS,
      showCompleted: false,
      visibleCategoryIds: [2],
    })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm test src/modules/calendar/controllers/calendarSettings.test.ts`

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement API wrapper and settings helper**

```ts
export const DEFAULT_CALENDAR_SETTINGS = {
  visibleCategoryIds: [] as number[],
  showCompleted: true,
  colorMode: 'category' as const,
  showFocusSessions: true,
};

export type CalendarSettings = typeof DEFAULT_CALENDAR_SETTINGS;

export function filterTasksForCalendar<T extends {categoryId: number; status: string}>(
  tasks: T[],
  settings: CalendarSettings,
): T[] {
  return tasks.filter((task) => {
    if (!settings.showCompleted && task.status === 'DONE') return false;
    if (settings.visibleCategoryIds.length > 0 && !settings.visibleCategoryIds.includes(task.categoryId)) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run test and verify GREEN**

Run: `npm test src/modules/calendar/controllers/calendarSettings.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/api/calendarApi.ts src/modules/calendar/controllers/calendarSettings.ts src/modules/calendar/controllers/calendarSettings.test.ts
git commit -m "feat: add calendar settings helpers"
```

---

### Task 2: Calendar Layout Helpers

**Files:**
- Create: `src/modules/calendar/controllers/calendarLayout.ts`
- Create: `src/modules/calendar/controllers/calendarLayout.test.ts`

- [ ] **Step 1: Write failing layout tests**

```ts
expect(buildMonthGrid('2026-06-06')[0].isoDate).toBe('2026-06-01');
expect(buildWeekDays('2026-06-06').map((day) => day.isoDate)).toEqual([
  '2026-06-01',
  '2026-06-02',
  '2026-06-03',
  '2026-06-04',
  '2026-06-05',
  '2026-06-06',
  '2026-06-07',
]);
expect(getCalendarRange('week', '2026-06-06')).toEqual({dateFrom: '2026-06-01', dateTo: '2026-06-07'});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test src/modules/calendar/controllers/calendarLayout.test.ts`

Expected: FAIL because layout helpers do not exist.

- [ ] **Step 3: Implement layout helpers**

Implement:

```ts
import {toIsoDate} from '../../../../shared/lib/date';

export type CalendarView = 'month' | 'week' | 'list';
export interface CalendarDay { isoDate: string; isCurrentMonth: boolean; }

function fromIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfWeek(date: Date): Date {
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return addDays(date, -mondayOffset);
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function buildWeekDays(anchorDate: string): CalendarDay[] {
  const start = startOfWeek(fromIsoDate(anchorDate));
  return Array.from({length: 7}, (_, index) => {
    return {isoDate: toIsoDate(addDays(start, index)), isCurrentMonth: true};
  });
}

export function buildMonthGrid(anchorDate: string): CalendarDay[] {
  const anchor = fromIsoDate(anchorDate);
  const firstOfMonth = startOfMonth(anchor);
  const lastOfMonth = endOfMonth(anchor);
  const gridStart = startOfWeek(firstOfMonth);
  const totalDays = Math.ceil(((lastOfMonth.getTime() - gridStart.getTime()) / 86_400_000 + 1) / 7) * 7;
  return Array.from({length: totalDays}, (_, index) => {
    const date = addDays(gridStart, index);
    return {isoDate: toIsoDate(date), isCurrentMonth: date.getUTCMonth() === anchor.getUTCMonth()};
  });
}

export function getCalendarRange(view: CalendarView, anchorDate: string): {dateFrom: string; dateTo: string} {
  if (view === 'month') {
    const anchor = fromIsoDate(anchorDate);
    return {dateFrom: toIsoDate(startOfMonth(anchor)), dateTo: toIsoDate(endOfMonth(anchor))};
  }
  const week = buildWeekDays(anchorDate);
  return {dateFrom: week[0].isoDate, dateTo: week[6].isoDate};
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test src/modules/calendar/controllers/calendarLayout.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/controllers/calendarLayout.ts src/modules/calendar/controllers/calendarLayout.test.ts
git commit -m "feat: add calendar layout helpers"
```

---

### Task 3: Calendar Controller

**Files:**
- Create: `src/modules/calendar/controllers/useCalendarController.ts`
- Create: `src/modules/calendar/controllers/useCalendarController.test.ts`

- [ ] **Step 1: Write failing controller tests**

```ts
expect(result.current.view).toBe('week');
act(() => result.current.setView('month'));
expect(result.current.view).toBe('month');
expect(result.current.range).toEqual({dateFrom: '2026-06-01', dateTo: '2026-06-30'});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test src/modules/calendar/controllers/useCalendarController.test.ts`

Expected: FAIL because controller does not exist.

- [ ] **Step 3: Implement controller**

Controller state:

```ts
const [view, setView] = useState<CalendarView>('week');
const [anchorDate, setAnchorDate] = useState(() => toIsoDate(new Date()));
const [settings, setSettings] = useState<CalendarSettings>(() => loadCalendarSettings());
const range = useMemo(() => getCalendarRange(view, anchorDate), [view, anchorDate]);
```

Controller actions:

```ts
async function refreshCalendarData() {
  const [taskData, sessionData] = await Promise.all([
    calendarApi.getCalendarTasks(range),
    settings.showFocusSessions ? calendarApi.getFocusSessions(range) : Promise.resolve([]),
  ]);
  setTasks(filterTasksForCalendar(taskData, settings));
  setFocusSessions(sessionData);
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test src/modules/calendar/controllers/useCalendarController.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/controllers/useCalendarController.ts src/modules/calendar/controllers/useCalendarController.test.ts
git commit -m "feat: add calendar controller"
```

---

### Task 4: Calendar Shell and Navigation

**Files:**
- Modify: `src/app/navigation.ts`
- Modify: `src/app/AppShell.tsx`
- Create: `src/modules/calendar/components/CalendarPanel.tsx`
- Create: `src/modules/calendar/components/CalendarToolbar.tsx`
- Create: `src/modules/calendar/components/CalendarPanel.test.tsx`

- [ ] **Step 1: Write failing component test**

```ts
render(<CalendarPanel categories={[]} styleContext={{primary: '#000', primaryLight: '#eee', secondary: '#ccc'}} />);
expect(screen.getByRole('heading', {name: '日历'})).toBeInTheDocument();
expect(screen.getByRole('button', {name: '周'})).toBeInTheDocument();
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: FAIL because panel does not exist.

- [ ] **Step 3: Implement shell**

Add tab:

```ts
{key: 'calendar', label: '日历'}
```

Panel heading:

```tsx
<section id="calendar_view" className="space-y-6">
  <CalendarToolbar view={controller.view} setView={controller.setView} />
  <h2 className="text-xl font-extrabold text-slate-800">日历</h2>
</section>
```

- [ ] **Step 4: Run test and verify GREEN**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/navigation.ts src/app/AppShell.tsx src/modules/calendar/components/CalendarPanel.tsx src/modules/calendar/components/CalendarToolbar.tsx src/modules/calendar/components/CalendarPanel.test.tsx
git commit -m "feat: add calendar tab shell"
```

---

### Task 5: Month and List Views

**Files:**
- Create: `src/modules/calendar/components/MonthCalendarView.tsx`
- Create: `src/modules/calendar/components/CalendarListView.tsx`
- Modify: `src/modules/calendar/components/CalendarPanel.tsx`
- Modify: `src/modules/calendar/components/CalendarPanel.test.tsx`

- [ ] **Step 1: Write failing view tests**

```ts
expect(screen.getByText('2026-06-06')).toBeInTheDocument();
expect(screen.getByText('Write plan')).toBeInTheDocument();
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: FAIL because month/list views are not rendered.

- [ ] **Step 3: Implement month and list views**

Month day cell:

```tsx
<button type="button" className="min-h-28 border border-slate-100 p-2 text-left">
  <span className="text-xs font-bold text-slate-500">{day.isoDate.slice(8)}</span>
  {tasksForDay.map((task) => (
    <div key={task.id} className="mt-1 rounded-md px-2 py-1 text-[10px] font-bold" style={{backgroundColor: categoryColor}}>
      {task.title}
    </div>
  ))}
</button>
```

List group:

```tsx
<section>
  <h3 className="text-xs font-bold text-slate-500">{date}</h3>
  {tasks.map((task) => <div key={task.id}>{task.title}</div>)}
</section>
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/components/MonthCalendarView.tsx src/modules/calendar/components/CalendarListView.tsx src/modules/calendar/components/CalendarPanel.tsx src/modules/calendar/components/CalendarPanel.test.tsx
git commit -m "feat: render calendar month and list views"
```

---

### Task 6: Settings Menu

**Files:**
- Create: `src/modules/calendar/components/CalendarSettingsMenu.tsx`
- Modify: `src/modules/calendar/components/CalendarToolbar.tsx`
- Modify: `src/modules/calendar/components/CalendarPanel.test.tsx`

- [ ] **Step 1: Write failing settings test**

```ts
await user.click(screen.getByRole('button', {name: '显示设置'}));
await user.click(screen.getByLabelText('隐藏已完成'));
expect(screen.queryByText('Finished task')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: FAIL because settings menu does not exist.

- [ ] **Step 3: Implement settings menu**

Controls:

```tsx
<label>
  <input type="checkbox" checked={settings.showCompleted} onChange={toggleShowCompleted} />
  显示已完成
</label>
<label>
  <input type="checkbox" checked={settings.showFocusSessions} onChange={toggleShowFocusSessions} />
  显示专注记录
</label>
```

Category filter:

```tsx
{categories.map((category) => (
  <label key={category.id}>
    <input type="checkbox" checked={isVisible(category.id)} onChange={() => toggleCategory(category.id)} />
    {category.name}
  </label>
))}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test src/modules/calendar/components/CalendarPanel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/calendar/components/CalendarSettingsMenu.tsx src/modules/calendar/components/CalendarToolbar.tsx src/modules/calendar/components/CalendarPanel.test.tsx
git commit -m "feat: add calendar display settings"
```

---

### Frontend Foundation Verification

- [ ] Run: `npm test src/modules/calendar`
- [ ] Run: `npm run lint`
- [ ] Expected: both commands exit 0.

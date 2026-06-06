# 日历排期功能二期设计

## 背景

一期已经完成日历入口、月视图、周视图、列表视图、任务排期字段、拖拽排期、基础显示设置和专注记录展示。现在的问题不是“还能加哪些滴答功能”，而是排期效率仍然不够：用户需要先在任务库里创建任务，再手动进入日历安排，缺少一个把待办快速变成计划的任务池。

二期选择“排期效率”作为主线。年视图、日程视图、辅助时区、标签/优先级颜色、订阅日历、重复任务、习惯打卡不进入二期。当前 PlanTodo 没有这些领域模型，硬做只会扩大债务。

## 参考资料

本设计参考以下滴答清单帮助文档，只吸收适合 PlanTodo 当前模型的部分：

- 周视图：轻松安排周计划：`https://help.dida365.com/articles/6950641140068515840`
- 月视图：每月总结复盘：`https://help.dida365.com/articles/6950640298334617600`
- 年视图：查看年度任务完成情况：`https://help.dida365.com/articles/7397517843383713792`
- 列表视图：按天查看任务：`https://help.dida365.com/articles/6950643979079647232`
- 日程视图：以时间串联任务：`https://help.dida365.com/articles/7213438708429619200`
- 任务与日历同时显示：`https://help.dida365.com/articles/7358382716586295296`
- 日历显示设置：`https://help.dida365.com/articles/6950647988939128832`
- 常见问题：`https://help.dida365.com/articles/6950648670899404800`

## 目标

1. 任务支持未安排状态。
2. 日历页新增安排任务栏，让用户把未安排任务拖入日历。
3. 安排任务栏同时显示未安排任务和当前范围内的全天无时间任务。
4. 支持单任务拖拽到月视图日期格、周视图全天栏、周视图时间轴。
5. 支持多选任务，批量安排到某一天全天。
6. 支持批量取消安排，把任务移回未安排。
7. 任务页支持同时显示日历，复用日历排期能力。
8. 保持今日执行、任务库、专注、日报、周报语义清晰，不让未安排任务污染日期统计。

## 非目标

以下能力不进入二期：

- 年视图与热力图
- 日程视图
- 列表视图时间轴增强
- 月视图缩放和多周视图
- 批量安排到具体时间段
- 自动连续排程
- 任务预估时长
- 标签、优先级、重复任务、检查事项
- 农历、节假日、调休
- 辅助时区
- 订阅日历、外部日历同步
- 习惯打卡、倒数纪念日、课表

批量安排到时间段需要任务时长或自动排布规则。PlanTodo 当前没有预估时长字段，二期不做伪智能排程。

## 分期

### Phase 2.1：日历页安排任务栏

日历页右侧新增安排任务栏。用户可以从任务栏拖动任务到月视图、周视图全天栏或周视图时间轴。

安排任务栏显示两类任务：

- 未安排任务：没有 `plannedDate`。
- 当前日历范围内的单日全天无时间任务：`allDay=true`，有 `plannedDate`，无 `plannedEndDate/startAt/endAt`。

跨天全天任务不进入安排任务栏。跨天任务本身已经是明确排期，把它放进待安排池会造成重复展示和批量取消歧义。

Phase 2.1 必须支持：

- 单任务拖拽排期。
- 多选任务。
- 批量安排到日期，统一变成全天任务。
- 批量取消安排，移回未安排。
- 按分类和关键词筛选安排栏任务。

Phase 2.1 拆成阶段门：

- Phase 2.1a：`plannedDate` 可空模型、schema、API、JSON/SQLite 迁移、导入脚本。
- Phase 2.1b：安排任务栏只读加载、空态、加载态、搜索、分类过滤。
- Phase 2.1c：单任务拖拽到月视图日期格、周视图全天栏、周视图时间轴。
- Phase 2.1d：多选、批量安排到日期、批量取消安排。

### Phase 2.2：任务页同时显示日历

任务页增加“显示日历”入口，在任务清单右侧嵌入日历。嵌入日历复用 Phase 2.1 的排期 action、拖拽协议和 API，不重新实现一套日历逻辑。

任务页筛选条件不直接污染日历视图范围。任务页和日历通过拖拽排期和共享 API 交互。

Phase 2.2 拆成阶段门：

- Phase 2.2a：嵌入式日历只读展示，初始锚点日期跟随当前 `selectedDate`。
- Phase 2.2b：任务页列表项可拖入嵌入式日历，复用同一排期 action。
- Phase 2.2c：验证 `TasksPanel` 不直接调用排期 API，嵌入日历只通过共享 action 工作。

## 数据模型

`Task.plannedDate` 改为可选：

```ts
export interface Task {
  id: number;
  userId: number;
  categoryId: number;
  title: string;
  plannedDate?: string;
  plannedEndDate?: string;
  startAt?: string;
  endAt?: string;
  allDay: boolean;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}
```

任务排期形态：

| 形态 | 字段规则 | 展示位置 |
| --- | --- | --- |
| 未安排任务 | 无 `plannedDate`，无 `plannedEndDate/startAt/endAt`，`allDay=true` | 安排任务栏、任务库 |
| 日期任务 | `plannedDate` + `allDay=true`，无 `startAt/endAt` | 月视图日期格、周视图全天栏、列表视图日期组、安排任务栏 |
| 跨天全天任务 | `plannedDate` + `plannedEndDate` + `allDay=true` | 月视图跨天条、周视图全天栏 |
| 时间段任务 | `plannedDate` + `startAt/endAt` + `allDay=false` | 周视图时间轴、列表视图时间段 |

二期继续拒绝跨天时间段任务。如果用户需要跨天任务，必须使用全天跨日期任务。

API wire format：

- 创建未安排任务：`POST /api/tasks` 可省略 `plannedDate`，也可传 `plannedDate: null`。
- 取消安排：请求体可省略 `plannedDate`，也可传 `plannedDate: null`。
- 服务端内部统一归一化为 `plannedDate === undefined`。
- HTTP 响应中未安排任务省略 `plannedDate/plannedEndDate/startAt/endAt` 字段。

## 后端设计

### Task service

排期校验规则：

- `plannedDate` 为空时，必须清空 `plannedEndDate/startAt/endAt`，并保存为 `allDay=true`。
- `allDay=true` 时，清空 `startAt/endAt`。
- `plannedEndDate` 不能早于 `plannedDate`。
- `allDay=false` 时必须有 `plannedDate/startAt/endAt`。
- `endAt` 必须晚于 `startAt`。
- 时间段任务的 `startAt/endAt` 必须与 `plannedDate` 同一天。

新增批量能力：

- 批量安排到日期：多个任务统一写入同一 `plannedDate`，清空时间段，保存为 `allDay=true`。
- 批量取消安排：多个任务清空 `plannedDate/plannedEndDate/startAt/endAt`，保存为 `allDay=true`。

批量接口采用整体失败策略。任一任务不存在或不属于当前用户时，整个请求失败，不做部分成功。

批量实现必须保证原子性：

- service 先校验所有 `taskIds` 非空、非重复、均为数字、任务存在且属于当前用户。
- SQLite repository 在单个 transaction 内批量写入。
- JSON repository 在单个 store update 回调内完成校验后的批量写入。
- 任一校验失败时，不修改任何任务。

### Repository filters

任务过滤需要支持：

```ts
export interface TaskFilters {
  userId: number;
  plannedDate?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: TaskStatus;
  categoryId?: number;
  scheduled?: 'unscheduled' | 'scheduled' | 'all-day-without-time';
  query?: string;
}
```

语义：

- `scheduled=unscheduled`：只返回无 `plannedDate` 的任务。
- `scheduled=scheduled`：只返回有 `plannedDate` 的任务，包含日期任务、跨天全天任务和时间段任务。
- `scheduled=all-day-without-time`：返回有日期、全天、无 `plannedEndDate/startAt/endAt` 的单日任务，可结合 `dateFrom/dateTo`。
- 不传 `scheduled` 且不传日期参数：返回全量任务，包含未安排任务。
- 不传 `scheduled` 但传 `plannedDate/dateFrom/dateTo`：只返回与日期条件匹配的已安排任务，排除未安排任务。
- `scheduled=unscheduled` 不允许与 `date/plannedDate/dateFrom/dateTo` 同传；同传返回 `400`。
- `query` 只搜索任务标题，前后 trim，大小写不敏感。SQLite `LIKE` 中的 `%`、`_` 需要转义。

共享排期工具需要明确未安排语义：

- `toCanonicalTask` 支持 `plannedDate` 为空。
- `getTaskScheduleKind` 对未安排任务返回 `unscheduled`。
- `taskIntersectsDateRange` 对未安排任务返回 `false`。
- 日期范围查询不能依赖 `undefined` 字符串比较的偶然行为。

### HTTP API

保留现有接口，并扩展：

```txt
GET /api/tasks?scheduled=unscheduled
GET /api/tasks?scheduled=all-day-without-time&dateFrom=2026-06-01&dateTo=2026-06-07
PATCH /api/tasks/:id/schedule
PATCH /api/tasks/batch-schedule
PATCH /api/tasks/batch-unschedule
```

实现时静态 batch 路由必须放在参数路由前，防止未来新增 `PATCH /api/tasks/:id` 时产生路由歧义。

批量安排请求：

```json
{
  "taskIds": [1, 2, 3],
  "plannedDate": "2026-06-06"
}
```

批量取消安排请求：

```json
{
  "taskIds": [1, 2, 3]
}
```

## 存储设计

### SQLite

现有 `planned_date` 需要允许为空。迁移策略：

- 新建 V4 migration，重建 `tasks` 表，不能写成简单 `ALTER COLUMN`。
- 创建 `tasks_new`，其中 `planned_date TEXT` 可空。
- 复制旧表全部列到 `tasks_new`，旧任务原 `planned_date` 保持不变。
- 删除旧 `tasks`，重命名 `tasks_new` 为 `tasks`。
- 重建索引：`idx_tasks_user_date`、`idx_tasks_user_status`、`idx_tasks_user_category`、`idx_tasks_planned_end_date`、`idx_tasks_start_at`。
- 用 `pragma table_info(tasks)` 验证 `planned_date.notnull = 0`。
- 旧任务保持原 `planned_date`，不会自动变成未安排。
- 新增/更新 repository mapper，允许 `plannedDate` 为 `undefined`。

### JSON

JSON repository 读旧数据时保持兼容：

- 旧任务有 `plannedDate`：按已安排任务读取。
- 新任务可无 `plannedDate`：按未安排任务读取。
- 写入时保留 `plannedDate` 可选语义。

### JSON 到 SQLite 导入

导入逻辑同步支持 `plannedDate?: string | null`。旧 JSON 仍按旧日期导入；新 JSON 未安排任务导入为 `planned_date = NULL`，同时清空 `planned_end_date/start_at/end_at`，并写入 `all_day = 1`。

## 前端设计

### Calendar module

新增：

```txt
src/modules/calendar/components/SchedulingSidebar.tsx
src/modules/calendar/controllers/useSchedulingSidebarController.ts
src/modules/calendar/controllers/schedulingSelection.ts
src/modules/calendar/controllers/schedulingDrag.ts
src/modules/calendar/controllers/useTaskSchedulingActions.ts
```

职责：

- `SchedulingSidebar`：展示任务池、搜索、分类过滤、多选、批量动作。
- `useSchedulingSidebarController`：加载未安排任务和全天无时间任务，管理选择状态，调用批量 API。
- `schedulingSelection`：纯函数处理多选、全选、反选、清空选择。
- `schedulingDrag`：定义拖拽 payload，区分单任务和多任务。
- `useTaskSchedulingActions`：统一排期 mutation，提供 `scheduleDate`、`scheduleTime`、`moveTimedTask`、`batchScheduleDate`、`batchUnschedule`，并通过 `onMutationSuccess` 触发日历、任务池、任务页刷新。

`CalendarPanel` 只负责装配，不承接选择状态和批量排期细节。

### 拖拽协议

单任务新排期：

```ts
interface SingleTaskScheduleDragPayload {
  type: 'calendar-task';
  taskId: number;
  source: 'sidebar' | 'task-list' | 'calendar';
}
```

多任务：

```ts
interface MultiTaskDragPayload {
  type: 'calendar-task-batch';
  taskIds: number[];
  source: 'sidebar' | 'task-list';
}
```

已有时间段任务移动：

```ts
interface TimedTaskMoveDragPayload {
  type: 'calendar-timed-task';
  taskId: number;
  durationMinutes: number;
}
```

拖拽数据使用 `application/x-plantodo-calendar-task`。一期已有 `text/plain` 和 `application/json` 读取逻辑保留为兼容路径，但新代码优先读专用 MIME。

落点行为：

- 月视图日期格：单任务或多任务都安排为当天全天任务。
- 周视图全天栏：新增 `onScheduleDate` 和 `onBatchScheduleDate` props，单任务或多任务都安排为当天全天任务。
- 周视图时间轴：只接受单任务，安排为默认 60 分钟时间段；多任务落入时间轴时显示错误提示。
- 周视图时间轴移动已有时间段任务时，必须保留原 `durationMinutes`。

安排任务栏选择语义：

- 全选只作用于当前筛选结果中已加载的任务。
- 搜索条件、分类过滤、日历范围变化时清空选择。
- 批量取消安排允许混合选择未安排和已安排任务；未安排任务保持未安排，已安排任务移回未安排。
- 成功排期后统一刷新日历数据、安排任务栏数据和任务页数据。
- 二期不做乐观更新。mutation 成功后再刷新；失败时显示错误，现有 UI 状态不变。

### 任务页同时显示日历

`TasksPanel` 增加“显示日历”入口。开启后布局变为任务列表 + 嵌入日历。

新增：

```txt
src/modules/calendar/components/EmbeddedCalendarPanel.tsx
```

`EmbeddedCalendarPanel` 复用 calendar API 和排期 action，只减少工具栏和边距，不复制业务逻辑。

为避免复制逻辑，新增共享展示层：

```txt
src/modules/calendar/components/CalendarSurface.tsx
```

`CalendarPanel` 和 `EmbeddedCalendarPanel` 都使用 `CalendarSurface` 渲染月/周/列表视图；差异只来自外层布局、工具栏密度和是否显示安排任务栏。

任务页列表项可以拖入嵌入式日历。落点行为与日历页一致：日期格/全天栏安排为全天任务，时间轴安排为默认 60 分钟时间段。

## 现有模块影响

### Dashboard / 今日执行

今日执行继续按 `plannedDate` 查询。未安排任务不显示在今日执行。

今日页创建任务默认使用当前选中日期。

### Tasks / 任务库

任务库默认显示全量任务，包括未安排任务。任务库增加未安排筛选。

任务库创建任务默认未安排，除非用户明确选择日期。

任务库未安排任务显示“未安排”文案，不再假设 `plannedDate.slice(...)` 存在。日期筛选逻辑需要显式处理未安排任务：按日期筛选时排除未安排；全量和未安排筛选时包含未安排。

### Calendar / 日历

日历日期格创建任务默认使用对应日期。

安排任务栏展示未安排任务和当前范围内全天无时间任务。

### Reports / 报表

日报、周报不把未安排任务归入某个日期。任务库统计可以包含未安排任务。

如果后续需要按完成日期统计未安排任务，应单独设计完成日期字段，不在二期混入。

未安排任务不计入日报/周报任务完成率。未安排任务产生的专注记录仍按 session 日期计入专注时长，因为专注统计的归属是执行时间，不是任务排期日期。

周报跨天全天任务计数保持现有口径：按每日安排量统计，而不是唯一任务数去重。二期不改周报跨天统计口径。

### Focus / 专注

未安排任务可以启动专注。专注是执行行为，不等于排期行为。

未安排任务的专注记录仍可出现在专注模块中，但不会让任务自动归属到某一天的日历排期。

## 错误处理

- 单任务排期失败：显示错误 toast，任务池不变。
- 批量排期失败：整体失败，显示错误 toast，任务池不变。
- 批量取消安排失败：整体失败，显示错误 toast，任务池不变。
- 多任务拖到时间轴：前端直接拒绝，提示“批量任务只能安排到日期”。
- 后端返回明确错误：任务不存在、日期非法、跨天时间段不支持、批量任务为空。
- 批量失败错误需要指出原因类型，例如空任务列表、任务不存在、无权限、日期非法。二期不要求列出所有失败任务标题。

## 测试策略

### 后端测试

- schema 支持 `plannedDate` 可空。
- 创建未安排任务。
- `POST /api/tasks` 不传 `plannedDate` 创建未安排任务。
- `POST /api/tasks` 传 `plannedDate: null` 创建未安排任务。
- 未安排任务响应省略 `plannedDate`。
- 查询未安排任务。
- 查询全天无时间任务。
- `scheduled=scheduled` 查询只返回有日期任务。
- `scheduled=unscheduled` 与日期参数同传返回 `400`。
- 批量安排到日期。
- 批量取消安排。
- 批量请求空 `taskIds`、重复 ID、非数字 ID、跨用户 ID、部分不存在 ID 都整体失败。
- 批量失败后 SQLite/JSON 中所有任务无变化。
- 时间段任务仍拒绝跨天。
- 日期范围查询不包含未安排任务。
- 任务库全量查询包含未安排任务。
- 报表不把未安排任务归入日期统计。
- 未安排任务的专注记录仍按 session 日期计入专注时长。
- JSON/SQLite 旧数据兼容。
- SQLite V4 迁移后 `planned_date` 可空，旧任务日期保留。
- JSON 导入未安排任务写入 SQLite `planned_date = NULL`。
- `taskIntersectsDateRange` 对未安排任务返回 `false`。

### 前端测试

- 安排任务栏渲染未安排任务。
- 安排任务栏渲染当前范围内全天无时间任务。
- 搜索和分类过滤任务池。
- 全选只选择当前筛选结果，筛选变化后清空选择。
- 单任务拖到月视图日期格。
- 单任务拖到周视图全天栏。
- 单任务拖到周视图时间轴。
- 已有时间段任务在周视图时间轴拖动后保留原 duration。
- 多选任务批量安排到日期。
- 多选任务批量取消安排。
- 多选任务拖到时间轴被拒绝。
- 任务页列表项可拖入嵌入式日历。
- 任务页同时显示日历时复用同一排期 action，`TasksPanel` 不直接调用排期 API。
- 未安排任务在任务库显示“未安排”，日期筛选不报错。

### 回归测试

继续跑：

```bash
npm test
npm run lint
npm run build
```

今日执行、任务库、专注、日报、周报、日历一期测试必须继续通过。

## 验收标准

1. 用户可以创建未安排任务。
2. 任务库可以看到未安排任务，并按未安排筛选。
3. 今日执行不显示未安排任务。
4. 日历页右侧可以打开安排任务栏。
5. 安排任务栏展示未安排任务和当前范围内全天无时间任务。
6. 用户可以把单个任务拖到月视图日期格安排为全天任务。
7. 用户可以把单个任务拖到周视图全天栏安排为全天任务。
8. 用户可以把单个任务拖到周视图时间轴安排为默认 60 分钟时间段。
9. 用户可以多选任务并批量安排到某一天。
10. 用户可以批量取消安排，把任务移回未安排。
11. 多选任务拖到时间轴会被拒绝并提示原因。
12. 安排任务栏支持按分类和关键词筛选。
13. 任务页可以同时显示日历。
14. 任务页列表项可以拖入嵌入式日历完成排期。
15. `TasksPanel` 不直接调用排期 API，嵌入日历通过共享 action 排期。
16. 未安排任务不污染日报、周报日期任务统计。
17. 未安排任务的专注记录仍按 session 日期计入专注时长。
18. 一期日历能力和现有核心模块测试继续通过。

## 风险

### 核心模型风险

`plannedDate` 可空会影响任务创建、查询、报表、导入、SQLite schema。必须先改后端和共享类型，再做前端安排栏。

所有 `plannedDate.slice(...)`、日期比较和表单默认日期逻辑都必须显式处理未安排任务。不能依赖 JavaScript 对 `undefined` 的隐式行为。

### 批量状态风险

批量操作容易出现部分成功。二期采用整体失败策略，降低用户理解成本和实现复杂度。

实现层必须使用 transaction 或单次 store update 保证原子性。循环调用单任务更新不满足二期设计。

### 跨模块复用风险

任务页同时显示日历容易复制一套日历逻辑。必须抽出可复用排期 action 和嵌入式日历组件，避免 `TasksPanel` 直接承接日历业务。

拖拽协议必须兼容一期已有时间段移动。新 payload 不能覆盖 `durationMinutes`，否则会破坏“移动时间段任务并保留时长”的现有行为。

### 范围膨胀风险

年视图、日程视图、辅助时区、标签优先级颜色、订阅日历都来自参考资料，但当前 PlanTodo 不具备对应领域模型。二期不做这些功能。

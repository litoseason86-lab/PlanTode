# 今日执行页 Timeline Layout A1 设计规格书

## 1. 目标

今日执行页需要帮助用户快速判断“现在做什么、哪里有空隙、是否已经进入专注状态”。Layout A1 采用左侧时间刻度、任务节点和自动 Gap 节点，把有明确时间段的今日任务组织成可读的执行流，同时保留今日页原有的快速创建、开始/停止专注、完成、搁置、重置和完成后反馈能力。

本设计只作用于今日执行页，不改任务库、完整日历页、周时间线排期交互，也不把今日快速创建升级成任务库表单。

## 2. 当前边界

当前今日执行页由 `src/modules/dashboard/components/DashboardPanel.tsx` 渲染，由 `src/app/AppShell.tsx` 装配。派生数据在 `src/modules/dashboard/controllers/useDashboardController.ts`，轻量快速创建在 `src/modules/dashboard/controllers/useTodayQuickCreateController.ts`。

设计必须遵守这些边界：

- `AppShell` 只装配数据和回调，不放 timeline 计算。
- dashboard controller/helper 负责今日执行页派生数据。
- dashboard components 只渲染状态和发出用户意图。
- 今日快速创建继续只包含标题和分类，提交 `tagIds: []`、`priority: null`。
- 任务库和日历继续负责管理态编辑和排期，不被今日页 A1 反向耦合。

## 3. 非目标

- 不在今日快速创建中展示标签或优先级。
- 不实现拖拽排期。
- 不改 `CalendarPanel`、`WeekTimelineView` 或任务库筛选语义。
- 不把 Gap 当成可创建任务的交互入口。
- 不把可视化演练页面作为产品页面发布；它只作为算法解释和验收参考。

## 4. 数据模型

新增今日执行页专用 helper：

```txt
src/modules/dashboard/controllers/todayTimelineFlow.ts
src/modules/dashboard/controllers/todayTimelineFlow.test.ts
```

核心类型：

```typescript
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
```

`TodayTimelineFlowItem` 只表达“有时间段任务 + 这些任务之间的全局空隙”。无时间任务、全天任务、无效时间任务不进入该 flow，它们进入“今日待执行队列”。

## 5. Gap 推演算法

输入是当前选中日期的任务列表。算法只处理同时满足以下条件的任务：

- `allDay === false`
- `startAt` 和 `endAt` 都存在
- `startAt` 到 `endAt` 的本地时间区间与当前选中日期存在交集
- 当日可见区间满足 `endMinutes > startMinutes`

算法步骤：

1. 把任务在当天的可见区间裁剪并折算成 `[startMinutes, endMinutes]`。跨天任务只取当前选中日期内的可见片段。
2. 按 `startMinutes`、`endMinutes`、`taskId` 排序。
3. 使用区间并集合并 busy interval。相邻或重叠区间按连续忙碌处理：`next.startMinutes <= current.endMinutes` 时合并。
4. 只在紧凑边界内求补：边界是第一个 timed task 的开始到最后一个 timed task 的结束，不生成首尾外溢 Gap。
5. 相邻 busy interval 间隔 `>= 15` 分钟时生成 Gap。
6. 返回按时间排序的任务节点和 Gap 节点。同一时间点时 task 优先，Gap 不应插到任务开始点之前。

## 6. 四场景实时演练验收矩阵

这些场景必须与伴随页面 `algorithm-visualization.html` 的推演结果一致。

| 场景 | 输入任务区间 | 期望 Gap | 期望说明 |
| --- | --- | --- | --- |
| 标准流图 | `09:00-10:30`, `11:30-12:30` | `10:30-11:30`，60 分钟 | 有明显间隙时插入 1 个 Gap 折叠块 |
| 重合车道图 | `09:00-10:30`, `10:00-11:30` | 无 Gap | 先做全局 busy 并集，不能生成局部假空闲 |
| 嵌套包含图 | `09:00-12:00`, `10:00-11:00` | 无 Gap | 大任务覆盖整段时，全局无空闲 |
| 碎间隔图 | `09:00-10:00`, `10:30-11:15`, `12:00-13:00` | `10:00-10:30` 30 分钟；`11:15-12:00` 45 分钟 | 提取多个独立 Gap，且不生成 `00:00-09:00` 或 `13:00-24:00` 首尾 Gap |

实现验收必须断言每个 Gap 的 `startMinutes`、`endMinutes`、`durationMinutes` 和 render item 顺序。

## 7. 页面信息层级

今日执行页 A1 的优先级是执行，不是展示算法。

页面结构：

1. 顶部今日概览：日期、待完成数、已完成数、今日专注分钟。
2. 完成后反馈面板：保持现有行为，用户可把刚停止专注的任务标记完成或稍后处理。
3. 快速创建栏：标题、分类、创建按钮，创建中禁用，失败保留输入。
4. 当前行动区：如果有运行中的专注任务，置顶显示并突出“停止”操作。
5. 时间线执行流：显示有时间段任务和 Gap 节点。
6. 今日待执行队列：显示无时间任务、全天任务、无效时间任务，仍提供专注/完成/搁置/重置。
7. 已完成/已搁置任务：灰显保留，不抢占当前行动。

Gap 节点只表达“这里有空闲”，不能压过任务操作按钮。建议文案格式：

```txt
空闲 60 分钟 10:30-11:30
```

Gap 节点必须有稳定可测的 `aria-label`，同样使用上述文案。

## 8. 状态规则

- 无任务：显示现有空状态语义，提示从快速创建栏添加今日行动项。
- 只有无时间任务或全天任务：不显示空时间线，直接显示今日待执行队列。
- 有运行中专注任务：该任务在当前行动区置顶；它在时间线或队列中的原节点仍可显示为进行中，但不能出现两个“停止”主按钮。
- 创建中：快速创建输入、分类选择和提交按钮禁用。
- 无分类：快速创建保持禁用或提交时报错，继续使用 `useTodayQuickCreateController` 的现有错误文案。
- 完成任务：保留在页面但降低视觉权重。
- 搁置任务：保留在页面，显示搁置状态并允许重置。
- 移动端或窄屏：时间栏缩窄但不遮挡任务标题和操作按钮，操作按钮可换行。

## 9. 组件拆分

`DashboardPanel.tsx` 不应继续扩张成更大的单文件。A1 实现应拆出今日页内部组件：

```txt
src/modules/dashboard/components/TodaySummaryHeader.tsx
src/modules/dashboard/components/TodayQuickCreateBar.tsx
src/modules/dashboard/components/TodayFocusFeedback.tsx
src/modules/dashboard/components/TodayCurrentAction.tsx
src/modules/dashboard/components/TodayTimelineFlow.tsx
src/modules/dashboard/components/TodayTimelineTaskNode.tsx
src/modules/dashboard/components/TodayTimelineGapNode.tsx
src/modules/dashboard/components/TodayTaskQueue.tsx
```

拆分后的组件仍由 `DashboardPanel` 组合。共享行为通过 props 输入，不直接调用 API。

## 10. 测试要求

纯函数测试：

- 四场景实时演练矩阵。
- 小于 15 分钟的间隔不生成 Gap。
- 贴边区间不生成 0 分钟 Gap。
- 无 timed task 返回空 flow。
- 无效区间不进入 flow。

controller 测试：

- `useDashboardController` 暴露 timeline flow 和今日待执行队列。
- 运行中专注分钟仍被计入任务专注分钟。
- 分类专注统计不退化。

组件测试：

- 快速创建仍可提交当前选中日期任务。
- 创建中禁用输入、分类和按钮。
- Gap 节点显示稳定文案和 `aria-label`。
- 有运行中任务时显示当前行动区和停止按钮。
- 完成后反馈面板仍可标记完成和稍后处理。
- 无任务、只有无时间任务、只有 timed task、多 Gap 场景均可渲染。

浏览器级视觉检查：

- 桌面宽度下左侧时间栏、轨迹线、任务卡、Gap 节点不重叠。
- 窄屏下按钮换行后仍可点击，文本不溢出。
- 伴随页面四场景的推演结果和产品内纯函数测试一致。

## 11. 审查结论

当前旧版 spec 不能直接进入实现。它遗漏碎间隔图和实时演练验收，且把今日执行页方案误绑定到日历 `WeekTimelineView`。本修订版把 A1 收束到 dashboard 模块，并把四场景算法、核心执行状态和测试分层写成可验收要求。

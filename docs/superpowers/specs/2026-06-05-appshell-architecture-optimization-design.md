# AppShell 架构优化设计

## 背景

`src/app/AppShell.tsx` 当前约 688 行。问题不只是文件长，而是它承接了过多职责：

- 全局导航、主题、toast 展示
- 分类、任务、专注、日报、周报的数据加载
- 分类和任务表单状态
- 任务创建、状态更新、删除后的刷新编排
- 专注会话开始、暂停、继续、停止和计时器生命周期
- 日报、周报统计数据加载
- dashboard 派生数据计算和页面装配

这使 `AppShell` 成为前端事实上的应用服务层。继续加功能会持续增加同一文件的分支、副作用和状态耦合，最终表现为修改慢、回归风险高、测试困难。

## 目标

本轮只处理前端 `AppShell` 债务，目标如下：

1. 将 `AppShell` 从业务编排中心降级为页面组合层。
2. 将数据加载、命令编排、表单状态和计时器生命周期按业务域拆到 controller hook。
3. 保留当前 UI、API、后端行为和用户交互语义。
4. 让后续新增任务、分类、专注、报表功能时优先修改对应模块，而不是持续改 `AppShell`。
5. 保持测试可验证，避免无边界的大重构。

## 非目标

以下内容不属于本轮：

- 不引入 Zustand、Redux、TanStack Query 等新状态或请求库。
- 不重做页面视觉设计。
- 不重构后端。
- 不改变 API contract。
- 不改变任务、分类、专注、报表的业务规则。
- 不拆分所有现有 panel 组件的内部结构。
- 不追求一次性把所有 prop drilling 消灭。

引入状态库现在收益不足。当前真正的问题是职责边界缺失，不是 React 缺少全局状态工具。

## 推荐方案

采用“按业务域提取 controller hook，保留现有页面组件”的增量方案。

`AppShell` 继续负责：

- 当前激活 tab
- 当前主题
- 顶层布局
- 页面组件装配
- 将 controller 返回的状态和动作传给 panel

业务模块负责自己的状态和副作用：

- 分类模块管理分类弹窗、表单、保存、删除
- 任务模块管理任务表单、筛选、创建、状态变更、删除
- 专注模块管理运行中会话、计时器、开始、暂停、继续、停止
- 报表模块管理日报/周报日期、加载状态、统计数据
- app 层管理 toast 和跨模块共享数据刷新

这个方案比直接引入全局 store 更稳。它先把职责归位，等后续真的出现跨页面共享复杂状态，再决定是否需要额外状态库。

## 目录结构

新增或扩展：

```txt
src/app/hooks/useToast.ts
src/app/hooks/useAppData.ts
src/app/components/AppHeader.tsx
src/app/components/AppToast.tsx
src/app/components/GlobalRunningBar.tsx

src/modules/categories/controllers/useCategoryActions.ts
src/modules/tasks/controllers/useTaskActions.ts
src/modules/focus/controllers/useFocusSessionController.ts
src/modules/reports/controllers/useReportStatsController.ts
```

保留现有：

```txt
src/modules/*/components
src/modules/*/api
src/modules/*/controllers
src/app/navigation.ts
src/app/theme.ts
```

现有 controller 中的纯计算函数继续保留。例如 `buildDailyReportMetrics`、`buildWeeklyReviewMetrics`、`filterTasks`、`calculateEffectiveFocusSeconds` 不迁移到 `AppShell` 之外的新位置，除非提取 hook 时自然复用。

## 模块职责

### useToast

负责：

- `successMsg`
- `errorMsg`
- `showToast`
- `clearSuccess`
- `clearError`

它不依赖业务模块，只提供 app 层提示能力。

### useAppData

负责共享数据：

- `categories`
- `tasks`
- `allTasks`
- `selectedDate`
- `selectedDateSessions`
- `loading`

提供刷新方法：

- `loadMetaData`
- `loadTasksForSelectedDate`
- `refreshCategories`
- `refreshAllTasks`
- `setLoading`
- `setSelectedDate`

它可以调用 `categoriesApi`、`tasksApi`、`focusApi`，但不处理具体业务命令。例如创建任务、删除分类不放进这里。

### useCategoryActions

负责分类交互状态：

- 分类弹窗开关
- 当前编辑分类
- 分类表单字段
- 打开新增/编辑弹窗
- 保存分类
- 删除分类

它依赖 `categories`、`refreshCategories`、`setLoading`、`showToast`。保存和删除失败时在 hook 内转译错误提示。

### useTaskActions

负责任务交互状态和任务命令：

- 任务标题、分类、日期表单
- 任务库筛选状态
- `filteredTaskItems`
- 创建任务
- 更新任务状态
- 删除任务

它依赖共享数据刷新方法、当前 running session 信息、报表刷新回调和 toast。

任务删除时必须继续保持现有行为：

- 删除运行中任务时清空运行中会话
- 删除刚完成任务时清空 `lastFinishedSessionTask`
- 同步刷新当前日期任务和全部任务
- 当前在日报/周报 tab 时刷新对应统计

### useFocusSessionController

负责专注状态：

- `runningSession`
- `focusTimeElapsed`
- `lastFinishedSessionTask`
- 启动会话
- 停止会话
- 暂停会话
- 继续会话
- 初始化检查运行中会话
- 运行中计时器 effect
- `formattedElapsed`
- `progressOffset`

暂停状态必须继续冻结计时，且不把暂停时间计入有效专注时长。

停止会话后继续保持现有行为：

- 找到对应 task，写入 `lastFinishedSessionTask`
- 清空 running session
- 切回今日执行 tab
- 刷新当前日期任务和全部任务

### useReportStatsController

负责报表状态：

- `dailyReportDate`
- `dailyTasks`
- `dailySessions`
- `prevDailySessions`
- `dailyStatsLoaded`
- `weeklyStartDate`
- `weeklyDaysData`
- `weeklyStatsLoaded`
- `dailyMetrics`
- `weeklyMetrics`
- `loadDailyStats`
- `loadWeeklyStats`

日报/周报加载仍只在对应 tab 激活或日期变化时触发。

## 组件拆分

`AppShell` 中的纯 UI 壳层拆出：

- `AppHeader`：品牌、导航、主题切换、专注 tab 按钮。
- `AppToast`：成功和错误提示。
- `GlobalRunningBar`：非专注页底部运行中提示条。

这些组件不调用 API，不持有业务规则。它们只接收 props 并触发回调。

## 数据流

顶层数据流保持单向：

1. `AppShell` 初始化 app hooks。
2. hooks 返回状态、派生数据和命令。
3. `AppShell` 将它们传给 panel 组件。
4. panel 触发命令。
5. 命令 hook 调 API 并调用共享刷新方法。
6. 刷新后的状态重新驱动 UI。

跨模块刷新通过显式回调完成，不使用隐式事件总线。

## 错误处理

沿用当前策略：

- 用户可感知的命令失败通过 toast 展示。
- 初始化、后台统计加载失败可以记录 `console.error`，不阻塞页面主流程。
- 错误文案使用 `getErrorMessage(error, fallback)` 统一兜底。

`getErrorMessage` 可移动到 `src/shared/api` 或 `src/app/errors.ts`，但本轮只在需要复用时移动，避免过度抽象。

## 测试策略

本轮以“行为不变”为核心：

1. 保留现有组件、controller、API 测试。
2. 对新增 hook 中的非平凡纯逻辑补测试，例如任务筛选派生、专注 elapsed 计算仍复用现有测试。
3. 不为了测试 hook 细节而大量 mock React 生命周期；能通过现有 panel 测试覆盖的行为不重复铺测试。
4. 每个阶段运行 `npm run lint`、`npm test`、`npm run build`。

## 实施顺序

1. 提取 app 层 toast 和壳层 UI 组件。
2. 提取共享数据 hook。
3. 提取分类 action hook。
4. 提取任务 action hook。
5. 提取专注 session hook。
6. 提取报表 stats hook。
7. 收缩 `AppShell` props 装配，删除重复和死代码。
8. 运行完整验证。

这个顺序从低风险到高耦合推进。专注和任务互相影响较多，放在共享数据和分类稳定之后处理。

## 验收标准

- `src/app/AppShell.tsx` 降到 350 行以内，理想范围 250-320 行。
- `AppShell` 不直接调用 `categoriesApi`、`tasksApi`、`focusApi`。
- `AppShell` 不直接维护分类表单、任务表单、报表数据数组、计时器 ref。
- 当前功能行为不变：
  - 新建任务
  - 删除任务
  - 修改任务状态
  - 新增/编辑/删除分类
  - 开始/暂停/继续/停止专注
  - 今日统计、日报、周报展示
- `npm run lint` 通过。
- `npm test` 通过。
- `npm run build` 通过。

## 风险

主要风险是 hook 之间回调依赖过多，形成新的“隐形 AppShell”。控制方式：

- hook 只接收必要依赖，不接收整个 app state 对象。
- 刷新函数命名要明确，不传模糊的 `reload`。
- 不在 hook 之间互相 import 对方，跨域协作通过 `AppShell` 传入回调。
- 每次提取后运行验证，避免最后一次性排雷。


# 任务标签与优先级模型设计

## 背景

周视图效率规格不纳入标签和优先级。原因是标签与优先级不是“安排没有时间的任务”的 UI 小问题，而是任务系统的新领域维度。它会影响任务实体、SQLite/JSON 存储、API schema、任务创建与编辑、任务库筛选、安排任务栏分组、导入迁移和前后端测试。

本规格独立建设真实的 `tags` 与 `priority` 模型，并让任务库和安排任务栏可以消费这些维度。它不重构排期模型，不改变状态流转，不改变专注记录。

## 已确认决策

1. `tags` 是真实用户级标签实体，不是任务内嵌字符串。
2. `priority` 是固定枚举：`P1/P2/P3/P4/null`，不支持自定义优先级。
3. 本期补任务基础信息编辑入口：标题、分类、标签、优先级。
4. 任务状态和排期继续使用现有接口，不并入基础信息编辑。
5. 标签支持任务创建/编辑内联新增，同时在组织管理页支持新增、重命名、删除。
6. 标签不支持颜色、排序、层级和图标。
7. 安排任务栏本期支持分类、标签、优先级筛选与分组，但不改变拖拽和批量安排语义。
8. 今日页快速创建保持轻量，不展示标签和优先级，默认创建空标签、无优先级任务。

## 进入本期

- 新增 `Tag` 和 `TaskTag` 领域模型。
- `Task` 增加 `priority` 与 `tagIds`。
- SQLite v5 migration 增加 `tasks.priority`、`tags`、`task_tags`。
- JSON 存储增加 `tags`、`taskTags`、`sequences.tags`。
- JSON 到 SQLite 导入脚本支持标签和任务标签关联。
- 新增 tags 后端模块和 `/api/tags` CRUD。
- 扩展任务创建、任务查询和任务基础信息更新 API。
- 任务库创建表单支持标签和优先级。
- 任务列表提供基础信息编辑弹窗。
- 任务库筛选支持分类、标签、优先级、状态、日期和搜索。
- 组织管理页拆成分类区和标签区。
- 安排任务栏支持筛选和分组方式。

## 不进入本期

- 标签颜色、标签排序、标签层级、标签图标。
- 标签统计、标签报表、标签专注时长聚合。
- 标签推荐、智能补全、自动分类。
- 标签合并、导入导出 UI、跨用户共享。
- 标签或优先级批量编辑。
- 今日页快速创建展示或编辑标签/优先级。
- 日历快速创建浮层展示或编辑标签/优先级。
- 任务列表或今日列表强化展示标签/优先级。
- 标签搜索命中结果高亮。
- 日历任务块按标签或优先级着色。
- 日历周视图、月视图、列表视图增加标签/优先级强化展示。
- 分类模型重构、分类颜色或排序规则调整。
- 删除标签时删除任务。

## 领域模型

`TaskPriority` 放在 `shared/domain/status.ts`，与现有 `TASK_STATUSES` 同层维护：

```ts
export const TASK_PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
```

`Task` 增加：

```ts
interface Task {
  priority: TaskPriority | null;
  tagIds: number[];
}
```

无优先级在领域模型、API 响应、请求 DTO、SQLite 和 JSON 中都使用 `null`。不使用 `undefined` 表达优先级缺失。`tagIds` 在所有响应中必须稳定返回数组，历史任务返回 `[]`。

新增标签实体：

```ts
interface Tag {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskTag {
  taskId: number;
  tagId: number;
  userId: number;
  createdAt: string;
}
```

`TaskTag.userId` 是冗余字段，但用于用户范围过滤和索引。写入时只能来自服务端用户上下文，不能来自请求 body。

标签名称标准化由服务端定义并执行，前端只做镜像预处理。标准化规则：

1. `trim` 首尾空白。
2. 将连续 Unicode 空白折叠成一个普通空格。
3. 标准化后为空则拒绝。
4. `normalizedName = name.toLocaleLowerCase()`。
5. `tags.name` 存储折叠空白后的展示名，`normalized_name` 存储去重键。

同用户下 `normalized_name` 必须唯一。`foo  bar`、`foo bar`、`FOO BAR` 视为同一个标签。

## 后端架构

新增模块：

```txt
server/modules/tags/
  repository.ts
  schemas.ts
  service.ts
  routes.ts
```

`TagsService` 负责：

- 列出当前用户标签。
- 创建或复用同名标签。
- 重命名标签。
- 删除标签并清理关联。

`TasksService` 扩展：

- 创建任务时支持 `priority` 和 `tagIds`。
- 新增基础信息更新：`updateDetails`。
- 查询任务时支持 `priority` 和 `tagIds`。
- 删除任务时清理 `task_tags`。

职责边界：

- task endpoint 不隐式创建标签。
- 前端内联新增标签时先调用 `POST /api/tags`，拿到 tag id 后再提交任务。
- 仓储只做持久化和原子写。
- `TasksService` 负责分类归属校验、标签归属校验、重复 tag id 拒绝和业务错误。

`createRepositoriesFromEnv` 增加 `tags` 仓储注册。`registerRoutes` 注入 `TagsService`，并让 `TasksService` 可以访问 `tags` 仓储进行校验。

## API 设计

标签 API：

```txt
GET    /api/tags
POST   /api/tags
PATCH  /api/tags/:id
DELETE /api/tags/:id
```

标签 API 有意使用 `PATCH` 和 `DELETE 204`，不照搬现有 categories 模块的 `PUT` 与删除响应体。原因是标签更新是局部资源更新，删除标签只表达关联已清理，不需要返回业务对象。

`POST /api/tags`：

- body: `{ name: string }`
- name 按服务端标准化规则处理。
- 标准化后为空返回 400。
- 标准化后 name 长度上限 32 字符。
- 同用户下按 `normalizedName` 复用；已存在时返回已有标签，不返回 409。

`PATCH /api/tags/:id`：

- body: `{ name: string }`
- name 按服务端标准化规则处理。
- 重命名为同用户已有 `normalizedName` 返回 409。
- 不做自动合并，避免误改既有关联。

`DELETE /api/tags/:id`：

- 删除标签并清理 `task_tags`。
- 不删除任务。

任务 API 扩展：

```txt
GET   /api/tasks?priority=P1&tagIds=1,2
POST  /api/tasks
PATCH /api/tasks/:id/details
```

`POST /api/tasks` 增加：

```ts
{
  priority?: TaskPriority | null;
  tagIds?: number[];
}
```

`PATCH /api/tasks/:id/details` 是全量替换基础信息：

```ts
{
  title: string;
  categoryId: number;
  tagIds: number[];
  priority: TaskPriority | null;
}
```

全量替换规则：

- `tagIds: []` 清空标签。
- `priority: null` 清空优先级。
- 缺字段按 400 处理，不做局部 PATCH。

保留现有接口边界：

- `PATCH /api/tasks/:id/status` 只改状态。
- `PATCH /api/tasks/:id/schedule` 只改排期。
- `PATCH /api/tasks/batch-schedule` 和 `/batch-unschedule` 不改变标签或优先级。

任务查询：

- `priority=P1|P2|P3|P4` 过滤对应优先级。
- `priority=none` 过滤无优先级任务。
- `tagIds=<positive integer>[,<positive integer>...]` 过滤标签。
- 多标签过滤采用 all-of 语义：任务必须同时包含所有选中标签。
- `tagIds` 为空、重复、非正整数或格式非法时返回 400。
- 只接受单个 `tagIds=1,2` 参数；重复 query 参数 `tagIds=1&tagIds=2`、包含空白的 `tagIds=1, 2` 均返回 400。
- 非法 `priority`、`tagIds`、`status` 或 `categoryId` 返回 400，不静默忽略。扩展任务查询时同步收紧现有 `status/categoryId` 解析，避免同一接口参数风格撕裂。

## 存储设计

SQLite v5 migration：

```sql
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
```

索引：

```sql
create index if not exists idx_tasks_user_priority on tasks(user_id, priority);
create index if not exists idx_tags_user_name on tags(user_id, name);
create index if not exists idx_task_tags_user_tag on task_tags(user_id, tag_id);
create index if not exists idx_task_tags_user_task on task_tags(user_id, task_id);
```

`task_tags` 的复合外键必须保证关联任务和标签都属于同一个 `user_id`。只靠 service 校验不够，导入脚本或仓储 bug 也不能写出跨用户关联。

标签同名去重以 `tags.normalized_name` 为数据库唯一约束。service 仍需先按 `normalizedName` 查找复用，但 SQLite 唯一约束是最终防线。

任务列表或详情响应装配 `tagIds` 时必须批量读取关联。SQLite 可在列表查询后用 `where user_id = ? and task_id in (...)` 批量查 `task_tags` 再按 taskId 分组，或用 SQL 聚合一次性装配；禁止对每个任务逐条查询标签。JSON 仓储从 `taskTags` 一次性构建 taskId 到 tagIds 的映射。

原子性：

- SQLite `create` 和 `updateDetails` 必须用 transaction 同时写任务和 `task_tags`。
- JSON `create` 和 `updateDetails` 必须在一次 `store.update` 内完成，并持久化 `priority: null` 而不是省略字段。
- 任务删除必须同时删除 execution sessions 和 task tag 关联。
- 标签删除只删除 tag 和 task tag 关联。

JSON schema：

```ts
interface DatabaseSchema {
  tags: Tag[];
  taskTags: TaskTag[];
}

interface DatabaseSequences {
  tags: number;
}
```

旧 JSON 缺少 `tags/taskTags/sequences.tags` 时补默认空值。

JSON 中任务必须显式保存 `priority: null`。旧 JSON 任务缺少 `priority` 时读入后规范化为 `null`。

导入脚本 `scripts/importJsonToSqlite.ts` 必须导入 tags 和 taskTags。没有标签字段的历史 JSON 导入后任务保持 `priority=null` 和空标签。

导入脚本边界：

- `BUSINESS_TABLES` 清理顺序必须先删 `task_tags`，再删 `task_execution_sessions/tasks/tags/categories/reports`。
- 导入返回计数增加 `tags` 和 `taskTags`。
- 导入 taskTags 前必须验证 task、tag、user 三者存在且属于同一用户。
- 遇到孤儿 taskTag 或跨用户 taskTag 时导入失败并回滚。
- 导入 tags 时按服务端标准化规则写入 `normalized_name`。

## 前端状态设计

`useAppData` 扩展：

- `tags`
- `refreshTags`
- `loadMetaData` 同时加载 categories、tags、tasks。

`useAppData` 只做数据缓存，不放标签创建、重命名、删除逻辑。

新增或调整 controller：

```txt
src/modules/tags/api/tagsApi.ts
src/modules/tags/controllers/useTagActions.ts
src/modules/tags/components/TagCombobox.tsx
src/modules/tasks/controllers/useTaskDraftController.ts
src/modules/tasks/controllers/useTaskFilterController.ts
src/modules/tasks/controllers/useTaskMutations.ts
src/modules/tasks/controllers/useTasksPanelController.ts
src/modules/dashboard/controllers/useTodayQuickCreateController.ts
```

`useTagActions`：

- 标签列表刷新。
- 创建或复用标签。
- 重命名标签。
- 删除标签并触发任务刷新。

`useTaskDraftController`：

- 管理任务库创建草稿。
- 管理基础信息编辑草稿。
- details 草稿只包含 `title/categoryId/tagIds/priority`。
- 创建草稿可以包含 `plannedDate/unscheduled`，但不得把排期字段传入 details API。

`useTodayQuickCreateController`：

- 只服务今日页快速创建。
- 管理独立的 `title/categoryId` 轻量草稿。
- 提交时显式传 `tagIds: []` 和 `priority: null`。
- 不读取、不复用任务库创建草稿。

`useTaskFilterController`：

- 扩展现有 `useTasksController` 的纯筛选能力。
- 筛选字段：`categoryId/tagIds/priority/status/dateScope/query`。
- 本地多标签筛选采用与 API 相同的 all-of 语义。
- `priority=null` 表示筛选无优先级任务。
- `query` 只匹配任务标题，不匹配标签名。
- 不保留两个并存筛选系统。

`useTaskMutations`：

- 创建任务。
- 更新任务 details。
- 删除任务。
- 不直接 import focus/report 逻辑。
- 删除后的专注会话清理、报表刷新、当前日期任务刷新通过回调协调。

`useTasksPanelController`：

- 在 tasks 模块内组合 draft、filter、mutations。
- 接收 `categories/tags/allTasks/selectedDate` 和必要生命周期回调。
- 返回一个稳定的 `tasksPanelController` 对象。

`AppShell` 不继续逐字段透传任务表单和筛选状态。`AppShell` 只负责装配 `tasksPanelController`，并以 `controller` prop 传给 `TasksPanel`。`TasksPanel` 不再接收 `taskFormTitle/taskFormCategory/taskFilterCategory` 这类散装字段。

## 任务创建与编辑 UI

任务库创建表单字段：

- 标题。
- 分类。
- 标签多选 combobox。
- 优先级。
- 日期。
- 不安排日期。

标签多选使用紧凑 combobox/chips，不展开大面积复选列表。

标签选择统一使用 `TagCombobox`，任务创建表单、任务编辑弹窗和安排任务栏共享同一个组件或同一个行为 adapter。IME、标准化预览、去重、创建中禁用、失败保留输入等规则必须在共享层实现，不能三处复制。

内联创建标签规则：

- 输入 trim。
- 折叠连续空白。
- 空字符串禁止创建。
- 标签名上限 32 字符。
- 同用户下大小写不敏感复用。
- 命中已有标签时直接选中已有标签，不创建新标签。
- 只在 Enter 或点击“创建”时创建。
- 中文输入法 composition 期间 Enter 不提交。
- 创建中禁用重复提交。
- 创建失败保留输入，不选中不存在的标签。

任务列表编辑入口：

- 每行提供独立编辑图标按钮，放在删除按钮同组操作区。
- 点击任务行本身不打开编辑，避免和拖拽、状态选择冲突。
- 打开 `TaskBasicInfoModal`。
- 弹窗只编辑标题、分类、标签、优先级。
- 不编辑状态、排期和专注记录。
- 保存成功刷新 `allTasks`；如果任务命中当前日期，也刷新当前日期任务。
- 保存失败保留弹窗和草稿。

今日页快速创建：

- 不展示标签和优先级。
- 使用独立轻量草稿，不能继承任务库创建表单残留值。
- 提交时显式传空标签和无优先级。
- 用户需要补标签或优先级时，从任务库编辑入口完成。

日历快速创建：

- `CalendarQuickCreatePopover` 也属于轻量创建入口。
- 不展示标签和优先级。
- 提交时显式传 `tagIds: []` 和 `priority: null`。
- 后续补标签或优先级从任务库编辑入口完成。

## 组织管理页

现有分类页改为组织管理页：

```txt
OrganizationPanel
  CategorySection
  TagsSection
```

`CategorySection` 保留现有分类颜色、排序和关联任务保护删除语义。

`TagsSection` 只做：

- 新增标签。
- 重命名标签。
- 删除标签。

标签区不复用分类色彩卡片范式。标签无颜色、无排序权重。删除标签前提示：只移除任务关联，不删除任务。

导航 tab key 保持现有 `categories`，避免牵动路由和上层状态。展示文案改为“组织”，页面组件命名为 `OrganizationPanel`。

## 安排任务栏

安排任务栏采用顶部筛选控件 + 分组方式选择 + 可折叠分组列表，不做 `分类 / 标签 / 优先级` 三个互斥 tab。

筛选控件：

- 搜索：沿用现有 query。
- 分类：单选。
- 标签：多选 combobox/chips。
- 优先级：`全部 / 无 / P1 / P2 / P3 / P4`。

右侧栏空间按现有约 320px 宽度设计。搜索常驻显示；分类、标签、优先级和分组方式放入可折叠筛选区。标签 chips 最多显示一行，溢出显示 `+N` 汇总，不挤压批量操作区和任务列表高度。

分组方式：

```ts
type SchedulingGroupMode = 'none' | 'category' | 'tag' | 'priority';
```

默认分组为 `priority`。原因是安排任务栏的核心问题是先安排哪个，优先级比分类更接近决策顺序。

分组规则：

- `priority`：`P1 -> P2 -> P3 -> P4 -> 无优先级`。
- `category`：按现有分类顺序。
- `tag`：任务有多个标签时可出现在多个标签组；无标签任务放入“无标签”。
- `none`：保持平铺列表。

标签分组下同一任务可能出现多次，但选择态以全局 `taskId` Set 为准。任何重复位置勾选或取消都更新同一个 taskId。批量安排、批量取消和拖拽 payload 必须从 Set 生成唯一 taskIds，不能因为重复展示产生重复操作。

数据流：

- `useSchedulingSidebarController` 增加 `categoryId/tagIds/priority/groupMode/query`。
- 未安排任务和当前范围内全天无时间任务两路请求带同一套筛选参数。
- 两路结果前端去重。
- 分组在前端通过纯函数计算，不让后端承担 UI 分组。
- `SchedulingSidebar` 只渲染 controller 输出，不直接调用 API。

回归约束：

- 单任务拖拽排期保持现有行为。
- 多选批量安排和取消安排保持现有行为。
- 多选拖到时间轴继续按现有规则拒绝。
- 筛选变化清空当前选择，避免隐藏任务被批量操作。
- 分组只影响展示，不改变 drag payload。
- 分组状态不写 localStorage。
- 分组标题、空态、选中计数必须使用稳定高度，避免展开折叠时任务列表明显跳动。

## 错误处理

后端：

- 标签名为空：400。
- 标签名超长：400。
- 创建同名标签：返回已有标签。
- 重命名为已有标签：409。
- 标签标准化由服务端执行；前端提交未折叠空白时，后端仍按同一规则处理。
- 删除标签：204，清理关联，不删除任务。
- details title 为空：400。
- details category 不存在或不属于用户：404。
- details tagIds 重复：400。
- details tag 不存在或不属于用户：404。
- details priority 非法：400。
- 查询 priority、tagIds、status 或 categoryId 非法：400。
- 跨用户标签创建关联、查询、编辑或删除必须被 service 和 SQLite 约束双重拒绝。

前端：

- 标签创建失败保留输入，不选中幽灵标签。
- details 保存失败保留弹窗和草稿。
- 删除标签前显示确认说明。
- 筛选变化清空安排栏选择。
- 今日页快速创建不读取任务库标签/优先级草稿。

## 测试计划

后端测试：

- task schema parsing：priority、tagIds、details、tag query。
- tag schema parsing：name 校验。
- TagsService：创建、复用、标准化、重命名冲突、删除清关联、跨用户隔离。
- TasksService：创建含标签/优先级、details 全量替换、tagIds 校验、删除清关联、跨用户 tagIds 拒绝。
- SQLite migration：新表、新列、新索引、priority check、normalized_name 唯一约束、task_tags 复合外键和历史任务默认值。
- SQLite repository：按 priority/tagIds 过滤，create/updateDetails 原子写，批量装配 tagIds，拒绝跨用户 task_tags。
- JSON repository：行为与 SQLite 一致。
- import script：tags/taskTags 导入、force 清表顺序、返回计数、孤儿关联和跨用户关联回滚。
- routes：`/api/tags`、`/api/tasks/:id/details`、`GET /api/tasks` 查询。

前端测试：

- `tagsApi` 和 `tasksApi` payload。
- `useTagActions` 创建/复用、重命名、删除。
- `useTaskDraftController` 创建草稿与 details 草稿隔离。
- `useTodayQuickCreateController` 独立草稿，显式提交空标签和无优先级。
- 今日页快速创建不继承任务库标签/优先级。
- `useTaskFilterController` 分类、标签、优先级、状态、日期、搜索组合筛选。
- `TagCombobox` IME、标准化预览、复用、失败保留输入。
- `TaskCreateForm` 标签 combobox 和优先级选择。
- `TaskBasicInfoModal` 保存、失败、清空标签、清空优先级。
- `OrganizationPanel` 分类区和标签区行为分离。
- `SchedulingSidebar` 筛选、分组、多标签组归属、筛选清空选择、拖拽回归。

质量门：

```bash
npm test
npm run lint
npm run build
git diff --check
```

## 实施顺序建议

1. 更新 shared 领域类型、priority 常量和任务 API DTO。
2. 增加 SQLite v5 migration：priority check、tags、task_tags、normalized_name、复合外键和索引。
3. 扩展 JSON schema、file store 默认值和 JSON 仓储 tagIds 装配。
4. 实现 tags repository/service/schema/routes，并覆盖标准化、复用、重命名、删除和跨用户测试。
5. 扩展 task repository：create/updateDetails 原子写、删除清关联、批量 tagIds 装配、priority/tagIds 查询。
6. 扩展 task service/schema/routes：tagIds 校验、details 全量替换、严格 query parsing。
7. 扩展 importJsonToSqlite：清表顺序、tags/taskTags 导入、计数、孤儿和跨用户校验。
8. 增加前端 `tagsApi/tasksApi` 类型和 `useAppData` tags 元数据加载。
9. 建立 `TagCombobox` 和标签操作 controller。
10. 建立 `useTasksPanelController`、任务库 draft/filter/mutation controller，并收缩 `AppShell` 透传面。
11. 实现任务库创建表单、基础信息编辑弹窗和筛选栏。
12. 实现 `useTodayQuickCreateController`，并让今日页和日历快速创建显式提交空标签、无优先级。
13. 改造组织管理页为 `OrganizationPanel -> CategorySection + TagsSection`。
14. 实现安排任务栏筛选、折叠筛选区、分组纯函数、重复展示去重选择和拖拽回归。
15. 全量测试、lint、build、diff check 和最终边界审查。

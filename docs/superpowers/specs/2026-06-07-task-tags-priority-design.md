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
  priority?: TaskPriority;
  tagIds: number[];
}
```

无优先级在服务端存储为 `null`，API 响应沿用项目现有 nullable 风格映射为 `undefined`。前端统一把 `undefined` 视为无优先级。`tagIds` 在所有响应中必须稳定返回数组，历史任务返回 `[]`。

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

`POST /api/tags`：

- body: `{ name: string }`
- name trim 后为空返回 400。
- name 长度上限 32 字符。
- 同用户下按 trim 后大小写不敏感复用；已存在时返回已有标签，不返回 409。

`PATCH /api/tags/:id`：

- body: `{ name: string }`
- 重命名为同用户已有标签返回 409。
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
- 非法 `priority` 或 `tagIds` 返回 400，不静默忽略。

## 存储设计

SQLite v5 migration：

```sql
alter table tasks add column priority text;

create table tags (
  id integer primary key,
  user_id integer not null,
  name text not null,
  created_at text not null,
  updated_at text not null,
  foreign key (user_id) references users(id)
);

create table task_tags (
  task_id integer not null,
  tag_id integer not null,
  user_id integer not null,
  created_at text not null,
  foreign key (task_id) references tasks(id),
  foreign key (tag_id) references tags(id),
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

标签同名去重在 service 层按标准化名称执行。SQLite 可增加 lower name 表达式唯一索引；如果实现时选择不用表达式索引，也必须由仓储或 service 测试锁住大小写不敏感复用行为。

原子性：

- SQLite `create` 和 `updateDetails` 必须用 transaction 同时写任务和 `task_tags`。
- JSON `create` 和 `updateDetails` 必须在一次 `store.update` 内完成。
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

导入脚本 `scripts/importJsonToSqlite.ts` 必须导入 tags 和 taskTags。没有标签字段的历史 JSON 导入后任务保持 `priority=null` 和空标签。

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
src/modules/tasks/controllers/useTaskDraftController.ts
src/modules/tasks/controllers/useTaskFilterController.ts
src/modules/tasks/controllers/useTaskMutations.ts
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

`useTaskFilterController`：

- 扩展现有 `useTasksController` 的纯筛选能力。
- 筛选字段：`categoryId/tagIds/priority/status/dateScope/query`。
- 不保留两个并存筛选系统。

`useTaskMutations`：

- 创建任务。
- 更新任务 details。
- 删除任务。
- 不直接 import focus/report 逻辑。
- 删除后的专注会话清理、报表刷新、当前日期任务刷新通过回调协调。

`AppShell` 不继续逐字段透传。任务页应接收 controller 对象或由 `TasksPanel` 内部组合局部 controller，避免新增字段把 `AppShell` 变成表单状态转发器。

## 任务创建与编辑 UI

任务库创建表单字段：

- 标题。
- 分类。
- 标签多选 combobox。
- 优先级。
- 日期。
- 不安排日期。

标签多选使用紧凑 combobox/chips，不展开大面积复选列表。

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

- 每行提供编辑图标按钮或更多菜单。
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

导航名称可以从“分类”调整为“组织”或“分类与标签”。实现时应避免改动不相关导航结构。

## 安排任务栏

安排任务栏采用顶部筛选控件 + 分组方式选择 + 可折叠分组列表，不做 `分类 / 标签 / 优先级` 三个互斥 tab。

筛选控件：

- 搜索：沿用现有 query。
- 分类：单选。
- 标签：多选 combobox/chips。
- 优先级：`全部 / 无 / P1 / P2 / P3 / P4`。

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

## 错误处理

后端：

- 标签名为空：400。
- 标签名超长：400。
- 创建同名标签：返回已有标签。
- 重命名为已有标签：409。
- 删除标签：204，清理关联，不删除任务。
- details title 为空：400。
- details category 不存在或不属于用户：404。
- details tagIds 重复：400。
- details tag 不存在或不属于用户：404。
- details priority 非法：400。
- 查询 priority 或 tagIds 非法：400。

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
- TagsService：创建、复用、重命名冲突、删除清关联。
- TasksService：创建含标签/优先级、details 全量替换、tagIds 校验、删除清关联。
- SQLite migration：新表、新列、新索引和历史任务默认值。
- SQLite repository：按 priority/tag 过滤，create/updateDetails 原子写。
- JSON repository：行为与 SQLite 一致。
- import script：tags/taskTags 导入。
- routes：`/api/tags`、`/api/tasks/:id/details`、`GET /api/tasks` 查询。

前端测试：

- `tagsApi` 和 `tasksApi` payload。
- `useTagActions` 创建/复用、重命名、删除。
- `useTaskDraftController` 创建草稿与 details 草稿隔离。
- 今日页快速创建不继承任务库标签/优先级。
- `useTaskFilterController` 分类、标签、优先级、状态、日期、搜索组合筛选。
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

1. 后端领域模型、SQLite/JSON 存储和 API。
2. 前端 tags API、任务 API 类型和元数据加载。
3. 任务库创建、编辑、筛选。
4. 组织管理页标签区。
5. 安排任务栏筛选和分组。
6. 全量回归和边界审查。

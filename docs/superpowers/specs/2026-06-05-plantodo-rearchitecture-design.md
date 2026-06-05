# PlanTodo 单用户本地工具重构设计

## 背景

当前 `PlanTodo` 已具备基础可用性，但整体结构仍停留在原型阶段：

- 前端大量页面状态、业务判断、统计转换和交互流程集中在 `src/App.tsx`
- 后端的路由控制、业务规则、存储读写集中在 `server/routes.ts`、`server/db.ts`、`server/reports.ts`
- 前后端存在重复类型定义，状态规则分散在不同层
- 数据目前依赖 `data/db.json`，但没有清晰的存储抽象边界
- 工程文档仍保留模板残留，项目约束和分层意图未被正式表达

这不是“代码有点乱”的问题，而是业务边界、规则归属、存储抽象都未立起来。继续在现状上叠功能，只会把局部修补成本逐步抬高。

## 目标

本次重构面向“本地单用户计划管理工具”，目标如下：

1. 保留现有功能和页面能力，不进行产品范围收缩
2. 将项目从“单文件原型”重构为“可持续演进的模块化本地工具”
3. 保持当前 JSON 文件持久化方案，但抽象出存储接口，为未来切换 SQLite 预留边界
4. 收束业务规则归属，避免 UI、路由、存储层同时定义规则
5. 为后续功能迭代、测试补齐、存储升级提供稳定骨架

## 非目标

以下内容不属于本次设计范围：

- 不引入多用户、鉴权、账号系统
- 不迁移到 SQLite 或远程数据库
- 不重做产品信息架构或删减既有功能
- 不为“未来可能的 SaaS 化”提前引入复杂部署架构
- 不追求一次性替换所有实现细节而牺牲当前功能稳定性

## 总体架构

重构后项目采用“按业务域组织 + 明确分层职责”的结构。

前端按业务域拆分为 `categories`、`tasks`、`focus`、`reports`、`dashboard` 等模块。每个模块内部承接自己的视图、控制器、API 适配和局部模型。顶层应用只负责页面装配、主题和全局提示，不再持有主要业务逻辑。

后端按相同业务域拆分为独立模块。每个模块内部至少包含：

- `routes`：参数解析、响应映射、错误转译
- `service`：业务规则与状态变更
- `repository contract`：面向领域的存储接口
- `schemas`：输入校验与 DTO 约束

持久化能力从业务模块中抽离，统一落入 `server/storage`。当前保留 JSON 文件实现，但业务模块只依赖仓储接口，不直接依赖文件结构和 `fs`。

共享领域类型、状态枚举、基础规则和时间处理抽到 `shared`，由前后端共同消费，避免重复定义和状态漂移。

## 架构原则

### 1. 页面不拥有业务规则

页面组件只负责展示和交互触发，不负责：

- 拼装统计口径
- 定义任务状态流转
- 关联专注记录与任务执行
- 拼接日报周报规则

这些规则应由模块 controller、service 或纯函数集中承接。

### 2. 路由不拥有业务规则

路由层只负责：

- 读取 path、query、body 参数
- 调用模块 service
- 将领域错误映射为 HTTP 响应

路由层不得继续扩张为“半个 service”。

### 3. 存储层不拥有业务规则

JSON 存储实现只负责：

- 读取和写入底层数据
- 管理文件访问和序列化
- 按仓储接口暴露查询和持久化能力

存储层不能继续定义任务状态回填、专注会话约束、报表统计规则等业务逻辑。

### 4. 业务模块只依赖抽象，不依赖具体持久化实现

模块 service 只面向仓储接口工作。未来切换 SQLite 时，只替换 `storage` 下的实现，不改动业务规则。

## 前端模块设计

### `src/app`

职责：

- 应用入口和装配
- 顶层布局和页面切换
- 主题、全局通知、provider 注入

要求：

- 不承载分类、任务、专注、报表的具体业务计算
- `App` 从“功能中心”退化为“装配层”

### `src/modules/categories`

职责：

- 分类列表展示
- 分类新增、编辑、删除
- 颜色、排序、表单状态管理

不负责：

- 任务筛选统计
- 报表聚合逻辑

### `src/modules/tasks`

职责：

- 任务创建、日期选择、状态切换
- 分类筛选、状态筛选
- 今日任务列表与计划项展示

约束：

- 只管理任务域自身规则
- 不能在模块内直接定义专注会话状态机

### `src/modules/focus`

职责：

- 专注会话开始、停止
- 运行中任务状态展示
- 计时器更新与结束后的回填流程

关键判断：

`focus` 必须独立成域。它不是 `tasks` 的附属组件，而是一个拥有状态机约束的业务模块。

### `src/modules/reports`

职责：

- 日报、周报展示
- 图表数据 view model 转换
- 报表生成入口和结果呈现

约束：

- 页面只消费已转换好的展示数据
- 统计和映射逻辑集中在模块内部，不散落到页面 JSX

### `src/modules/dashboard`

职责：

- 聚合“今日总览”这类跨域视图

约束：

- 只负责组合多个模块暴露出的公开数据
- 不重新定义底层领域规则

### `src/shared`

职责：

- 通用 UI 组件
- 时间格式化、错误处理、通用工具
- 前端共享常量和适配类型

约束：

- 不作为“杂物回收站”
- 仅容纳真实跨域复用内容

## 后端模块设计

### `server/app`

职责：

- Express 实例创建
- 中间件注册
- 路由装配

要求：

- 不包含领域逻辑
- `server.ts` 只负责启动，不再直接定义 API 行为

### `server/modules/categories`

职责：

- 分类 CRUD
- 分类名称冲突校验
- 分类删除前的引用校验

### `server/modules/tasks`

职责：

- 任务创建与查询
- 状态更新
- 任务筛选规则

关键约束：

- 任务状态流转不能散落在 route 和 storage 层

### `server/modules/focus`

职责：

- 专注会话开始、结束、查询
- 运行中会话的唯一性约束
- 会话与任务状态联动

关键约束：

- “运行中 session”和“任务 `IN_PROGRESS` 状态”必须由同一套服务规则管理

### `server/modules/reports`

职责：

- 日报和周报生成
- 统计任务与专注数据
- 报表内容持久化

关键约束：

- `reports` 作为上层聚合模块，可依赖 `tasks`、`focus`、`categories` 暴露的仓储或查询接口
- 反向依赖禁止存在

### `server/storage`

职责：

- 文件存储访问
- JSON 序列化与反序列化
- 各业务仓储接口的 JSON 实现

设计要求：

- 为 `categories`、`tasks`、`focus`、`reports` 提供分离的仓储实现
- 通过统一 `fileStore` 或 `databaseClient` 控制文件读写
- 业务模块不得直接调用 `fs.readFileSync` 或依赖 `db.json` 结构

### `server/shared`

职责：

- 通用错误类型
- 时间工具
- 通用校验与响应转换辅助

约束：

- 不依赖任何业务模块

## 共享领域模型

前后端统一共享的领域元素包括：

- `TaskStatus`
- `SessionStatus`
- `Category`
- `Task`
- `TaskExecutionSession`
- `DailyReport`
- `WeeklyReview`
- 与日期、时间范围相关的基础值对象或工具类型

目标是让前后端基于同一套领域语言工作，避免：

- 前端一套类型，后端一套类型
- 状态字符串重复散落
- 未来重构时接口命名不一致

## 数据流设计

### 前端数据流

统一链路：

`View -> module controller/hook -> api client -> server`

明确禁止：

- 页面组件中直接 `fetch`
- 页面组件中直接拼业务统计
- 模块跨目录直接修改对方内部状态
- 报表页面自行定义任务与会话关联规则

### 后端数据流

统一链路：

`route -> schema validation -> service -> repository contract -> storage implementation`

明确禁止：

- route 中直接写业务规则
- service 中直接读写 JSON 文件
- report 逻辑绕过仓储层直接扫描底层数据结构
- 模块随意读取别的模块内部实现细节

## 依赖规则

重构后必须遵守以下依赖方向：

1. `shared` 不依赖任何业务模块
2. 业务模块可依赖 `shared`
3. `tasks`、`categories`、`focus` 不依赖 `reports`
4. `reports` 可读取其他业务域暴露的公开接口，但不能被反向依赖
5. `storage` 可依赖共享类型与仓储契约
6. 业务模块不得反向依赖具体 `json repository`
7. 前端模块之间只能通过公开接口或聚合层协作，不能跨模块调用内部工具函数

这些规则是结构稳定性的底线，不是建议项。

## 持久化策略

本次保留 `data/db.json` 作为落地存储，但改造为“接口先行”模式。

实现策略：

- 先定义仓储契约
- 再为 JSON 提供具体实现
- 业务服务只依赖契约
- 底层文件结构仅在 `storage/json` 范围内可见

这样做的价值在于：

- 当前不承受数据库迁移成本
- 先把真正的问题，即结构耦合，切开
- 未来切 SQLite 时，不需要再次重构业务服务边界

## 改造顺序

本次重构不采用一次性重写，而采用“先立边界，再搬逻辑，最后清旧代码”的顺序。

### 阶段 1：共享模型落地

目标：

- 抽离共享领域类型、状态枚举、时间工具、基础校验
- 统一前后端命名和状态定义

### 阶段 2：后端模块化重构

目标：

- 拆分 `routes.ts`、`db.ts`、`reports.ts`
- 建立 `route/service/repository contract/storage implementation` 结构
- 让业务规则脱离 JSON 读写实现

理由：

后端当前是规则和存储耦合最重的区域，必须先拆。

### 阶段 3：前端按域拆分

目标：

- 将 `App.tsx` 中的分类、任务、专注、报表、今日总览状态逐步外提
- 建立模块 controller、展示组件、视图模型转换层

### 阶段 4：聚合视图重建

目标：

- 重构 `dashboard` 和 `reports` 的跨域聚合方式
- 将统计和图表映射逻辑集中到模块内部

### 阶段 5：工程债清理

目标：

- 清理模板 README
- 清理无用依赖、旧函数、重复类型、遗留装配代码
- 收口为单轨结构，避免新旧结构长期共存

## 风险与控制

### 风险 1：前后端类型漂移

当前前后端存在重复类型定义。若不先统一共享模型，后续拆分会持续出现命名和状态不一致。

控制方式：

- 在重构初始阶段优先建立共享类型
- 后续每个模块逐步替换本地重复定义

### 风险 2：任务状态与专注状态脱钩

任务 `IN_PROGRESS` 与运行中 session 实际是一组联动状态，若拆分时没有统一状态规则，容易出现 UI 与后端不一致。

控制方式：

- 在 `focus service` 中集中定义专注开始、停止、任务状态联动规则
- 前端只消费结果，不自行推断状态

### 风险 3：报表逻辑被拆散

日报和周报依赖任务、分类、专注记录聚合。若一部分逻辑留在前端、一部分放后端，会导致重复实现和统计口径漂移。

控制方式：

- 报表生成和统计口径统一收敛在 `reports` 模块
- 前端负责展示，不二次发明统计规则

### 风险 4：新旧结构并存太久

如果新结构建立后，旧入口仍长期可改，维护者会继续在旧代码上追加修改，最终导致重构失败。

控制方式：

- 每完成一个业务域迁移，就立即切断旧入口
- 避免“先复制一份，之后再慢慢切”的长期双轨状态

## 建议目录草案

### 前端

```text
src/
  app/
    AppShell.tsx
    providers.tsx
    theme.ts
  modules/
    categories/
      components/
      controllers/
      api/
      model/
    tasks/
      components/
      controllers/
      api/
      model/
    focus/
      components/
      controllers/
      api/
      model/
    reports/
      components/
      controllers/
      api/
      model/
      mappers/
    dashboard/
      components/
      controllers/
      model/
  shared/
    ui/
    lib/
    types/
    constants/
  main.tsx
```

### 后端

```text
server/
  app/
    createServer.ts
    registerRoutes.ts
  modules/
    categories/
      routes.ts
      service.ts
      repository.ts
      schemas.ts
    tasks/
      routes.ts
      service.ts
      repository.ts
      schemas.ts
    focus/
      routes.ts
      service.ts
      repository.ts
      schemas.ts
    reports/
      routes.ts
      service.ts
      repository.ts
      schemas.ts
      generators.ts
  storage/
    json/
      fileStore.ts
      repositories/
        categoryJsonRepository.ts
        taskJsonRepository.ts
        focusSessionJsonRepository.ts
        reportJsonRepository.ts
    databaseSchema.ts
  shared/
    errors/
    lib/
    types/
```

## 结论

本次重构不是为了让目录看起来更专业，而是为了重新分配权力边界：

1. 业务规则归 `service`
2. 存储细节归 `storage`
3. 页面只负责展示和交互

只要这三条建立起来，未来无论是继续加功能、补测试，还是切换 SQLite，都还是增量演进；如果这三条不成立，所谓重构只是在重新摆放混乱。

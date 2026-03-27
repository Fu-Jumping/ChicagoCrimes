# 接口契约版本策略与变更日志模板

## 契约版本策略

- 契约版本字段：`meta.contract_version`
- API 版本字段：`meta.api_version`
- 响应头：`X-Contract-Version`
- 当前契约版本：`2026.03.0`

### 版本号规则

- 主版本：`YYYY.MM`，表示契约冻结周期。
- 修订号：`.PATCH`，表示同周期内兼容变更次数。
- 兼容变更：仅新增可选字段或增强 `meta`，修订号递增。
- 破坏性变更：删除字段、修改字段语义或类型，进入新的主版本周期。

### 兼容策略

- 后端在一个主版本周期内保持向后兼容。
- 前端优先读取 `data` 与 `meta`，忽略未知字段。
- 发生破坏性变更时，先发布变更日志并升级 `contract_version` 主版本。

## 变更日志模板

```markdown
# Contract Changelog

## [版本号] - YYYY-MM-DD

### Added
- 新增字段：
- 新增接口：

### Changed
- 字段变更：
- 参数校验变更：

### Deprecated
- 计划废弃字段/接口：
- 废弃说明：

### Removed
- 已移除字段/接口：
- 迁移方案：

### Compatibility
- 是否兼容：Yes/No
- 前端迁移动作：
```

## 当前版本实际变更记录

以下条目用于追溯当前在线契约版本，按版本倒序维护。

## [2026.03.0] - 2026-03-26

### Added
- 新增 `meta.contract_version`、`meta.api_version`、`meta.generated_at` 字段。
- 新增 `meta.dimension_definitions`、`meta.metric_definitions`、`meta.metric_scope`、`meta.metric_scope_note`。
- 新增 `meta.state_contract`（`empty`/`loading`/`error`）统一前端状态渲染契约。
- 新增响应头 `X-Contract-Version`。
- 新增统一错误结构字段 `error_type`、`details`（含 `field` 与 `reason`）。

### Changed
- 所有 `/api/v1/analytics/*` 接口统一返回 `code/message/data/meta/request_id`。
- 时间序列与分类数据补充稳定 `key` 字段，支持 D3 更新模式。
- 统一参数校验策略：`year/start_year/end_year/start_date/end_date/limit/sort`，非法输入返回 `PARAM_VALIDATION_ERROR`。
- 分类接口统一 `sort` 语义（`asc|desc`）。

### Deprecated
- 无。

### Removed
- 无。

### Compatibility
- 是否兼容：No（对历史错误结构和部分 `meta` 语义存在破坏性调整）。
- 前端迁移动作：按新结构读取错误体与 `meta.state_contract`，并将图表绑定到稳定 `key` 字段。

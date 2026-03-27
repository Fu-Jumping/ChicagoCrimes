# 后端能力增强与 D3 协同 Spec

## Why
当前项目已具备基础可视化能力，但后端仍偏原型化，主要问题是接口契约不够严格、缓存与可观测能力不足，导致 D3 动态图表在联调和扩展时成本偏高。需要通过后端能力升级，保障 D3 场景下的数据稳定性、性能和可诊断性。

## What Changes
- 统一分析接口响应结构与错误结构，规范 `code/message/data/meta/request_id`。
- 统一查询参数规则（year/start_date/end_date/limit/sort），并补齐边界校验。
- 增加 D3 友好数据输出规范（固定桶位、稳定排序、缺失补零、语义化 key）。
- 增加缓存策略（应用层缓存 + HTTP 条件缓存）以降低重复聚合开销。
- 增加可观测性（慢查询日志、接口耗时、request_id 全链路）。
- 增加健康检查与离线运行探测，提升桌面端稳定体验。
- **BREAKING**：部分历史接口的错误返回体和 `meta` 字段将标准化，前端需按新契约消费。

## Impact
- Affected specs: 分析接口规范、错误码规范、性能与缓存规范、可观测性规范、D3 数据映射规范。
- Affected code: `backend/main.py`、`backend/app/routers/analytics.py`、`backend/app/services/analytics.py`、`backend/app/schemas/crime.py`、`backend/app/database.py`、`frontend/src/renderer/src/api/index.ts`、相关分析视图。

## ADDED Requirements
### Requirement: 统一响应与错误契约
系统 SHALL 为所有 `/api/v1/analytics/*` 接口提供统一响应结构，并提供分层错误码（参数错误、业务错误、系统错误）。

#### Scenario: 统一成功响应
- **WHEN** 前端请求任一分析接口
- **THEN** 返回包含 `code`、`message`、`data`、`meta`、`request_id`
- **AND** `meta` 至少包含参数回显与统计口径

#### Scenario: 统一错误响应
- **WHEN** 用户传入非法参数（例如超界 limit 或非法 year）
- **THEN** 返回结构化错误体与可读错误信息
- **AND** 不返回内部堆栈细节

### Requirement: D3 友好数据协议
系统 SHALL 输出可直接用于 D3 更新模式的数据，确保 key 稳定、顺序稳定、缺失值显式补齐。

#### Scenario: 时间序列固定桶位
- **WHEN** 请求月度或小时趋势
- **THEN** 返回固定桶位（12 月、24 小时）
- **AND** 对缺失桶位补零

#### Scenario: 分类数据稳定渲染
- **WHEN** 请求 TopN 分类接口
- **THEN** 返回稳定排序与稳定 key 字段
- **AND** 字段命名与前端映射一致

### Requirement: 多层缓存与条件请求
系统 SHALL 同时支持应用层缓存与 HTTP 条件缓存，减少重复计算与重复传输。

#### Scenario: 缓存命中
- **WHEN** 相同参数重复请求热点聚合接口
- **THEN** 命中应用层缓存
- **AND** 响应中可识别缓存状态

#### Scenario: ETag 条件返回
- **WHEN** 客户端携带 `If-None-Match` 且资源未变化
- **THEN** 返回 `304 Not Modified`
- **AND** 不返回响应体

### Requirement: 可观测性与健康检查
系统 SHALL 记录 request_id、接口耗时、慢查询信息，并提供健康检查接口。

#### Scenario: 链路追踪
- **WHEN** 任一接口请求到达
- **THEN** 日志可基于 request_id 关联请求与查询耗时

#### Scenario: 健康探测
- **WHEN** 客户端调用健康检查接口
- **THEN** 返回服务可用状态与关键依赖状态摘要

## MODIFIED Requirements
### Requirement: 分析服务模块组织
系统 SHALL 将分析逻辑从单一 service 文件拆分为趋势、类型、区域等模块，降低耦合并便于扩展。

### Requirement: 前端 API 层处理规范
系统 SHALL 基于统一响应结构处理成功与失败分支，并在失败时输出可展示的降级信息。

## REMOVED Requirements
### Requirement: 路由层通用异常直接透传
**Reason**: 现有 `except Exception -> 500 + detail` 语义过粗且存在信息泄露风险。  
**Migration**: 迁移为全局异常处理中间件 + 结构化错误模型，路由层仅保留业务级异常分支。

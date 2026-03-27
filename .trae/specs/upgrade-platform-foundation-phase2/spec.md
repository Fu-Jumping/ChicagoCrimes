# 平台基础能力二期升级 Spec

## Why
当前项目已完成第一阶段的后端契约与 D3 协同改造，但在“工程启动一致性、全局分析体验、运行可观测性、安全默认配置”上仍有明显升级空间。用户已明确允许必要时进行较大改动，因此本次以“可扩展的产品化基础”为目标推进二期构建。

## What Changes
- 新增仓库级统一启动与环境约束能力（根目录统一入口、环境示例、联启规范）。
- 新增后端安全基线收口（移除默认数据库口令兜底、收紧 CORS 白名单、健康检查脱敏）。
- 新增前端全局筛选中心（跨页面共享筛选状态，支持全局年份/类型/时间范围联动）。
- 新增前端请求观测面板（request_id、缓存命中、耗时、失败原因）用于联调与答辩演示。
- 新增 D3 交互增强（Tooltip、图例开关、刷选/高亮、标签防重叠策略）。
- 新增工程门禁升级（根级联启验证、关键回归脚本整合、失败时输出可读诊断）。
- **BREAKING**：部分前端页面的数据获取方式将从“页面内局部筛选”升级为“全局筛选上下文驱动”，原有局部状态逻辑将被重构。

## Impact
- Affected specs: 启动与环境规范、后端安全规范、全局交互规范、可观测规范、图表交互规范、发布门禁规范。
- Affected code: `backend/app/database.py`、`backend/main.py`、`frontend/src/renderer/src/api/index.ts`、`frontend/src/renderer/src/views/*.tsx`、`frontend/src/renderer/src/components/charts/*.tsx`、`frontend/package.json`、仓库根运行脚本与说明文件。

## ADDED Requirements
### Requirement: 仓库级统一启动与环境约束
系统 SHALL 提供统一的启动入口与环境约束，避免在错误目录执行命令导致不可运行。

#### Scenario: 统一启动成功
- **WHEN** 用户在仓库根目录执行统一启动命令
- **THEN** 前后端按既定顺序启动并输出可读提示
- **AND** 明确提示各服务端口与健康状态

#### Scenario: 环境缺失阻断
- **WHEN** 必需环境变量缺失
- **THEN** 启动流程中止并返回可操作的缺失项说明

### Requirement: 后端安全基线收口
系统 SHALL 默认使用安全配置，不再使用明文默认数据库凭据，且健康检查不泄露内部细节。

#### Scenario: 无默认口令兜底
- **WHEN** 未配置数据库凭据
- **THEN** 服务拒绝启动并返回安全配置提示

#### Scenario: 健康检查脱敏
- **WHEN** 健康检查发现数据库异常
- **THEN** 仅返回抽象错误码与状态，不返回底层异常明文

### Requirement: 全局筛选联动中心
系统 SHALL 提供跨页面共享的筛选状态，并驱动所有分析页使用统一筛选源。

#### Scenario: 跨页面筛选一致
- **WHEN** 用户在任一页面设置全局年份或类型筛选
- **THEN** 切换到其他分析页时保留并应用相同筛选

#### Scenario: 清空筛选一致
- **WHEN** 用户点击全局清空筛选
- **THEN** 所有页面恢复默认筛选状态并重新拉取数据

### Requirement: 请求观测面板
系统 SHALL 在前端提供可切换的请求观测信息，辅助调试和验收。

#### Scenario: 观测信息展示
- **WHEN** 页面请求成功
- **THEN** 面板可展示 request_id、耗时、缓存命中状态

#### Scenario: 失败快速定位
- **WHEN** 请求失败
- **THEN** 面板展示标准化错误摘要与重试入口

### Requirement: D3 交互增强
系统 SHALL 为核心图表提供可分析的交互能力，不止静态绘制。

#### Scenario: Tooltip 与图例
- **WHEN** 用户悬浮或切换图例
- **THEN** 图表展示对应明细并支持显隐系列

#### Scenario: 交互选区
- **WHEN** 用户进行刷选或点选高亮
- **THEN** 图表触发统一事件并驱动筛选联动

## MODIFIED Requirements
### Requirement: 页面内筛选模式
系统 SHALL 从“各页面独立筛选逻辑”改为“全局筛选中心 + 页面补充筛选”的分层模式。

### Requirement: 回归验证入口
系统 SHALL 在现有 typecheck 与性能门禁基础上，增加仓库级联启验证与运行前置检查。

## REMOVED Requirements
### Requirement: 根目录直接执行前端命令的隐式约定
**Reason**: 该约定会导致 `ENOENT package.json` 等路径错误，影响使用体验与评审稳定性。  
**Migration**: 使用统一根级命令入口（或明确前端/后端子目录命令），并在启动失败时给出目录修复提示。

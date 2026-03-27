# 前端展示逻辑轻量化改造 Spec

## Why
当前前端在展示层已具备基础能力，但页面结构、信息层级与图表响应逻辑仍存在重复和不一致。你后续会在 Figma 重新设计视觉，因此本次仅聚焦“展示逻辑可用、界面简实现”，避免重投入视觉细节。

## What Changes
- 新增统一展示壳层（页面头部、筛选区、图表区、状态区）逻辑组件。
- 新增图表容器响应式逻辑（尺寸监听、重绘节流、标签密度控制）。
- 新增展示状态分层逻辑（loading/empty/error/retry）统一协议。
- 新增调试信息展示开关逻辑（开发可见、生产默认收起）。
- 新增低保真界面约束（简化样式，避免复杂视觉实现）。
- **BREAKING**：分析页将从各自拼装布局改为统一展示壳层驱动，页面内部结构会重排。

## Impact
- Affected specs: 页面展示一致性规范、图表响应式规范、状态展示规范、调试可见性规范。
- Affected code: `frontend/src/renderer/src/views/*.tsx`、`frontend/src/renderer/src/components/*`、`frontend/src/renderer/src/components/charts/*.tsx`、`frontend/src/renderer/src/hooks/*`。

## ADDED Requirements
### Requirement: 统一展示壳层
The system SHALL 提供统一的展示壳层逻辑，用于承载分析页通用结构，而非每页重复拼装。

#### Scenario: 页面结构统一
- **WHEN** 用户进入任一分析页
- **THEN** 页面按统一结构展示（标题区、筛选区、图表区、状态区）
- **AND** 页面可在不改业务请求逻辑的前提下复用壳层

### Requirement: 图表响应式展示逻辑
The system SHALL 在图表容器尺寸变化时执行一致的重绘策略，并控制高密度标签可读性。

#### Scenario: 容器尺寸变化
- **WHEN** 窗口或容器宽高变化
- **THEN** 图表自动重算布局并重新绘制
- **AND** 标签密度按可读性规则自动调整

### Requirement: 统一状态展示协议
The system SHALL 统一处理 loading/empty/error/retry 的展示分支逻辑。

#### Scenario: 请求失败
- **WHEN** 页面数据请求失败
- **THEN** 展示统一错误态与重试入口
- **AND** 保持各分析页行为一致

### Requirement: 低保真界面策略
The system SHALL 在本阶段仅实现基础可用界面，不引入复杂视觉样式系统。

#### Scenario: 样式实现范围控制
- **WHEN** 开发本阶段展示功能
- **THEN** 仅使用简化样式和现有组件体系
- **AND** 不进行高保真视觉细节投入

## MODIFIED Requirements
### Requirement: 分析页展示组织方式
系统 SHALL 从“页面内分散定义布局与状态”改为“壳层组件统一组织展示逻辑，页面仅提供数据与配置”。

### Requirement: 图表重绘触发方式
系统 SHALL 从“依赖数据变化触发重绘”扩展为“数据变化 + 容器变化共同触发重绘”。

## REMOVED Requirements
### Requirement: 各页面独立维护展示结构
**Reason**: 重复实现导致维护成本高、展示行为不一致。  
**Migration**: 将页面通用展示结构迁移到统一壳层组件，页面保留业务数据获取与图表配置输入。

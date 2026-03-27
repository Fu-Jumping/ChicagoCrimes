# 趋势页 Figma 补全对齐 Spec

## Why
当前趋势页虽然已经完成基础深色化与布局迁移，但仍有若干界面元素、按钮样式与 Figma 稿件不一致。需要补齐缺失元素并继续收敛共享壳层行为，确保现有业务可直接承载设计稿。

## What Changes
- 补齐趋势页中尚未实现的标题区微元素、筛选区、状态条、按钮与卡片细节。
- 收敛共享壳层与调试区行为，避免非稿件元素干扰趋势页还原度。
- 对齐图表容器周边的视觉元素与文案，不改动底层接口契约。
- 统一缺失或偏差按钮的尺寸、文案、层级与交互反馈。
- **BREAKING**：趋势页局部展示结构、按钮文案和状态区表现将按 Figma 稿件重排。

## Impact
- Affected specs: 趋势页展示一致性、Figma 还原准确性、共享壳层适配策略。
- Affected code: `frontend/src/renderer/src/views/TrendAnalysis.*`、`frontend/src/renderer/src/components/AnalysisPageShell.tsx`、`frontend/src/renderer/src/components/AppLayout.tsx`、相关公共样式文件。

## ADDED Requirements
### Requirement: 趋势页补齐缺失界面元素
The system SHALL 按 Figma 稿件补齐趋势页中缺失的界面元素、按钮与装饰结构。

#### Scenario: 打开趋势页
- **WHEN** 用户进入时间趋势分析页
- **THEN** 页面展示与 Figma 对齐的标题区、筛选区、状态条、卡片头部与按钮
- **AND** 不再遗漏设计稿中已定义的可见元素

### Requirement: 按钮与状态条精确对齐
The system SHALL 对页面中的按钮、标签与状态条进行尺寸、颜色、描边、文案与层级对齐。

#### Scenario: 查看状态条与按钮
- **WHEN** 页面渲染状态提示或操作按钮
- **THEN** 按钮与状态条符合设计稿视觉规范
- **AND** 不出现旧版占位按钮或多余操作入口

### Requirement: 共享壳层按页面裁剪
The system SHALL 允许趋势页关闭或裁剪不属于稿件的共享壳层元素。

#### Scenario: 趋势页使用共享壳层
- **WHEN** 趋势页通过共享壳层渲染
- **THEN** 仅保留设计稿所需壳层能力
- **AND** 非稿件元素不会破坏页面层级

## MODIFIED Requirements
### Requirement: 趋势页视觉还原范围
系统 SHALL 从“低保真可用实现”升级为“针对 Trend 页面补齐缺失元素并提升还原度”，同时继续保持业务数据与路由逻辑不变。

### Requirement: 共享组件复用策略
系统 SHALL 从“所有页面统一暴露同一展示能力”调整为“共享组件按页面差异提供可裁剪能力”。

## REMOVED Requirements
### Requirement: 趋势页允许使用占位式替代元素
**Reason**: 占位式元素会导致与 Figma 稿件的按钮、状态条和标题细节持续偏差。  
**Migration**: 将趋势页占位元素替换为按稿件语义和视觉实现的正式结构，并用共享组件开关隔离非稿件功能。

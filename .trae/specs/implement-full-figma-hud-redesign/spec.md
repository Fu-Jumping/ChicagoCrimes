# 全量 Figma HUD 对齐整改 Spec

## Why
当前前端实现仅在局部页面接近视觉稿，四个核心页面在布局骨架、导航层级、交互状态、文案语言、主题机制与测试保障上与设计稿存在系统性偏差。需要一次完整整改，确保课程作业交付在视觉、交互、可维护性与验收链路上可闭环。

## What Changes
- 重构四屏页面骨架（Dashboard/Trend/District/Type）为与设计稿一致的专属布局，不再依赖单一通用页面壳层。
- 建立 HUD 设计组件层，统一标题区、状态条、筛选区、内容卡、底部 Dock、侧边导航、调试条与提示层。
- 建立按钮/可交互元素映射表，逐项对齐文案、状态、跳转、参数与接口绑定。
- 补齐设计稿存在但当前缺失的空状态、骨架屏、错误浮层、工具提示与微动效。
- 建立 zh-CN 语言包并替换硬编码文案，覆盖 UI 文案与 aria 文案。
- 建立亮色/深色双主题 token 与运行时切换持久化，并完成对比度校验。
- 建立 UI 自动化测试、组件测试与视觉回归截图基线，纳入 CI 验证。
- 输出整改报告，包含差异清单、修复清单、颜色 token 映射表与新增组件 API 文档。
- **BREAKING** 现有页面布局与共享壳层结构将发生重构，样式类名与组件层级会调整。
- **BREAKING** 页面文案来源统一改为 i18n 资源文件，禁止继续在组件中硬编码 UI 文案。

## Impact
- Affected specs: 趋势分析视图、分区分析视图、总览视图、类型分析视图、全局导航、主题系统、国际化系统、测试与验收流程
- Affected code: `frontend/src/renderer/src/views/*`、`frontend/src/renderer/src/components/*`、`frontend/src/renderer/src/assets/*`、`frontend/package.json`、测试与 CI 配置文件

## ADDED Requirements
### Requirement: 四屏像素级视觉对齐
系统 SHALL 对 Dashboard Overview、Trend Analysis、District Analysis、Type Analysis 四个页面完成与设计稿逐屏对照整改，并在统一截图基线下实现关键元素像素差异不超过 1px。

#### Scenario: 四屏截图对齐成功
- **WHEN** 在标准窗口尺寸下对四个页面执行自动截图比对
- **THEN** 所有关键视觉区域的差异结果满足阈值（<=1px）

### Requirement: 按钮与交互流程一致
系统 SHALL 为所有按钮与可交互元素建立映射并完成对齐，包括文案、状态、跳转、参数、权限与接口绑定。

#### Scenario: 按钮映射与行为校验通过
- **WHEN** 执行交互自动化脚本遍历页面可交互元素
- **THEN** 每个元素均满足映射表定义，且点击行为与目标流程一致

### Requirement: 缺失 HUD 元素补全
系统 SHALL 补齐设计稿中存在但当前实现缺失的空状态、骨架屏、错误提示层、工具提示与微动效，并提供对应组件测试。

#### Scenario: 缺失元素完整可用
- **WHEN** 页面进入加载、空数据、接口错误与交互悬停等状态
- **THEN** 正确展示对应 HUD 元素且可访问性属性符合规范

### Requirement: 中文化与国际化资源统一
系统 SHALL 建立 `zh-CN.json` 语言包并替换所有硬编码 UI 文案与 aria 文案，支持后续可维护扩展。

#### Scenario: i18n 扫描无遗漏
- **WHEN** 执行国际化扫描脚本
- **THEN** 不存在硬编码中文/英文 UI 文案遗漏项，且无乱码与截断问题

### Requirement: 深色/亮色主题与对比度合规
系统 SHALL 提供亮色与深色两套 design token，支持运行时切换与偏好持久化，关键文本对比度满足 WCAG 2.1 AA（>=4.5:1）。

#### Scenario: 主题切换与可读性验证通过
- **WHEN** 用户切换主题并刷新应用
- **THEN** 主题状态保持一致且对比度检查通过

### Requirement: 验收链路自动化
系统 SHALL 建立 UI 自动化测试、组件测试与视觉回归流程，并纳入 CI 阶段性门禁。

#### Scenario: CI 验收门禁通过
- **WHEN** 运行前端验收流水线
- **THEN** lint、typecheck、测试、视觉回归与性能基线检查全部通过

## MODIFIED Requirements
### Requirement: 页面壳层与导航组织方式
现有“统一壳层 + 通用卡片布局”能力修改为“共享基础容器 + 页面专属 HUD 壳层”，支持趋势页侧边栏结构与其余页面顶部/底部双导航结构并行。

#### Scenario: 页面骨架按设计分层渲染
- **WHEN** 用户在四个分析页面之间切换
- **THEN** 每个页面展示其专属骨架与导航结构，不再被单一壳层限制

### Requirement: 视觉样式来源
现有散落式样式覆盖修改为 token 驱动与页面局部样式协同，关键颜色、边框、圆角、阴影、字体通过主题变量统一控制。

#### Scenario: 样式统一可追溯
- **WHEN** 调整任一设计 token
- **THEN** 对应页面组件样式按预期联动更新且无跨页污染

## REMOVED Requirements
### Requirement: 页面内硬编码文案策略
**Reason**: 硬编码文案导致中文化不可控、维护成本高且无法做自动化扫描。
**Migration**: 将页面与组件中的文案、aria-label、状态提示迁移到 `zh-CN.json`，组件仅读取资源键。

### Requirement: 依赖单一通用壳层完成四屏布局
**Reason**: 四屏布局差异明显，单壳层无法满足像素级对齐与交互语义。
**Migration**: 保留基础容器能力，新增页面专属 shell 组件并逐页接入。

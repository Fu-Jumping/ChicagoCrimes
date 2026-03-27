# Tasks
- [x] Task 1: 建立整改基线与差异台账。
  - [x] SubTask 1.1: 固定四屏标准窗口尺寸并生成当前实现基线截图。
  - [x] SubTask 1.2: 逐屏输出视觉差异清单（尺寸、间距、字体、图标、动效）。
  - [x] SubTask 1.3: 输出按钮/交互映射表初稿（文案、状态、路径、参数、权限、接口）。

- [x] Task 2: 重构页面骨架与 HUD 组件层。
  - [x] SubTask 2.1: 为 Dashboard/Trend/District/Type 建立专属页面 shell。
  - [x] SubTask 2.2: 抽离共享 HUD 组件（标题区、状态条、筛选区、卡片容器、底部导航、侧栏、调试条）。
  - [x] SubTask 2.3: 清理与设计稿冲突的通用壳层逻辑并保持路由可用。

- [x] Task 3: 完成四屏视觉与交互逐项对齐。
  - [x] SubTask 3.1: 对齐 Dashboard Overview 页面结构、图表容器与底部 Dock。
  - [x] SubTask 3.2: 对齐 Trend Analysis 页面侧栏、告警条、三块分析面板与底部信息。
  - [x] SubTask 3.3: 对齐 District Analysis 页面筛选区、双大卡布局与热点条目。
  - [x] SubTask 3.4: 对齐 Type Analysis 页面双列上半区与全宽下半区效率条。
  - [x] SubTask 3.5: 完成按钮映射表修订并修复事件绑定、跳转与参数传递。

- [x] Task 4: 补齐缺失元素并建立中文化体系。
  - [x] SubTask 4.1: 新增空状态、骨架屏、错误浮层、工具提示与微动效。
  - [x] SubTask 4.2: 新建 `zh-CN.json` 并替换全量页面与组件硬编码文案。
  - [x] SubTask 4.3: 补齐 aria-label 等无障碍文案并通过 i18n 扫描脚本检查。

- [x] Task 5: 构建深浅主题 token 与审查能力。
  - [x] SubTask 5.1: 建立 light/dark token 文件并映射边框、背景、文字、按钮、图标、分割线、阴影。
  - [x] SubTask 5.2: 实现运行时主题切换与偏好持久化。
  - [x] SubTask 5.3: 执行 WCAG 对比度检查并输出主题审查截图（Storybook 或同等方案）。

- [x] Task 6: 建立测试与 CI 验收链路并收敛交付。
  - [x] SubTask 6.1: 为新增组件编写单元测试，覆盖渲染、交互、无障碍。
  - [x] SubTask 6.2: 编写 UI 自动化测试覆盖四屏改动点与核心交互流程。
  - [x] SubTask 6.3: 建立视觉回归截图对比并执行像素阈值校验。
  - [x] SubTask 6.4: 接入 lint/typecheck/测试/性能基线门禁并修复失败项。
  - [x] SubTask 6.5: 输出整改报告（差异清单、修复方案、token 映射、组件 API 文档）。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 2
- Task 6 depends on Task 4
- Task 6 depends on Task 5

# 可并行项
- Task 3 与 Task 5 可在 Task 2 完成后并行推进
- Task 6.1 与 Task 6.2 可并行推进

## 交付文档
- `task1-baseline-gap.md`
- `task3-button-interaction-map.md`
- `task6-validation-report.md`

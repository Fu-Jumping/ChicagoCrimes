# Tasks
- [x] Task 1: 抽象统一展示壳层并接入分析页。
  - [x] SubTask 1.1: 提取页面通用结构组件（标题、筛选、内容、状态）。
  - [x] SubTask 1.2: 将趋势、类型、区域、总览页面迁移到统一壳层。
  - [x] SubTask 1.3: 保持现有数据请求与全局筛选能力兼容。

- [x] Task 2: 改造图表响应式展示逻辑。
  - [x] SubTask 2.1: 为图表容器增加尺寸监听与重绘触发。
  - [x] SubTask 2.2: 增加重绘节流与最小绘制阈值。
  - [x] SubTask 2.3: 增加高密度标签自动抽样策略。

- [x] Task 3: 统一状态展示与重试逻辑。
  - [x] SubTask 3.1: 对齐 loading/empty/error/retry 展示分支。
  - [x] SubTask 3.2: 将错误态文案与重试入口统一到公共组件。
  - [x] SubTask 3.3: 验证四个分析页状态行为一致。

- [x] Task 4: 控制样式实现范围并保留后续 Figma 接口。
  - [x] SubTask 4.1: 使用低保真样式完成界面可用性实现。
  - [x] SubTask 4.2: 避免复杂视觉定制，仅保留结构与语义类名。
  - [x] SubTask 4.3: 为后续 Figma 重设计预留清晰替换点。

- [x] Task 5: 完成回归验证与验收收口。
  - [x] SubTask 5.1: 完成 `lint` 与 `typecheck` 验证。
  - [x] SubTask 5.2: 完成关键展示路径手工联调验证。
  - [x] SubTask 5.3: 更新 checklist 勾选并收口遗留项。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 2
- Task 5 depends on Task 3
- Task 5 depends on Task 4

# 可并行项
- Task 2 与 Task 3 可在 Task 1 完成后并行推进
- Task 4 可与 Task 2、Task 3 并行推进

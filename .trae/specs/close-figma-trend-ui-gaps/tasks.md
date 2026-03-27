# Tasks
- [x] Task 1: 复核 Figma 并补齐趋势页缺失元素。
  - [x] SubTask 1.1: 对照 Figma 复核标题区、筛选区、状态条与按钮缺口。
  - [x] SubTask 1.2: 在趋势页补齐缺失元素并修正对应层级。
  - [x] SubTask 1.3: 保持现有业务请求、筛选联动与图表数据不回退。

- [x] Task 2: 收敛共享壳层与非稿件元素。
  - [x] SubTask 2.1: 调整壳层开关，移除趋势页非稿件调试或多余展示。
  - [x] SubTask 2.2: 校正全局容器与趋势页局部的视觉冲突。
  - [x] SubTask 2.3: 保持其他分析页不被本次修复破坏。

- [x] Task 3: 精修按钮与视觉细节。
  - [x] SubTask 3.1: 对齐按钮尺寸、描边、颜色、圆角与禁用态。
  - [x] SubTask 3.2: 对齐标签、告警条、标题微元素与卡片头部细节。
  - [x] SubTask 3.3: 收敛非稿件 hover/发光/伪装饰效果。

- [x] Task 4: 完成验收与回归验证。
  - [x] SubTask 4.1: 运行 `npm run typecheck`。
  - [x] SubTask 4.2: 对照 checklist 逐项验收趋势页还原度。
  - [x] SubTask 4.3: 如发现缺口，补充修复并重新验证。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2
- Task 4 depends on Task 3

# 可并行项
- Task 2 与 Task 3 可在 Task 1 完成后并行推进

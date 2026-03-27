# Tasks
- [x] Task 1: 冻结后端契约基线，统一响应和参数规范。
  - [x] SubTask 1.1: 盘点现有 10 个分析接口输入输出差异。
  - [x] SubTask 1.2: 定义统一响应结构与错误结构。
  - [x] SubTask 1.3: 定义 year/start_date/end_date/limit/sort 校验规则。
  - [x] SubTask 1.4: 输出契约版本策略与变更日志模板。

- [x] Task 2: 增强后端性能与可观测能力。
  - [x] SubTask 2.1: 为热点聚合接口增加应用层缓存策略。
  - [x] SubTask 2.2: 增加 ETag/If-None-Match 条件缓存流程。
  - [x] SubTask 2.3: 增加 request_id、接口耗时、慢查询日志。
  - [x] SubTask 2.4: 增加健康检查接口与依赖状态摘要。

- [x] Task 3: 定义 D3 友好数据协议并完成适配约束。
  - [x] SubTask 3.1: 规定时间序列固定桶位与缺失补零规则。
  - [x] SubTask 3.2: 规定分类图稳定 key 与稳定排序规则。
  - [x] SubTask 3.3: 定义 meta 字段中的维度/指标/口径回显。
  - [x] SubTask 3.4: 统一空态、错态、加载态所需字段。

- [x] Task 4: 完成联调验证与发布准入。
  - [x] SubTask 4.1: 完成接口契约联调并修复不一致项。
  - [x] SubTask 4.2: 完成关键图表回归（折线/柱状/饼图）。
  - [x] SubTask 4.3: 完成性能验证（缓存命中、耗时阈值）。
  - [x] SubTask 4.4: 输出发布说明与已知限制。

- [x] Task 5: 补齐未通过验收项并关闭发布阻断。
  - [x] SubTask 5.1: 为核心分析接口补充可复用示例响应与契约示例文档。
  - [x] SubTask 5.2: 建立可查询的契约变更记录并补齐当前版本实际条目。
  - [x] SubTask 5.3: 增加数据质量检查（空值、异常口径）及告警输出。
  - [x] SubTask 5.4: 实现跨图筛选联动与统一事件参数格式。
  - [x] SubTask 5.5: 完成空态/错态展示、重试入口和字段缺失降级策略。
  - [x] SubTask 5.6: 补充大数据量与缓存失效行为专项验证并产出结果。

- [x] Task 6: 关闭剩余验收阻断并补齐量化证据。
  - [x] SubTask 6.1: 修复前端 typecheck 阻断（`TS2503: Cannot find namespace 'JSX'`）。
  - [x] SubTask 6.2: 建立前端大数据量渲染性能基准与卡顿阈值报告。
  - [x] SubTask 6.3: 在联调回归中加入 `npm run typecheck` 与性能基准门禁。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 3
- Task 5 depends on Task 4
- Task 6 depends on Task 5

# 可并行项
- Task 2 与 Task 3 可在 Task 1 完成后并行推进
- Task 5.3 与 Task 5.4 可并行推进
- Task 6.1 与 Task 6.2 可并行推进

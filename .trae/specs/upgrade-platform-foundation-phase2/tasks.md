# Tasks
- [x] Task 1: 建立仓库级统一启动与环境约束入口。
  - [x] SubTask 1.1: 梳理前后端当前启动命令并统一为根级入口。
  - [x] SubTask 1.2: 增加环境变量示例与缺失项校验机制。
  - [x] SubTask 1.3: 增加错误目录运行时的友好提示与修复建议。

- [x] Task 2: 完成后端安全基线收口改造。
  - [x] SubTask 2.1: 移除数据库明文默认凭据兜底并改为启动阻断。
  - [x] SubTask 2.2: 将 CORS 改为可配置白名单策略。
  - [x] SubTask 2.3: 健康检查输出脱敏并保留服务端可追踪日志。

- [x] Task 3: 重构前端为全局筛选联动中心。
  - [x] SubTask 3.1: 建立全局筛选状态容器并接入路由层。
  - [x] SubTask 3.2: 改造四个分析页统一消费全局筛选。
  - [x] SubTask 3.3: 增加全局清空与筛选状态可视化提示。

- [x] Task 4: 增加请求观测面板与诊断信息。
  - [x] SubTask 4.1: 在 API 层采集 request_id、缓存命中、耗时与错误摘要。
  - [x] SubTask 4.2: 新增可折叠调试面板并接入各分析页。
  - [x] SubTask 4.3: 增加失败重试和请求历史最小追踪能力。

- [x] Task 5: 增强 D3 交互能力并统一事件语义。
  - [x] SubTask 5.1: 为折线/柱状/饼图增加 Tooltip 与图例显隐。
  - [x] SubTask 5.2: 为关键图表增加刷选/高亮与标签防重叠策略。
  - [x] SubTask 5.3: 统一事件协议并完成跨图触发验证。

- [x] Task 6: 升级回归门禁与发布前验证。
  - [x] SubTask 6.1: 整合根级联启验证脚本（前后端可用性）。
  - [x] SubTask 6.2: 保留并扩展 typecheck + 性能基准门禁。
  - [x] SubTask 6.3: 输出本次升级的变更摘要与已知限制清单。

## Task 6 验证结果

- 验证命令：`python start.py verify`
- 根级启动前置检查：通过。
- 后端回归可用性验证：`Ran 14 tests in 0.183s, OK`。
- 前端扩展门禁验证：通过（`样本量=10000`，`轮次=12`，`totalP95=9.07ms`）。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 3
- Task 5 depends on Task 3
- Task 6 depends on Task 2
- Task 6 depends on Task 4
- Task 6 depends on Task 5

# 可并行项
- Task 2 与 Task 3 可在 Task 1 完成后并行推进
- Task 4 与 Task 5 可在 Task 3 完成后并行推进

# Task 4 发布说明（联调验证与发布准入）

## 1. 联调修复项

- 修复契约口径不一致：`/api/v1/analytics/types/arrest_rate` 的 `meta.metric_definitions` 中 `arrest_rate` 单位由 `percent` 调整为 `ratio`，与实际返回值范围 `0~1` 保持一致。
- 修复后，前端可继续按展示层需求将 `ratio` 转换为百分比文案，避免契约歧义。

## 2. 关键图表回归结果

新增回归用例：`backend/tests/test_task4_validation.py::test_chart_regression_line_bar_pie_contract`

- 折线图数据源回归：`/api/v1/analytics/trend/monthly` 校验 `month/count/key` 字段与 `meta.dimension=["month"]`。
- 柱状图数据源回归：`/api/v1/analytics/districts/comparison` 校验 `district/count/key` 字段与 `meta.dimension=["district"]`。
- 饼图数据源回归：`/api/v1/analytics/types/proportion` 校验 `primary_type/count/key` 字段与 `meta.dimension=["primary_type"]`。

## 3. 性能验证结果

新增性能用例：`backend/tests/test_task4_validation.py::test_performance_cache_hit_and_etag`

- 首次请求：`X-Cache=MISS`，模拟聚合耗时约 `81.83ms`。
- 重复同参请求：`X-Cache=HIT`，实际耗时约 `0.05ms`，明显低于首次请求。
- 条件请求：携带 `If-None-Match` 后返回 `304 Not Modified`，`X-Cache=HIT`。
- 验证结论：缓存命中与 ETag 协商流程符合发布准入要求，热点查询具备明显性能收益。

## 4. 验证命令与通过结果

在 `backend` 目录执行：

```bash
.\venv\Scripts\python -m unittest discover -s tests -v
```

结果：`Ran 8 tests ... OK`。

## 5. 已知限制

- 当前后端测试基于 `TestClient` 与依赖替身，尚未覆盖真实 MySQL 大数据量压力场景。
- 生产环境建议补充真实数据集压测与前端端到端渲染性能采样（首屏耗时、交互帧率）。

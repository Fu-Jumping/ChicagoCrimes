# Task 5.6 专项验证结果

## 验证范围

- 大数据量返回行为：验证接口在 5000 行数据下的结构完整性、状态字段、数据质量字段与缓存命中行为。
- 缓存失效行为：验证缓存命中后，缓存过期会触发重新计算并返回最新结果。

## 新增自动化用例

- 文件：`backend/tests/test_task5_special_validation.py`
- 用例 1：`test_large_dataset_response_and_cache_hit`
  - 模拟 `districts/comparison` 返回 5000 行数据。
  - 首次请求 `X-Cache=MISS`，重复请求 `X-Cache=HIT`。
  - `meta.state_contract.empty.size=5000`，`meta.data_quality.checked_rows=5000`。
- 用例 2：`test_cache_invalidation_after_expiration`
  - 首次请求命中 `MISS`，第二次请求命中 `HIT`。
  - 人工将缓存项过期后再次请求，返回 `MISS` 且数据重新计算。

## 执行结果

- 命令：`.\venv\Scripts\python.exe -m unittest tests.test_task5_special_validation -v`
  - 结果：2/2 通过。
- 命令：`.\venv\Scripts\python.exe -m unittest discover -s tests -v`
  - 结果：11/11 通过。

## 验收结论

- Task 5.6 目标已完成：已覆盖大数据量与缓存失效专项验证，且结果已通过自动化测试。

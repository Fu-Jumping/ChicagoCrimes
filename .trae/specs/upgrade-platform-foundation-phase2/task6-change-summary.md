# Task 6 变更摘要与已知限制

## 变更摘要

- 新增根级验证入口：`python start.py verify`，串联执行根级前置检查、后端回归可用性验证、前端扩展门禁验证。
- 扩展前端门禁：
  - 新增 `typecheck:strict`（`lint + typecheck`）。
  - 新增 `perf:benchmark:ci`（更大样本与更多轮次的性能基准）。
  - 新增 `gate:release`（`typecheck:strict + perf:benchmark:ci`）。
- 新增 CI 性能脚本：`frontend/scripts/perf-benchmark-ci.mjs`，默认基准为 `10000` 样本、`12` 轮采样。

## 验证结果

- 根级验证命令：

```bash
python start.py verify
```

- 本次执行结果：
  - 根级启动前置检查：通过。
  - 后端回归可用性验证：`Ran 14 tests in 0.183s, OK`。
  - 前端扩展门禁：通过，性能结果 `normalizeP95=0.72ms`、`lineP95=2.42ms`、`barP95=1.46ms`、`pieP95=6.79ms`、`totalP95=9.07ms`。

## 已知限制

- `typecheck:strict` 中的 `lint` 当前存在较多 warning（主要为 prettier/react-hooks），不影响当前门禁通过，但建议后续收敛为零 warning。
- 根级验证目前聚焦“可用性与回归门禁”校验，未在自动流程中覆盖真实 Electron GUI 交互联调。
- 性能门禁基于本机环境的 Node 进程计算基准，不等同于端到端页面渲染帧率，生产发布前仍建议补充真实设备采样。

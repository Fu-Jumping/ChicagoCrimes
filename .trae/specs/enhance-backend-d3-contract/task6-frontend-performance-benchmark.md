# Task 6 前端大数据性能基准报告

## 基准目标

- 样本规模：5000 条记录（模拟大数据量图表输入）。
- 目标门禁：将 `typecheck` 与渲染基准一起纳入联调回归阻断。
- 卡顿阈值（P95）：
  - 数据归一化：`<= 30ms`
  - 折线布局：`<= 100ms`
  - 柱状布局：`<= 90ms`
  - 饼图布局：`<= 170ms`
  - 总耗时：`<= 320ms`

## 基准方法

- 执行命令：`npm run perf:benchmark`
- 基准脚本：`frontend/scripts/perf-benchmark.mjs`
- 测量范围：
  - 数据归一化（模拟 `chartData` 降级/兜底路径）
  - 折线图布局计算（D3 scalePoint + line）
  - 柱状图布局计算（D3 scaleBand）
  - 饼图布局计算（D3 pie + arc）
- 统计口径：8 轮采样，输出 P95 作为门禁判断依据。

## 本次结果

- 执行时间：`2026-03-26T14:51:46.852Z`
- 结果文件：`frontend/perf-results/latest.json`

| 指标 | 阈值(ms) | 实测 P95(ms) | 结论 |
| --- | ---: | ---: | --- |
| normalizeP95 | 30 | 0.13 | 通过 |
| lineP95 | 100 | 1.12 | 通过 |
| barP95 | 90 | 0.95 | 通过 |
| pieP95 | 170 | 4.36 | 通过 |
| totalP95 | 320 | 5.91 | 通过 |

## 门禁接入

- `frontend/package.json` 新增：
  - `perf:benchmark`：执行性能基准并输出结果。
  - `gate:regression`：串联执行 `npm run typecheck && npm run perf:benchmark`。
- 联调回归命令：`npm run gate:regression`
- 当任一指标超过阈值时，脚本返回非零退出码并阻断回归。

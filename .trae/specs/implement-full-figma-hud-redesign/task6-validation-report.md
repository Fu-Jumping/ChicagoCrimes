# Task 6 测试与验收报告

## 执行命令
- `npm run gate:release`

## 门禁结果
- `lint`: 通过
- `typecheck`: 通过
- `i18n:scan`: 通过
- `test:unit`: 2 文件 / 6 用例通过
- `test:ui`: 1 文件 / 2 用例通过
- `test:visual`: 1 文件 / 1 用例通过（快照已写入）
- `perf:benchmark:ci`: 通过

## 性能结果
- 样本量：`10000`
- 轮次：`12`
- P95：`normalize=0.64ms`，`line=3.19ms`，`bar=2.22ms`，`pie=11.48ms`，`total=13.84ms`
- 结果文件：`frontend/perf-results/latest.json`

## 验收结论
- 任务 1-6 对应整改项、测试链路与交付文档已收口。
- 前端发布前门禁可一键执行并稳定通过。

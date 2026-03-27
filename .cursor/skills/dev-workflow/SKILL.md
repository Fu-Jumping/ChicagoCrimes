---
name: dev-workflow
description: Development workflow, startup, testing, regression gates and project conventions for Chicago Crime Visualization. Use when starting dev servers, running tests, building, checking types, running benchmarks, or understanding the project's code quality gates.
---

# 开发工作流

## 项目启动

### 后端（FastAPI）

```bash
cd backend
pip install -r requirements.txt
python main.py
# 监听 http://localhost:8000
# Swagger UI: http://localhost:8000/docs
# 健康检查: http://localhost:8000/healthz
```

### 前端（Electron + React）

```bash
cd frontend
npm install
npm run dev
# 自动启动 Electron 窗口 + Vite 热更新
```

### 一键启动（根目录）

```bash
python start.py
# 同时启动后端与前端
```

## 质量检查门控

| 命令 | 说明 | 何时运行 |
|------|------|----------|
| `npm run typecheck` | TypeScript 类型检查（node + web） | 开发中频繁运行 |
| `npm run typecheck:strict` | lint + typecheck | 提交前 |
| `npm run perf:benchmark` | 本地性能基准测试 | 功能完成后 |
| `npm run perf:benchmark:ci` | CI 严格性能基准 | 发布前 |
| `npm run gate:regression` | typecheck + perf benchmark | PR 前 |
| `npm run gate:release` | typecheck:strict + perf:benchmark:ci | 发布前 |

## 后端测试

```bash
cd backend
pip install pytest
pytest tests/ -v

# 按阶段运行
pytest tests/test_task2_security_baseline.py -v
pytest tests/test_task3_contract.py -v
pytest tests/test_task4_validation.py -v
pytest tests/test_task5_special_validation.py -v
```

## 构建与发布

```bash
cd frontend

# Windows 安装包
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 代码规范

- **格式化**: Prettier（`.prettierrc.yaml`）
- **Lint**: ESLint 9（`eslint.config.mjs`）
- **TypeScript**: strict 模式，`tsconfig.web.json` + `tsconfig.node.json`
- **Python**: 无额外 lint 工具，遵循 PEP8

```bash
# 前端格式化
cd frontend && npm run format

# 前端 lint
cd frontend && npm run lint
```

## 环境变量

参考 `.env.example`：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CACHE_TTL_SECONDS` | 120 | 缓存过期时间（秒） |
| `CACHE_MAX_ENTRIES` | 256 | 最大缓存条数 |
| `SLOW_QUERY_THRESHOLD_MS` | 800 | 慢查询告警阈值 |
| `CORS_ALLOWED_ORIGINS` | 空 | 允许的 CORS 来源，逗号分隔 |
| `LOG_LEVEL` | INFO | 日志级别 |

## 项目规划文档位置

```
doc/spec/spec.md                    # 总体技术规范
doc/spec/contract-versioning.md     # 契约版本管理
doc/plans/                          # 实施计划
.trae/specs/                        # 历史阶段规划
```

## API 调试

- **Swagger UI**: `http://localhost:8000/docs`
- **前端 RequestDebugPanel**: 开发模式下显示请求历史、状态码、缓存命中、耗时
- **后端日志**: 每次请求打印 `request_id`、`duration_ms`、`cache` 状态，慢查询单独 WARNING

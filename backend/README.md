# 后端开发说明（FastAPI + MySQL）

面向接力负责 **API、数据库与 SQL** 的同学。前端与联启方式见仓库根目录 [README.md](../README.md)；首次部署与导入大 CSV 见 [用户指南](../docs/user-guide.md)。

---

## 1. 技术栈与前置条件

- **Python** 3.10+  
- **MySQL** 8.x（服务已启动，具备建库、建表与 `LOAD DATA`/`local_infile` 等权限视导入方式而定）  
- 依赖清单：[requirements.txt](./requirements.txt)（FastAPI、SQLAlchemy 2、PyMySQL、Pydantic v2、uvicorn、python-dotenv 等）

---

## 2. `.env` 必须放在仓库根目录

后端通过 `app/config/env_file.py` 解析 **Git 仓库根目录**（即与 `start.py`、`frontend/` 同级），并在该目录加载 `.env`。

- **正确**：`实践/.env`  
- **错误**：`实践/backend/.env`（开发模式下不会被自动加载）

仅在后端目录执行 `uvicorn` 时，也请保持 `.env` 在根目录；或自行 `export`/`set` 全部 `MYSQL_*` 等变量。

模板：[.env.example](../.env.example)。**勿使用**被后端拒绝的不安全默认组合（如特定 `root`/`123456`/`chicago_crime` 等），详见 `tests/test_task2_security_baseline.py`。

---

## 3. 虚拟环境与安装

在仓库根目录或 `backend` 下均可执行安装；建议将 venv 放在 `backend/venv`，与根目录 [start.py](../start.py) 在 Windows 上优先选用的解释器路径一致。

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

---

## 4. 只启动后端（不跑 Electron）

工作目录必须是 **`backend/`**（模块名为 `main:app`）。确保根目录 `.env` 已配置或环境变量已导出：

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

默认开发地址：<http://127.0.0.1:8000>。联调前端 dev server 时，CORS 默认已包含 `http://localhost:5173` 等；若自定义端口或域名，见下文 `CORS_ALLOWED_ORIGINS`。

- **交互式 API 文档**：<http://127.0.0.1:8000/docs>（Swagger）  
- **ReDoc**：<http://127.0.0.1:8000/redoc>

---

## 5. 与 `python start.py dev` 的关系

在仓库根执行 `python start.py dev` 会同时启动后端（同上 uvicorn）与前端 `npm run dev`，并从根目录注入环境变量。只改后端时，用上一节的单后端命令即可，无需启动前端。

---

## 6. 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `MYSQL_USER` | 是* | MySQL 用户名 |
| `MYSQL_PASSWORD` | 否（可为空） | 密码 |
| `MYSQL_HOST` | 是* | 主机 |
| `MYSQL_PORT` | 是* | 端口 |
| `MYSQL_DATABASE` | 是* | 数据库名 |

\*未配全时，后端进入 **设置向导模式**（不创建 Engine），用于桌面端首次配置；此时分析类接口可能不可用，直至向导写入 `.env` 或你手动配齐并重启。

| 变量 | 默认 | 说明 |
|------|------|------|
| `BACKEND_HOST` | `0.0.0.0` | 监听地址 |
| `BACKEND_PORT` | `8000` | 监听端口 |
| `LOG_LEVEL` | `INFO` | 日志级别 |
| `CACHE_TTL_SECONDS` | `600` | 响应缓存 TTL（秒） |
| `CACHE_MAX_ENTRIES` | `512` | 响应缓存最大条数 |
| `SLOW_QUERY_THRESHOLD_MS` | `800` | 慢查询日志阈值（毫秒） |
| `CORS_ALLOWED_ORIGINS` | 内置含 5173、8000、`file://` 等 | 逗号分隔；会与默认值合并 |

打包/桌面运行时，可设置 `CHICAGO_CRIME_DATA_DIR` 指定可写数据目录（含 `.env`）；详见 `app/config/env_file.py`。

完整模板与注释见根目录 [.env.example](../.env.example)。

---

## 7. 测试

在 **`backend/`** 目录下执行。

**推荐（后端全部单测）：**

```bash
python -m unittest discover -s tests -p "test_*.py"
```

说明：根目录 `python start.py verify` 中的后端步骤仅匹配 `test_task*.py`，**不会**运行例如 `test_setup.py`、`test_extended_filters.py`、`test_geo_analytics.py` 等，接力开发请以 `test_*.py`  discover 结果为准。

---

## 8. SQL 脚本（`sql/`）

| 文件 | 用途 |
|------|------|
| `schema_crimes.sql` | 表结构与基础定义 |
| `import_kaggle_crimes.sql` | 全量 CSV 导入（路径需与现场一致，常需绝对路径） |
| `import_kaggle_crimes_sample_200k.sql` | 抽样导入 |
| `rebuild_layered_summaries.sql` | 分层汇总相关对象 |
| `optimize_performance.sql` | 索引与性能相关 |

典型顺序：建库 → `schema` → `import` → 应用内或脚本构建汇总（见用户指南与 `scripts/`）。详细排错见 [用户指南](../docs/user-guide.md) 与应用内手动指南。

---

## 9. 前后端契约与规格

开发或改分析接口前，请先阅读（均在仓库 `doc/spec/`）：

- [contract-versioning.md](../doc/spec/contract-versioning.md) — 版本与兼容约定  
- [core-api-example-responses.md](../doc/spec/core-api-example-responses.md) — 响应形态示例  
- [checklist.md](../doc/spec/checklist.md) — 联调检查项  
- [spec.md](../doc/spec/spec.md) — 规划与原则  

---

## 10. 目录入口（便于搜代码）

| 路径 | 说明 |
|------|------|
| `main.py` | FastAPI 应用、中间件、缓存、CORS、路由挂载 |
| `app/routers/analytics.py` | 分析 API |
| `app/routers/setup.py` | 首次设置向导 API |
| `app/services/` | 业务与 SQL 聚合逻辑 |
| `app/database.py` | SQLAlchemy Engine、Session、`.env` 加载 |
| `app/contracts.py` | 契约版本常量 |
| `scripts/init_db.py` | 手动初始化辅助 |
| `scripts/rebuild_layered_summaries.py` | 汇总重建辅助 |

运行日志（含向导）常见位置：仓库根目录 `logs/setup.log`（若已生成）。

---

*数据来源于芝加哥市公开犯罪记录；本说明随代码演进，如有出入以实际代码为准。*

# 芝加哥犯罪可视化 — 用户指南（首次部署）

## 前置条件

- 已安装 **MySQL 8.x**，服务已启动，并可通过 `mysql` 命令行连接（可选，但便于手动排错）。
- 已安装 **Python 3.10+** 与本项目后端依赖（`backend/requirements.txt`）。
- 全量数据文件：`data/Crimes_-_2001_to_Present.csv`（约 1.7GB，需自行放置；目录默认被 Git 忽略）。

## 首次启动向导（推荐）

1. 配置并启动后端（见各环境说明），再启动 Electron 前端 `npm run dev`。
2. 应用启动时会请求 `http://127.0.0.1:8000/api/setup/status`：
   - 若数据库已就绪（主表有数据且汇总表齐全），将**自动跳过**向导。
   - 否则进入**首次设置向导**。
3. 按步骤完成：
   - **环境检查**：检测本机是否安装 `mysql` 客户端、默认端口是否可连接。
   - **数据库**：填写主机、端口、用户、密码、库名；测试连接；必要时创建库；**保存配置**（写入项目根目录 `.env`）并**初始化表结构**。
   - **选择 CSV**：通过系统文件框选择 `Crimes_-_2001_to_Present.csv`。
   - **导入数据**：使用 `LOAD DATA LOCAL INFILE`（经 PyMySQL），大文件导入可能需 15–40 分钟；进度通过轮询行数估算。
   - **构建汇总与索引**：自动执行生成列、分析索引、`rebuild_layered_summaries.sql` 与热点图相关索引。
4. 完成后点击**进入应用**。向导日志可导出为文本；失败时可打开**手动操作指南**并按文档使用 `mysql` 客户端与脚本。

## 手动导入（备用）

当自动导入因权限、`local_infile`、路径等问题失败时：

1. 在项目根目录配置 `.env`（参考 `.env.example`，**勿使用**默认的 `root`/`123456`/`chicago_crime` 组合，后端会拒绝）。
2. 执行：`python backend/scripts/init_db.py`
3. 使用 MySQL 客户端（`--local-infile=1`）在项目根目录执行 `SOURCE backend/sql/import_kaggle_crimes.sql`；若 CSV 不在默认相对路径，请先修改 SQL 中的 `LOAD DATA` 路径为**绝对路径**。
4. 执行：`python backend/scripts/rebuild_layered_summaries.py`

详细说明见应用内 **手动操作指南** 与 `logs/setup.log`。

## 常见问题

| 现象 | 处理 |
|------|------|
| 向导无法连接后端 | 确认已启动 FastAPI（默认 `8000`），且浏览器/Electron CSP 允许连接该地址。 |
| `LOCAL INFILE` 被拒绝 | 服务端 `local_infile`、用户权限、客户端 `local_infile` 均需开启；见 MySQL 文档。 |
| 保存配置提示不安全凭据 | 勿使用被禁止的默认账号/库名；更换为自建用户与库名。 |
| 导入极慢 | 使用 SSD、调大 `innodb_buffer_pool_size`，并避免在导入时运行大量其他查询。 |

## 环境变量（后端）

与 `.env.example` 一致，关键项：

- `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE`
- `CORS_ALLOWED_ORIGINS`（开发时包含 `http://localhost:5173` 等）

可选：`VITE_BACKEND_ORIGIN`（前端构建/开发时覆盖默认 `http://127.0.0.1:8000`）。

更完整的后端说明（仅启动 API、`.env` 位置、全量测试、`sql/` 与 `doc/spec/` 索引）见 **[backend/README.md](../backend/README.md)**。

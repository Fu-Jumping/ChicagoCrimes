# Chicago Crime Visualization — 项目总览

> 快速了解项目结构、技术栈、接口与开发约定，便于 AI 对话快速定位上下文。

## 项目简介

芝加哥犯罪数据可视化桌面应用。后端提供 FastAPI 分析接口，前端为 Electron + React + D3 桌面程序，展示年度趋势、犯罪类型、区域对比等多维度分析图表。

---

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 后端 | Python + FastAPI | 3.x |
| ORM | SQLAlchemy | — |
| 数据库 | SQLite | — |
| 桌面框架 | Electron | 39 |
| 构建工具 | electron-vite | 5 |
| UI | React + TypeScript | 19 + 5.9 |
| 组件库 | Ant Design | 6 |
| 图表 | D3 | v7 |
| 路由 | React Router DOM | 7 |
| HTTP 客户端 | Axios | — |

---

## 目录结构

```
实践/
├── backend/                        # FastAPI 后端
│   ├── main.py                     # 应用入口，中间件、异常处理、缓存
│   ├── requirements.txt
│   ├── app/
│   │   ├── contracts.py            # 版本常量、参数约束、校验工具
│   │   ├── cache.py                # TTL 内存缓存 + ETag
│   │   ├── database.py             # SQLAlchemy Session
│   │   ├── routers/analytics.py    # 所有分析 API 路由
│   │   ├── services/analytics.py   # 数据库查询业务逻辑
│   │   ├── models/crime.py         # ORM 模型
│   │   └── schemas/crime.py        # Pydantic 响应 Schema
│   └── tests/                      # 分阶段测试
├── frontend/                       # Electron + React 前端
│   ├── package.json
│   ├── electron.vite.config.ts
│   └── src/
│       ├── main/index.ts           # Electron 主进程
│       ├── preload/index.ts        # 预加载脚本
│       └── renderer/src/
│           ├── App.tsx             # 路由根（HashRouter）
│           ├── api/index.ts        # analyticsApi + 拦截器 + 重试
│           ├── views/              # 页面视图（4个）
│           ├── components/         # 公共组件 + 图表组件
│           ├── contexts/           # GlobalFiltersContext（全局年份筛选）
│           ├── hooks/              # useGlobalFilters, useChartContainerSize
│           └── utils/              # chartData.ts, chartEventProtocol.ts
├── doc/
│   └── spec/spec.md                # 主技术规范文档
├── skills/                         # 通用 AI 工作流 skills（全局复用）
├── .cursor/skills/                 # 本项目专属 Cursor Agent Skills
│   ├── chicago-crime-backend/      # 后端架构、接口、缓存说明
│   ├── chicago-crime-frontend/     # 前端架构、组件、图表说明
│   ├── api-contract/               # 数据契约、响应格式、错误码
│   └── dev-workflow/               # 启动、测试、构建、质量门控
└── PROJECT_OVERVIEW.md             # 本文件
```

---

## 前端路由

| 路径 | 页面视图 | 说明 |
|------|---------|------|
| `/` | `Dashboard.tsx` | 综合仪表盘 |
| `/trend` | `TrendAnalysis.tsx` | 年/月/周/小时趋势分析 |
| `/type` | `TypeAnalysis.tsx` | 犯罪类型占比与逮捕率 |
| `/district` | `DistrictAnalysis.tsx` | 区域案件对比 |

---

## 后端 API 接口速览

基础路径：`http://localhost:8000/api/v1/analytics`

| 接口路径 | 说明 | 维度 | 关键参数 |
|---------|------|------|----------|
| `GET /trend/yearly` | 年度趋势 | year | start_year, end_year, primary_type, sort |
| `GET /trend/monthly` | 月度趋势 | month | year |
| `GET /trend/weekly` | 星期分布 | day_of_week | year, start_date, end_date |
| `GET /trend/hourly` | 小时分布 | hour | year, start_date, end_date |
| `GET /types/proportion` | 犯罪类型占比 | primary_type | year, limit, sort |
| `GET /types/arrest_rate` | 类型逮捕率 | primary_type | year, limit, sort |
| `GET /districts/comparison` | 区域对比 | district | year, limit, sort |
| `GET /arrests/rate` | 逮捕情况 | arrest | year, start_date, end_date |
| `GET /domestic/proportion` | 家暴比例 | domestic | year, start_date, end_date |
| `GET /location/types` | 地点类型 Top-N | location_description | year, limit, sort |

其他端点：
- `GET /` — 欢迎信息
- `GET /healthz` — 健康检查（含数据库状态和缓存统计）

---

## 统一响应格式（摘要）

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": [...],
  "meta": {
    "filters": {},
    "dimension": ["year"],
    "metrics": ["count"],
    "state_contract": { "empty": {}, "loading": {}, "error": {} },
    "data_quality": { "status": "pass", "alerts": [] },
    "contract_version": "2026.03.0",
    "api_version": "v1"
  },
  "request_id": "uuid"
}
```

详细契约见 `.cursor/skills/api-contract/SKILL.md`。

---

## 常用开发命令

```bash
# 启动全栈（根目录）
python start.py

# 单独启动后端
cd backend && python main.py

# 单独启动前端
cd frontend && npm run dev

# 前端类型检查
cd frontend && npm run typecheck

# 前端回归检查（typecheck + 性能基准）
cd frontend && npm run gate:regression

# 后端测试
cd backend && pytest tests/ -v
```

---

## Cursor Agent Skills（本项目）

| Skill | 路径 | 覆盖范围 |
|-------|------|----------|
| `chicago-crime-backend` | `.cursor/skills/chicago-crime-backend/` | 后端架构、所有接口、缓存、错误处理 |
| `chicago-crime-frontend` | `.cursor/skills/chicago-crime-frontend/` | 前端结构、组件、图表、API 调用 |
| `api-contract` | `.cursor/skills/api-contract/` | 响应格式、字段定义、错误码、ETag |
| `dev-workflow` | `.cursor/skills/dev-workflow/` | 启动、测试、构建、质量门控 |

---

## 关键设计约定

- **契约优先**：后端先稳定接口字段，前端基于 `meta` 驱动渲染逻辑
- **全局筛选**：年份等筛选通过 `GlobalFiltersContext` 跨页面共享
- **缓存协商**：GET 分析接口自动缓存，支持 ETag / 304 Not Modified
- **数据态统一**：`DataStatePanel` 基于 `meta.state_contract` 处理 loading / empty / error
- **请求追踪**：每次请求有唯一 `request_id`，前端 `RequestDebugPanel` 可查看历史

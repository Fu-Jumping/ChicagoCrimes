# Chicago Crime Visualization App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个基于 Electron + React + D3.js 的桌面端应用，结合 Python FastAPI 后端，实现对 MySQL 中芝加哥犯罪数据集（Chicago Crime Dataset）的不少于 10 个维度的分析与交互式可视化。

**Architecture:**
- **前端 (Desktop):** 使用 `electron-vite` 脚手架搭建 Electron + React + TypeScript + Vite 项目。UI 框架使用 Ant Design，图表渲染使用 D3.js。通过 Axios 与本地 Python 后端通信。
- **后端 (API):** 使用 Python + FastAPI + Uvicorn 提供 RESTful API，通过 SQLAlchemy + PyMySQL 连接 MySQL 数据库，执行 10 种不同的聚合分析 SQL 查询。
- **数据库:** MySQL 关系型数据库，存储芝加哥犯罪数据集。

**Tech Stack:** Electron, React, TypeScript, Vite, Ant Design, D3.js, Python, FastAPI, SQLAlchemy, PyMySQL.

---

### Task 1: 初始化 Python 后端与数据库模型

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/main.py`
- Create: `backend/database.py`
- Create: `backend/models.py`

**Step 1: 安装后端依赖**
```bash
mkdir backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy pymysql
pip freeze > requirements.txt
```

**Step 2: 编写数据库连接 (`database.py`) 与数据模型 (`models.py`)**
实现连接本地 MySQL 数据库的逻辑，并定义 `Crime` 模型（包含 ID, Case Number, Date, Block, IUCR, Primary Type, Description, Location Description, Arrest, Domestic, Beat, District, Ward, Community Area, FBI Code, X Coordinate, Y Coordinate, Year, Updated On, Latitude, Longitude, Location 等字段）。

**Step 3: 编写 FastAPI 入口 (`main.py`)**
设置基础的 FastAPI 应用，配置 CORS 允许前端跨域请求。

### Task 2: 实现后端 10 个数据分析 API

**Files:**
- Create: `backend/routers/analytics.py`
- Modify: `backend/main.py`

**Step 1: 编写 10 个分析维度的 SQL 查询及 API 路由**
在 `analytics.py` 中实现以下 10 个接口：
1. `GET /api/trend/yearly`: 犯罪数量的年度变化趋势（折线图数据）
2. `GET /api/trend/weekly`: 犯罪在一周七天的分布情况（柱状图数据）
3. `GET /api/trend/hourly`: 犯罪在一天 24 小时内的时间分布（柱状图/热力图数据）
4. `GET /api/types/proportion`: 犯罪类型的占比分析（饼图数据）
5. `GET /api/districts/comparison`: 不同区域（District/Ward）的犯罪情况对比（柱状图数据）
6. `GET /api/arrests/rate`: 逮捕率（Arrest 为 true/false）的整体占比（环形图数据）
7. `GET /api/domestic/proportion`: 家庭暴力（Domestic 为 true/false）与非家庭暴力占比（饼图数据）
8. `GET /api/location/types`: 发生地点类型（Location Description）的 Top 10 排行（条形图数据）
9. `GET /api/trend/monthly`: 特定年份各月份的犯罪趋势（折线图数据）
10. `GET /api/types/arrest_rate`: 各主要犯罪类型（Primary Type）下的逮捕率对比（堆叠柱状图数据）

**Step 2: 挂载路由并启动测试**
在 `main.py` 中 `app.include_router(analytics.router)`。

### Task 3: 初始化 Electron + React 前端

**Files:**
- Create: `frontend/` (via electron-vite)

**Step 1: 使用 electron-vite 创建项目**
```bash
npm create @quick-start/electron frontend -- --template react-ts
cd frontend
npm install
npm install antd @ant-design/icons d3 axios
npm install -D @types/d3
```

**Step 2: 清理默认样式与组件**
移除 `frontend/src/renderer/src/App.css` 等默认样式，准备集成 Ant Design 布局。

### Task 4: 前端布局与 Ant Design 集成

**Files:**
- Modify: `frontend/src/renderer/src/App.tsx`
- Create: `frontend/src/renderer/src/components/Layout.tsx`

**Step 1: 构建仪表盘布局**
使用 Ant Design 的 `Layout` (Sider, Header, Content) 创建左侧导航菜单（对应不同的分析视图）和右侧内容展示区。

### Task 5: 使用 D3.js 开发 10 个可视化图表组件

**Files:**
- Create: `frontend/src/renderer/src/components/charts/LineChart.tsx`
- Create: `frontend/src/renderer/src/components/charts/BarChart.tsx`
- Create: `frontend/src/renderer/src/components/charts/PieChart.tsx`
- Create: `frontend/src/renderer/src/views/Dashboard.tsx`

**Step 1: 编写基础图表组件**
封装基于 D3.js 和 React useRef 的基础图表组件：
- `LineChart`: 接收时间序列数据，支持 x/y 轴绘制与缩放。
- `BarChart`: 接收分类统计数据，支持提示框（Tooltip）。
- `PieChart`: 接收占比数据，支持交互式动画。

**Step 2: 将后端 API 与图表视图连接**
在 `Dashboard` 或各个独立视图组件中，使用 `axios` 请求后端 API，获取数据后传入相应的 D3 图表组件进行渲染。

### Task 6: 集成测试与打包

**Files:**
- Modify: `frontend/package.json`
- Create: `scripts/start.js` (Optional: 联合启动脚本)

**Step 1: 联调测试**
启动后端 FastAPI (`uvicorn main:app --reload`) 和前端 (`npm run dev`)，验证 Electron 桌面端内图表是否正常加载并展示交互效果。

**Step 2: 打包构建**
执行 `npm run build` 和 `npm run build:win` 生成最终的 Windows `.exe` 桌面软件。

---
name: chicago-crime-frontend
description: Electron + React + TypeScript + D3 frontend for Chicago Crime Visualization. Use when working on frontend components, views, charts, routing, global filters, API calls, styling, or build/typecheck in this project.
---

# Chicago Crime Frontend

## Stack

- **Electron 39** + **electron-vite 5** — 桌面应用框架
- **React 19** + **TypeScript 5.9** — UI 框架
- **Ant Design 6** (`antd`) — 组件库
- **D3 v7** — 数据可视化图表
- **React Router DOM v7** — 客户端路由（HashRouter）
- **Axios** — HTTP 客户端，含拦截器与重试

## 目录结构

```
frontend/
├── src/
│   ├── main/index.ts              # Electron 主进程
│   ├── preload/index.ts           # 预加载脚本
│   └── renderer/src/
│       ├── App.tsx                # 路由入口
│       ├── api/index.ts           # API 客户端（analyticsApi）
│       ├── views/                 # 页面视图
│       │   ├── Dashboard.tsx      # 仪表盘 /
│       │   ├── TrendAnalysis.tsx  # 趋势分析 /trend
│       │   ├── TypeAnalysis.tsx   # 犯罪类型 /type
│       │   └── DistrictAnalysis.tsx # 区域分析 /district
│       ├── components/
│       │   ├── AppLayout.tsx      # 主布局
│       │   ├── TitleBar.tsx       # 自定义标题栏
│       │   ├── AnalysisPageShell.tsx
│       │   ├── DataStatePanel.tsx # 加载/空/错误态
│       │   ├── YearFilterSelect.tsx
│       │   ├── RequestDebugPanel.tsx
│       │   └── charts/
│       │       ├── LineChart.tsx
│       │       ├── BarChart.tsx
│       │       └── PieChart.tsx
│       ├── contexts/
│       │   ├── GlobalFiltersContext.tsx  # 全局筛选 Context
│       │   └── globalFiltersState.ts
│       ├── hooks/
│       │   ├── useGlobalFilters.ts
│       │   ├── useChartContainerSize.ts
│       │   └── useRequestHistory.ts
│       ├── utils/
│       │   ├── chartData.ts           # 数据映射工具
│       │   └── chartEventProtocol.ts  # 图表事件协议
│       └── types/
│           └── chartEvents.ts
├── scripts/
│   ├── perf-benchmark.mjs     # 本地性能基准
│   └── perf-benchmark-ci.mjs  # CI 性能基准（更严格）
└── package.json
```

## 路由结构

| 路径 | 视图 | 说明 |
|------|------|------|
| `/` | Dashboard | 综合仪表盘 |
| `/trend` | TrendAnalysis | 时间趋势分析 |
| `/type` | TypeAnalysis | 犯罪类型分析 |
| `/district` | DistrictAnalysis | 区域对比分析 |

## API 客户端用法

```typescript
import { analyticsApi } from '@/api'

// 调用示例
const res = await analyticsApi.getYearlyTrend({ start_year: 2015, end_year: 2023 })
// res.data: 数据数组
// res.meta: 元信息（筛选条件、维度、指标、数据质量）
// res.request_id: 请求追踪ID
```

所有接口均含自动重试（服务端5xx或网络错误时重试1次）。

## 全局筛选

```typescript
import { useGlobalFilters } from '@/hooks/useGlobalFilters'

const { year, setYear } = useGlobalFilters()
```

`GlobalFiltersContext` 包裹整个应用，所有视图通过 hook 共享年份等筛选条件。

## 图表组件约定

- 使用 `useChartContainerSize` hook 获取容器尺寸，实现响应式
- D3 在 `useEffect` 中操作 SVG ref，通过 `chartData.ts` 工具函数做数据映射
- 图表事件通过 `chartEventProtocol.ts` 标准化

## 常用命令

```bash
cd frontend
npm install
npm run dev           # 开发模式
npm run typecheck     # 类型检查
npm run typecheck:strict  # 严格模式（含 lint）
npm run gate:regression   # 回归检查（typecheck + 性能基准）
npm run gate:release      # 发布检查（严格模式）
npm run build:win     # 打包 Windows
```

## 数据态处理

`DataStatePanel` 组件统一处理三种状态：
- **loading**: 骨架屏
- **empty**: 空数据提示
- **error**: 错误信息 + 重试

基于后端 `meta.state_contract` 驱动展示逻辑。

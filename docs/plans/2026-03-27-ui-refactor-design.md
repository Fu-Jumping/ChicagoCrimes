# 全局控制台与界面重构 (Global Control Center & UI Refactor) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 消除界面中无意义的假数据和冗余组件，将左侧边栏升级为真实的“全局控制台”（包含所有筛选器），并使底部状态栏显示真实的系统运行指标。

**Architecture:** 
1. **侧边栏重构**：在 `AppLayout.tsx` 的侧边栏中引入 `YearFilterSelect` 和新创建的 `TypeFilterSelect`，替代原本只读的 Tag。
2. **页面净化**：移除 `TrendAnalysis`、`TypeAnalysis`、`DistrictAnalysis`、`MapView` 中 `AnalysisPageShell` 传入的 `filter` 属性。
3. **状态栏数据化**：在 `AppLayout.tsx` 中引入 `useRequestHistory`，计算并展示真实的 API 延迟和缓存命中率，替换写死的经纬度。
4. **全局操作**：在顶部导航右侧增加“导出/打印”按钮。

**Tech Stack:** React, Ant Design, CSS Modules/Variables

---

### Task 1: 前端 - 创建犯罪类型选择器组件

**Files:**
- Create: `frontend/src/renderer/src/components/TypeFilterSelect.tsx`

**Step 1: Write minimal implementation**

```tsx
// frontend/src/renderer/src/components/TypeFilterSelect.tsx
import React, { useEffect, useState } from 'react'
import { Select } from 'antd'
import { analyticsApi } from '../api'
import { t } from '../i18n'

interface TypeFilterSelectProps {
  value: string | null
  onChange: (value: string | null) => void
}

const TypeFilterSelect: React.FC<TypeFilterSelectProps> = ({ value, onChange }) => {
  const [types, setTypes] = useState<{ label: string; value: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchTypes = async () => {
      setLoading(true)
      try {
        // Fetch top 20 types for the dropdown
        const res = await analyticsApi.getTypesProportion({ limit: 20 })
        const options = res.data.map((item: any) => ({
          label: item.primary_type,
          value: item.primary_type
        }))
        setTypes(options)
      } catch (e) {
        console.error('Failed to fetch types', e)
      } finally {
        setLoading(false)
      }
    }
    fetchTypes()
  }, [])

  return (
    <Select
      allowClear
      showSearch
      loading={loading}
      placeholder="选择犯罪类型"
      value={value}
      onChange={(val) => onChange(val || null)}
      options={types}
      style={{ width: '100%' }}
      className="glow-select"
      dropdownStyle={{ fontFamily: 'var(--font-family-mono)' }}
    />
  )
}

export default TypeFilterSelect
```

**Step 2: Commit**

```bash
git add frontend/src/renderer/src/components/TypeFilterSelect.tsx
git commit -m "feat(frontend): create TypeFilterSelect component"
```

---

### Task 2: 前端 - 重构左侧边栏为全局控制台

**Files:**
- Modify: `frontend/src/renderer/src/components/AppLayout.tsx`

**Step 1: Write implementation**

Modify `AppLayout.tsx` to include `YearFilterSelect` and `TypeFilterSelect` in the sidebar, replacing the static tags. Also add the real metrics to the status bar.

```tsx
// frontend/src/renderer/src/components/AppLayout.tsx
// Add imports:
import YearFilterSelect from './YearFilterSelect'
import TypeFilterSelect from './TypeFilterSelect'
import { useRequestHistory } from '../hooks/useRequestHistory'
import { PrinterOutlined } from '@ant-design/icons'

// Inside AppLayout component, before return:
  const { summary } = useRequestHistory([]) // Get global request summary
  const hitRate = summary.total > 0 ? Math.round((summary.cacheHit / summary.total) * 100) : 0

// Modify the header-right section to add Print button:
          <div className="header-right">
            <button
              className="icon-btn"
              onClick={() => window.print()}
              aria-label="导出报告"
              title="导出报告"
            >
              <PrinterOutlined />
            </button>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
              title={theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
            >
              <BulbOutlined />
            </button>
          </div>

// Modify the sidebar-filter-section:
            {/* Active Filters / Controls */}
            <div className="sidebar-filter-section">
              <div className="sidebar-section-label">全局分析参数</div>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>分析年份</div>
                  <YearFilterSelect value={filters.year} onChange={setYear} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>犯罪类型</div>
                  <TypeFilterSelect value={filters.primaryType} onChange={setPrimaryType} />
                </div>
                {hasActiveFilters && (
                  <Button
                    size="small"
                    className="sidebar-clear-btn"
                    onClick={clearFilters}
                    style={{ width: '100%' }}
                  >
                    {t('nav.clearFilters')}
                  </Button>
                )}
              </Space>
            </div>

// Modify the urban-statusbar:
            {/* Bottom Status Bar */}
            <div className="urban-statusbar">
              <div className="statusbar-coords">
                <span className="statusbar-coord-item">API 延迟: {summary.avgDurationMs.toFixed(0)}ms</span>
                <span className="statusbar-coord-item">缓存命中率: {hitRate}%</span>
                <span className="statusbar-coord-item">总请求数: {summary.total}</span>
              </div>
              <div className="statusbar-channel">
                <div className="statusbar-dot" style={{ background: summary.failed > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-green)', boxShadow: `0 0 8px ${summary.failed > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-green)'}` }} />
                <span className="statusbar-channel-text">
                  {summary.failed > 0 ? '系统存在异常' : '系统运行正常'}
                </span>
              </div>
            </div>
```

**Step 2: Commit**

```bash
git add frontend/src/renderer/src/components/AppLayout.tsx
git commit -m "refactor(frontend): upgrade sidebar to global control center and add real metrics"
```

---

### Task 3: 前端 - 清理各页面冗余的筛选器

**Files:**
- Modify: `frontend/src/renderer/src/views/TrendAnalysis.tsx`
- Modify: `frontend/src/renderer/src/views/TypeAnalysis.tsx`
- Modify: `frontend/src/renderer/src/views/DistrictAnalysis.tsx`
- Modify: `frontend/src/renderer/src/views/MapView.tsx`

**Step 1: Write implementation**

For each of the 4 files above:
1. Remove `import YearFilterSelect from '../components/YearFilterSelect'`
2. Remove the `filter={<YearFilterSelect value={filters.year} onChange={setYear} />}` prop from the `<AnalysisPageShell>` component.

*Example for TrendAnalysis.tsx:*
```tsx
// Remove: import YearFilterSelect from '../components/YearFilterSelect'
// ...
  return (
    <AnalysisPageShell
      variant="trend"
      systemTag="数据维度：时间序列 // 分析：月度 · 周 · 小时"
      title="趋势分析"
      subtitle="分析芝加哥大都会区的时序规律与犯罪密度模式，交叉比对月度波动、周内分布与小时高峰。"
      // REMOVE: filter={<YearFilterSelect value={filters.year} onChange={setYear} />}
      debugTitle={t('debug.title')}
      debugPathPrefixes={[
```

**Step 2: Commit**

```bash
git add frontend/src/renderer/src/views/TrendAnalysis.tsx frontend/src/renderer/src/views/TypeAnalysis.tsx frontend/src/renderer/src/views/DistrictAnalysis.tsx frontend/src/renderer/src/views/MapView.tsx
git commit -m "refactor(frontend): remove redundant filters from page shells"
```

---

### Task 4: 前端 - 样式微调与测试修复

**Files:**
- Modify: `frontend/src/renderer/src/assets/main.css`
- Modify: `frontend/src/renderer/src/components/AppLayout.test.tsx`

**Step 1: Add print styles**

```css
/* frontend/src/renderer/src/assets/main.css (append) */

/* Print Styles */
@media print {
  .urban-sidebar,
  .urban-oracle-header,
  .urban-statusbar,
  .analysis-shell__debug {
    display: none !important;
  }
  .urban-oracle-main {
    padding: 0 !important;
    background: white !important;
  }
  .urban-oracle-content {
    padding: 0 !important;
  }
  .ant-card {
    break-inside: avoid;
    border: 1px solid #ddd !important;
  }
  * {
    color: black !important;
    text-shadow: none !important;
    box-shadow: none !important;
  }
}
```

**Step 2: Update tests**

Run `npm run test:ui` and `npm run test:visual`. If `AppLayout.test.tsx` fails because of the new `useRequestHistory` hook or `TypeFilterSelect` API call, mock them or wrap them in appropriate providers.
For visual regression, run `npx vitest run src/renderer/src/tests/visual-regression.test.tsx -u` to update the snapshot since the sidebar and status bar changed.

**Step 3: Commit**

```bash
git add frontend/src/renderer/src/assets/main.css
git commit -m "style(frontend): add print styles and update snapshots"
```

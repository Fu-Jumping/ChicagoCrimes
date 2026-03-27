import React, { useEffect, useMemo, useState } from 'react'
import { Button, Select } from 'antd'
import {
  AppstoreOutlined,
  BarChartOutlined,
  BulbFilled,
  BulbOutlined,
  GlobalOutlined,
  LineChartOutlined,
  LinkOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PieChartOutlined,
  PrinterOutlined
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { analyticsApi } from '../api'
import routeBackgrounds from '../assets/backgrounds'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { useThemeMode } from '../hooks/useThemeMode'
import { useRequestHistory } from '../hooks/useRequestHistory'
import { useAppWarmup } from '../hooks/useAppWarmup'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { t } from '../i18n'
import { buildAnalyticsFilterParams } from '../utils/filterParams'
import { getRoutePresentation } from '../utils/routePresentation'
import {
  DOMESTIC_FILTER_OPTIONS,
  MONTH_FILTER_OPTIONS,
  SIDEBAR_FILTER_GROUPS,
  SIDEBAR_FILTER_LABELS,
  type SidebarFilterFieldKey,
  formatBeatOptionLabel,
  formatCommunityAreaOptionLabel,
  formatWardOptionLabel
} from '../utils/sidebarFilters'
import TitleBar from './TitleBar'
import YearFilterSelect from './YearFilterSelect'
import TypeFilterSelect from './TypeFilterSelect'
import DateRangeFilter from './DateRangeFilter'
import DistrictFilterSelect from './DistrictFilterSelect'
import ArrestFilterSelect from './ArrestFilterSelect'

interface AppLayoutProps {
  children: React.ReactNode
}

interface SidebarFilterOptions {
  loading: boolean
  beats: string[]
  wards: number[]
  communityAreas: number[]
}

const topNavItems = [
  { label: t('nav.overview'), path: '/' },
  { label: t('nav.trend'), path: '/trend' },
  { label: t('nav.type'), path: '/type' },
  { label: t('nav.district'), path: '/district' },
  { label: t('nav.map'), path: '/map' }
]

const pageIconMap = {
  overview: <AppstoreOutlined />,
  trend: <LineChartOutlined />,
  type: <PieChartOutlined />,
  district: <BarChartOutlined />,
  map: <GlobalOutlined />
} as const

const warmupLabelMap: Record<string, string> = {
  overview: '预加载总览与筛选器',
  trend: '预加载趋势图表与对比数据',
  type: '预加载类型与逮捕分析',
  district: '预加载区域与地点结构',
  map: '预加载空间热力与分区数据',
  done: '预加载完成'
}

const createNumericOptions = (values: number[], formatter: (value: number) => string) => [
  { label: '全部', value: '__all__' },
  ...values.map((value) => ({
    label: formatter(value),
    value
  }))
]

const createStringOptions = (values: string[], formatter: (value: string) => string) => [
  { label: '全部', value: '__all__' },
  ...values.map((value) => ({
    label: formatter(value),
    value
  }))
]

const sidebarFieldLayout: Record<SidebarFilterFieldKey, 'full' | 'half'> = {
  year: 'half',
  month: 'half',
  dateRange: 'full',
  type: 'full',
  arrest: 'half',
  domestic: 'half',
  district: 'half',
  beat: 'half',
  ward: 'half',
  communityArea: 'half'
}

const sidebarFieldTestIds: Partial<Record<SidebarFilterFieldKey, string>> = {
  month: 'global-month-filter',
  beat: 'global-beat-filter',
  ward: 'global-ward-filter',
  communityArea: 'global-community-area-filter',
  domestic: 'global-domestic-filter'
}

const summarizeValue = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '未设置' : String(value)

export const dimensionLabelMap: Record<string, string> = {
  year: '年份',
  month: '月份',
  primary_type: '案件类型',
  district: '分区',
  beat: '警区',
  ward: '选区',
  community_area: '社区',
  domestic: '是否家暴'
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    filters,
    clearFilters,
    setYear,
    setMonth,
    setPrimaryType,
    setDateRange,
    setDistrict,
    setBeat,
    setWard,
    setCommunityArea,
    setArrest,
    setDomestic,
    hasActiveFilters
  } = useGlobalFilters()
  const { theme, toggleTheme } = useThemeMode()
  const { summary } = useRequestHistory()
  const { isWarmupActive, progress, progressPercent } = useAppWarmup()

  const presentation = getRoutePresentation(location.pathname)
  const currentPageIcon = pageIconMap[presentation.key]
  const hitRate = summary.total > 0 ? Math.round((summary.cacheHit / summary.total) * 100) : 0
  const warmupLabel = warmupLabelMap[progress.key] ?? progress.label
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filterOptions, setFilterOptions] = useState<SidebarFilterOptions>({
    loading: false,
    beats: [],
    wards: [],
    communityAreas: []
  })

  const sidebarFilterParams = useMemo(
    () => buildAnalyticsFilterParams(filters),
    [
      filters.year,
      filters.month,
      filters.primaryType,
      filters.startDate,
      filters.endDate,
      filters.district,
      filters.beat,
      filters.ward,
      filters.communityArea,
      filters.arrest,
      filters.domestic
    ]
  )
  const debouncedSidebarFilterParams = useDebouncedValue(sidebarFilterParams, 160)

  useEffect(() => {
    let cancelled = false

    const loadFilterOptions = async (): Promise<void> => {
      setFilterOptions((previous) => ({ ...previous, loading: true }))
      try {
        const response = await analyticsApi.getFilterOptions(debouncedSidebarFilterParams)
        if (cancelled) {
          return
        }

        setFilterOptions({
          loading: false,
          beats: response.data.beats ?? [],
          wards: response.data.wards ?? [],
          communityAreas: response.data.community_areas ?? []
        })
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load extended filter options', error)
          setFilterOptions((previous) => ({ ...previous, loading: false }))
        }
      }
    }

    void loadFilterOptions()

    return () => {
      cancelled = true
    }
  }, [debouncedSidebarFilterParams])

  const beatSelectOptions = useMemo(
    () => createStringOptions(filterOptions.beats, formatBeatOptionLabel),
    [filterOptions.beats]
  )
  const wardSelectOptions = useMemo(
    () => createNumericOptions(filterOptions.wards, formatWardOptionLabel),
    [filterOptions.wards]
  )
  const communityAreaSelectOptions = useMemo(
    () => createNumericOptions(filterOptions.communityAreas, formatCommunityAreaOptionLabel),
    [filterOptions.communityAreas]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.year !== null) count += 1
    if (filters.month !== null) count += 1
    if (filters.primaryType !== null) count += 1
    if (filters.startDate || filters.endDate) count += 1
    if (filters.district !== null) count += 1
    if (filters.beat !== null) count += 1
    if (filters.ward !== null) count += 1
    if (filters.communityArea !== null) count += 1
    if (filters.arrest !== null) count += 1
    if (filters.domestic !== null) count += 1
    return count
  }, [
    filters.year,
    filters.month,
    filters.primaryType,
    filters.startDate,
    filters.endDate,
    filters.district,
    filters.beat,
    filters.ward,
    filters.communityArea,
    filters.arrest,
    filters.domestic
  ])

  const timeSummary = useMemo(() => {
    const parts = [
      filters.year ? `${filters.year} 年` : null,
      filters.month ? `${filters.month} 月` : null,
      filters.startDate || filters.endDate
        ? `${filters.startDate ?? '起始未设'} - ${filters.endDate ?? '结束未设'}`
        : null
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' / ') : '未限制时间范围'
  }, [filters.endDate, filters.month, filters.startDate, filters.year])

  const eventSummary = useMemo(() => {
    const parts = [
      filters.primaryType ? String(filters.primaryType) : null,
      filters.arrest === null ? null : filters.arrest ? '已逮捕' : '未逮捕',
      filters.domestic === null ? null : filters.domestic ? '家暴案件' : '非家暴案件'
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' / ') : '未限定案件条件'
  }, [filters.arrest, filters.domestic, filters.primaryType])

  const spaceSummary = useMemo(() => {
    const parts = [
      filters.district ? `分区 ${filters.district}` : null,
      filters.beat ? `警区 ${filters.beat}` : null,
      filters.ward ? `选区 ${filters.ward}` : null,
      filters.communityArea ? `社区 ${filters.communityArea}` : null
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' / ') : '未限定空间范围'
  }, [filters.beat, filters.communityArea, filters.district, filters.ward])

  const backdropStyle = useMemo(
    () =>
      ({
        ['--route-bg-image' as string]: `url(${routeBackgrounds[presentation.backgroundKey]})`
      }) as React.CSSProperties,
    [presentation.backgroundKey]
  )

  const toggleSidebar = (): void => {
    setSidebarCollapsed((previous) => !previous)
  }

  const renderSidebarField = (field: SidebarFilterFieldKey): React.ReactNode => {
    const layoutClass =
      sidebarFieldLayout[field] === 'full'
        ? 'sidebar-filter-group sidebar-filter-group--full'
        : 'sidebar-filter-group sidebar-filter-group--half'
    const commonProps = sidebarFieldTestIds[field]
      ? { 'data-testid': sidebarFieldTestIds[field] }
      : undefined

    const label = SIDEBAR_FILTER_LABELS[field]

    const controlMap: Record<SidebarFilterFieldKey, React.ReactNode> = {
      year: <YearFilterSelect value={filters.year} onChange={setYear} />,
      month: (
        <Select<number | string>
          value={filters.month ?? '__all__'}
          options={MONTH_FILTER_OPTIONS}
          onChange={(value) => setMonth(value === '__all__' ? null : Number(value))}
          style={{ width: '100%' }}
          size="small"
          showSearch={false}
        />
      ),
      dateRange: (
        <DateRangeFilter
          startDate={filters.startDate}
          endDate={filters.endDate}
          onChange={setDateRange}
        />
      ),
      type: <TypeFilterSelect value={filters.primaryType} onChange={setPrimaryType} />,
      arrest: <ArrestFilterSelect value={filters.arrest} onChange={setArrest} />,
      domestic: (
        <Select<string>
          value={filters.domestic === null ? '__all__' : String(filters.domestic)}
          options={DOMESTIC_FILTER_OPTIONS}
          onChange={(value) => {
            if (value === '__all__') {
              setDomestic(null)
              return
            }
            setDomestic(value === 'true')
          }}
          style={{ width: '100%' }}
          size="small"
          showSearch={false}
        />
      ),
      district: <DistrictFilterSelect value={filters.district} onChange={setDistrict} />,
      beat: (
        <Select<string>
          value={filters.beat ?? '__all__'}
          options={beatSelectOptions}
          loading={filterOptions.loading}
          onChange={(value) => setBeat(value === '__all__' ? null : value)}
          style={{ width: '100%' }}
          size="small"
          showSearch={false}
        />
      ),
      ward: (
        <Select<number | string>
          value={filters.ward ?? '__all__'}
          options={wardSelectOptions}
          loading={filterOptions.loading}
          onChange={(value) => setWard(value === '__all__' ? null : Number(value))}
          style={{ width: '100%' }}
          size="small"
          showSearch={false}
        />
      ),
      communityArea: (
        <Select<number | string>
          value={filters.communityArea ?? '__all__'}
          options={communityAreaSelectOptions}
          loading={filterOptions.loading}
          onChange={(value) => setCommunityArea(value === '__all__' ? null : Number(value))}
          style={{ width: '100%' }}
          size="small"
          showSearch={false}
        />
      )
    }

    return (
      <div key={field} className={layoutClass} {...commonProps}>
        <div className="sidebar-filter-label">{label}</div>
        {controlMap[field]}
      </div>
    )
  }

  return (
    <div className="app-window-container">
      <TitleBar />
      <div className="app-route-backdrop" style={backdropStyle}>
        <div className="app-route-backdrop__image" />
        <div className="app-route-backdrop__overlay" />
        <div className="app-route-backdrop__texture" />

        <div className="urban-oracle-layout">
          <header className="urban-oracle-header">
            <div className="header-left">
              <div className="brand-panel">
                <div className="brand-panel__mark" aria-hidden="true">
                  <span className="brand-panel__mark-cell brand-panel__mark-cell--primary" />
                  <span className="brand-panel__mark-cell" />
                  <span className="brand-panel__mark-cell" />
                  <span className="brand-panel__mark-cell brand-panel__mark-cell--accent" />
                </div>
                <div className="brand-panel__copy">
                  <span className="brand-panel__eyebrow">CHICAGO CRIME VISUAL INTELLIGENCE</span>
                  <span className="brand-panel__title">{t('app.windowTitle')}</span>
                </div>
              </div>

              <div className="header-logo-divider" />

              <nav className="header-nav">
                {topNavItems.map((item) => (
                  <span
                    key={item.path}
                    className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={() => navigate({ pathname: item.path, search: location.search })}
                  >
                    {item.label}
                  </span>
                ))}
              </nav>
            </div>

            <div className="header-right">
              <button className="icon-btn" onClick={() => window.print()} aria-label="导出报告">
                <PrinterOutlined />
              </button>
              <button
                className="icon-btn"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
                title={theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
              >
                {theme === 'light' ? <BulbFilled /> : <BulbOutlined />}
              </button>
            </div>
          </header>

          <div className="urban-oracle-body">
            <aside className={`urban-sidebar ${sidebarCollapsed ? 'urban-sidebar--collapsed' : ''}`}>
              <div
                className={`urban-sidebar__toggle-row${
                  sidebarCollapsed ? ' urban-sidebar__toggle-row--collapsed' : ''
                }`}
              >
                <Button
                  size="small"
                  type="text"
                  data-testid="sidebar-collapse-toggle"
                  className="sidebar-toggle-btn"
                  icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  aria-label={sidebarCollapsed ? '展开左侧边栏' : '折叠左侧边栏'}
                  onClick={toggleSidebar}
                />
              </div>

              {sidebarCollapsed ? (
                <div className="urban-sidebar__collapsed-summary">
                  <div className="sidebar-collapsed-current">{currentPageIcon}</div>
                  <div className="sidebar-collapsed-title">{presentation.title}</div>
                  {activeFilterCount > 0 ? (
                    <div className="sidebar-collapsed-badge">{activeFilterCount}</div>
                  ) : null}
                </div>
              ) : (
                <div className="urban-sidebar__scroll">
                  <section className="sidebar-page-section sidebar-panel">
                    <div className="sidebar-page-heading">
                      <div className="sidebar-page-badge">{currentPageIcon}</div>
                      <div className="sidebar-page-copy">
                        <div className="sidebar-page-label">{t('sidebar.currentPage')}</div>
                        <div className="sidebar-page-title">{presentation.title}</div>
                        <div className="sidebar-page-eyebrow">{presentation.eyebrow}</div>
                      </div>
                    </div>
                    <p className="sidebar-page-desc">{presentation.description}</p>
                  </section>

                  {SIDEBAR_FILTER_GROUPS.map((group) => (
                    <section
                      key={group.key}
                      className="sidebar-filter-section sidebar-filter-section--group sidebar-panel"
                    >
                      <div className="sidebar-filter-section__header">
                        <div className="sidebar-section-label">{group.title}</div>
                        <p className="sidebar-section-desc">{group.description}</p>
                      </div>
                      <div className="sidebar-filter-grid">
                        {group.fields.map((field) => renderSidebarField(field))}
                      </div>
                    </section>
                  ))}

                  <section className="sidebar-filter-section sidebar-filter-section--summary sidebar-panel">
                    <div className="sidebar-section-label">{t('sidebar.filterSummary')}</div>
                    <div className="sidebar-summary-card">
                      <div className="sidebar-summary-metric">
                        <span className="sidebar-summary-metric__label">当前已启用筛选</span>
                        <span className="sidebar-summary-metric__value">{activeFilterCount}</span>
                      </div>

                      <div className="sidebar-summary-list">
                        <div className="sidebar-summary-item">
                          <span className="sidebar-summary-item__label">{t('sidebar.groupTime')}</span>
                          <span className="sidebar-summary-item__value">{timeSummary}</span>
                        </div>
                        <div className="sidebar-summary-item">
                          <span className="sidebar-summary-item__label">
                            {t('sidebar.groupEvent')}
                          </span>
                          <span className="sidebar-summary-item__value">{eventSummary}</span>
                        </div>
                        <div className="sidebar-summary-item">
                          <span className="sidebar-summary-item__label">
                            {t('sidebar.groupSpace')}
                          </span>
                          <span className="sidebar-summary-item__value">{spaceSummary}</span>
                        </div>
                      </div>
                    </div>

                    {hasActiveFilters ? (
                      <Button
                        size="small"
                        className="sidebar-clear-btn"
                        onClick={clearFilters}
                        style={{ width: '100%' }}
                      >
                        {t('nav.clearFilters')}
                      </Button>
                    ) : (
                      <p className="sidebar-summary-empty">当前使用全量数据观察基线态势。</p>
                    )}
                  </section>

                  <section className="sidebar-datasource-section sidebar-panel">
                    <div className="sidebar-section-label sidebar-section-label--with-action">
                      <span>{t('sidebar.dataSource')}</span>
                      <a
                        href="https://data.cityofchicago.org/Public-Safety/Crimes-2001-to-Present/ijzp-q8t2"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit' }}
                      >
                        <LinkOutlined />
                      </a>
                    </div>
                    <div className="sidebar-datasource-name">{t('sidebar.dataRange')}</div>
                    <div className="sidebar-datasource-years">{t('sidebar.dataYears')}</div>
                    <div className="sidebar-status-row">
                      <div className="statusbar-dot" />
                      <span className="sidebar-status-text">{t('sidebar.systemOnline')}</span>
                    </div>
                    <div className="sidebar-datasource-meta">
                      <span>当前主题：{theme === 'dark' ? '深色' : '浅色'}</span>
                      <span>当前年份：{summarizeValue(filters.year)}</span>
                    </div>
                  </section>
                </div>
              )}
            </aside>

            <main className="urban-oracle-main">
              <div className="urban-oracle-content">
                <div className="view-container">{children}</div>
              </div>

              <div className="urban-statusbar">
                <div className="statusbar-coords">
                  <span className="statusbar-coord-item">API 延迟: {summary.avgDurationMs.toFixed(0)}ms</span>
                  <span className="statusbar-coord-item">缓存命中率: {hitRate}%</span>
                  <span className="statusbar-coord-item">总请求数: {summary.total}</span>
                </div>
                <div className="statusbar-channel">
                  <div
                    className="statusbar-dot"
                    style={{
                      background:
                        summary.failed > 0
                          ? 'var(--color-accent-red)'
                          : 'var(--color-accent-green)',
                      boxShadow: `0 0 8px ${
                        summary.failed > 0
                          ? 'var(--color-accent-red)'
                          : 'var(--color-accent-green)'
                      }`
                    }}
                  />
                  <span className="statusbar-channel-text">
                    {summary.failed > 0 ? '系统存在异常' : '系统运行正常'}
                  </span>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {isWarmupActive ? (
        <div className="app-warmup-overlay" data-testid="app-warmup-overlay">
          <div className="app-warmup-card">
            <div className="app-warmup-eyebrow">PERFORMANCE WARMUP</div>
            <div className="app-warmup-title">正在准备分析工作台</div>
            <p className="app-warmup-desc">
              首次启动会预加载常用图表、筛选器和地图数据，后续切换页面和相同条件时会更流畅。
            </p>
            <div className="app-warmup-progress-meta">
              <span>{warmupLabel}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="app-warmup-progress-track">
              <div className="app-warmup-progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AppLayout

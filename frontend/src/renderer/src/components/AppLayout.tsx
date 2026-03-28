import React, { useEffect, useMemo, useState } from 'react'
import { Button, Select, Switch } from 'antd'
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
  FilterOutlined
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { analyticsApi } from '../api'
import routeBackgrounds from '../assets/backgrounds'
import appIcon from '../assets/icon.ico'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { useThemeMode } from '../hooks/useThemeMode'
import { useRequestHistory } from '../hooks/useRequestHistory'
import { useAppWarmup } from '../hooks/useAppWarmup'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { t } from '../i18n'
import { buildAnalyticsFilterParams, formatFilterValue } from '../utils/filterParams'
import { translateCrimeType } from '../utils/crimeTypeMap'
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

const summarizeValue = (
  value: string | number | string[] | number[] | null | undefined
): string => {
  if (value === null || value === undefined || value === '') return '未设置'
  if (Array.isArray(value)) return value.length === 0 ? '未设置' : value.join(', ')
  return String(value)
}

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
  const [multiSelectGroups, setMultiSelectGroups] = useState<Record<string, boolean>>({
    time: false,
    event: false,
    space: false
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
      filters.year ? `${formatFilterValue(filters.year)} 年` : null,
      filters.month ? `${formatFilterValue(filters.month)} 月` : null,
      filters.startDate || filters.endDate
        ? `${filters.startDate ?? '起始未设'} - ${filters.endDate ?? '结束未设'}`
        : null
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' / ') : '未限制时间范围'
  }, [filters.endDate, filters.month, filters.startDate, filters.year])

  const eventSummary = useMemo(() => {
    const formatArrest = (v: boolean | boolean[] | null): string | null => {
      if (v === null) return null
      if (Array.isArray(v)) {
        return v.map((b) => (b ? '已逮捕' : '未逮捕')).join(', ')
      }
      return v ? '已逮捕' : '未逮捕'
    }
    const formatDomestic = (v: boolean | boolean[] | null): string | null => {
      if (v === null) return null
      if (Array.isArray(v)) {
        return v.map((b) => (b ? '家暴案件' : '非家暴案件')).join(', ')
      }
      return v ? '家暴案件' : '非家暴案件'
    }
    const formatType = (v: string | string[] | null): string | null => {
      if (v === null) return null
      if (Array.isArray(v)) return v.length === 0 ? null : v.map(translateCrimeType).join(', ')
      return translateCrimeType(v)
    }
    const parts = [
      formatType(filters.primaryType),
      formatArrest(filters.arrest),
      formatDomestic(filters.domestic)
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' / ') : '未限定案件条件'
  }, [filters.arrest, filters.domestic, filters.primaryType])

  const spaceSummary = useMemo(() => {
    const parts = [
      filters.district ? `分区 ${formatFilterValue(filters.district)}` : null,
      filters.beat ? `警区 ${formatFilterValue(filters.beat)}` : null,
      filters.ward ? `选区 ${formatFilterValue(filters.ward)}` : null,
      filters.communityArea ? `社区 ${formatFilterValue(filters.communityArea)}` : null
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' / ') : '未限定空间范围'
  }, [filters.beat, filters.communityArea, filters.district, filters.ward])

  const backdropStyle = useMemo(
    () =>
      ({
        ['--route-backdrop-image' as string]: `url(${routeBackgrounds[presentation.backgroundKey]})`
      }) as React.CSSProperties,
    [presentation.backgroundKey]
  )

  const toggleSidebar = (): void => {
    setSidebarCollapsed((previous) => !previous)
  }

  const collapseGroupFilters = (fields: SidebarFilterFieldKey[]): void => {
    for (const field of fields) {
      switch (field) {
        case 'year':
          if (Array.isArray(filters.year)) setYear(filters.year[0] ?? null)
          break
        case 'month':
          if (Array.isArray(filters.month)) setMonth(filters.month[0] ?? null)
          break
        case 'type':
          if (Array.isArray(filters.primaryType)) setPrimaryType(filters.primaryType[0] ?? null)
          break
        case 'arrest':
          if (Array.isArray(filters.arrest)) setArrest(filters.arrest[0] ?? null)
          break
        case 'domestic':
          if (Array.isArray(filters.domestic)) setDomestic(filters.domestic[0] ?? null)
          break
        case 'district':
          if (Array.isArray(filters.district)) setDistrict(filters.district[0] ?? null)
          break
        case 'beat':
          if (Array.isArray(filters.beat)) setBeat(filters.beat[0] ?? null)
          break
        case 'ward':
          if (Array.isArray(filters.ward)) setWard(filters.ward[0] ?? null)
          break
        case 'communityArea':
          if (Array.isArray(filters.communityArea))
            setCommunityArea(filters.communityArea[0] ?? null)
          break
        default:
          break
      }
    }
  }

  const renderSidebarField = (
    field: SidebarFilterFieldKey,
    isMultiSelect: boolean
  ): React.ReactNode => {
    const layoutClass =
      sidebarFieldLayout[field] === 'full'
        ? 'sidebar-filter-group sidebar-filter-group--full'
        : 'sidebar-filter-group sidebar-filter-group--half'
    const commonProps = sidebarFieldTestIds[field]
      ? { 'data-testid': sidebarFieldTestIds[field] }
      : undefined

    const label = SIDEBAR_FILTER_LABELS[field]
    const mode = isMultiSelect ? 'multiple' : undefined

    const controlMap: Record<SidebarFilterFieldKey, React.ReactNode> = {
      year: <YearFilterSelect mode={mode} value={filters.year} onChange={setYear} />,
      month: (
        <Select<any>
          mode={mode}
          value={
            mode === 'multiple'
              ? filters.month === null
                ? []
                : Array.isArray(filters.month)
                  ? filters.month
                  : [filters.month]
              : Array.isArray(filters.month)
                ? (filters.month[0] ?? '__all__')
                : (filters.month ?? '__all__')
          }
          options={MONTH_FILTER_OPTIONS}
          onChange={(value) => {
            if (mode === 'multiple') {
              const arr = Array.isArray(value) ? value : [value]
              const filtered = arr.filter((v) => v !== '__all__')
              setMonth(filtered.length > 0 ? (filtered as number[]) : null)
            } else {
              setMonth(value === '__all__' ? null : Number(value))
            }
          }}
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
      type: <TypeFilterSelect mode={mode} value={filters.primaryType} onChange={setPrimaryType} />,
      arrest: <ArrestFilterSelect mode={mode} value={filters.arrest} onChange={setArrest} />,
      domestic: (
        <Select<any>
          mode={mode}
          value={
            mode === 'multiple'
              ? Array.isArray(filters.domestic)
                ? filters.domestic.map(String)
                : filters.domestic !== null
                  ? [String(filters.domestic)]
                  : []
              : filters.domestic === null
                ? '__all__'
                : Array.isArray(filters.domestic)
                  ? filters.domestic.length > 0
                    ? String(filters.domestic[0])
                    : '__all__'
                  : String(filters.domestic)
          }
          options={DOMESTIC_FILTER_OPTIONS}
          onChange={(value) => {
            if (mode === 'multiple') {
              const arr = Array.isArray(value) ? value : [value]
              const filtered = arr.filter((v) => v !== '__all__')
              if (filtered.length === 0) {
                setDomestic(null)
              } else {
                setDomestic(filtered.map((v) => v === 'true'))
              }
            } else {
              if (value === '__all__') {
                setDomestic(null)
                return
              }
              setDomestic(value === 'true')
            }
          }}
          style={{ width: '100%' }}
          size="small"
          showSearch={false}
        />
      ),
      district: (
        <DistrictFilterSelect mode={mode} value={filters.district} onChange={setDistrict} />
      ),
      beat: (
        <Select<any>
          mode={mode}
          value={
            mode === 'multiple'
              ? filters.beat === null
                ? []
                : Array.isArray(filters.beat)
                  ? filters.beat
                  : [filters.beat]
              : Array.isArray(filters.beat)
                ? (filters.beat[0] ?? '__all__')
                : (filters.beat ?? '__all__')
          }
          options={beatSelectOptions}
          loading={filterOptions.loading}
          onChange={(value) => {
            if (mode === 'multiple') {
              const arr = Array.isArray(value) ? value : [value]
              const filtered = arr.filter((v) => v !== '__all__')
              setBeat(filtered.length > 0 ? (filtered as string[]) : null)
            } else {
              setBeat(value === '__all__' ? null : value)
            }
          }}
          style={{ width: '100%' }}
          size="small"
          showSearch={false}
        />
      ),
      ward: (
        <Select<any>
          mode={mode}
          value={
            mode === 'multiple'
              ? filters.ward === null
                ? []
                : Array.isArray(filters.ward)
                  ? filters.ward
                  : [filters.ward]
              : Array.isArray(filters.ward)
                ? (filters.ward[0] ?? '__all__')
                : (filters.ward ?? '__all__')
          }
          options={wardSelectOptions}
          loading={filterOptions.loading}
          onChange={(value) => {
            if (mode === 'multiple') {
              const arr = Array.isArray(value) ? value : [value]
              const filtered = arr.filter((v) => v !== '__all__')
              setWard(filtered.length > 0 ? (filtered as number[]) : null)
            } else {
              setWard(value === '__all__' ? null : Number(value))
            }
          }}
          style={{ width: '100%' }}
          size="small"
          showSearch={false}
        />
      ),
      communityArea: (
        <Select<any>
          mode={mode}
          value={
            mode === 'multiple'
              ? filters.communityArea === null
                ? []
                : Array.isArray(filters.communityArea)
                  ? filters.communityArea
                  : [filters.communityArea]
              : Array.isArray(filters.communityArea)
                ? (filters.communityArea[0] ?? '__all__')
                : (filters.communityArea ?? '__all__')
          }
          options={communityAreaSelectOptions}
          loading={filterOptions.loading}
          onChange={(value) => {
            if (mode === 'multiple') {
              const arr = Array.isArray(value) ? value : [value]
              const filtered = arr.filter((v) => v !== '__all__')
              setCommunityArea(filtered.length > 0 ? (filtered as number[]) : null)
            } else {
              setCommunityArea(value === '__all__' ? null : Number(value))
            }
          }}
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
        <div
          key={location.pathname}
          className="app-route-backdrop__image route-backdrop-transition"
        />
        <div className="app-route-backdrop__overlay" />
        <div className="app-route-backdrop__texture" />

        <div className="urban-oracle-layout">
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
                    <div className="sidebar-page-badge"><FilterOutlined /></div>
                    <div className="sidebar-page-copy">
                      <div className="sidebar-page-label">GLOBAL FILTERS</div>
                      <div className="sidebar-page-title">全局数据筛选</div>
                      <div className="sidebar-page-eyebrow">多维度联动控制</div>
                    </div>
                  </div>
                  <p className="sidebar-page-desc">通过以下条件过滤整个应用的数据分析范围，所有图表与地图将实时联动更新。</p>
                </section>

                {SIDEBAR_FILTER_GROUPS.map((group) => (
                  <section
                    key={group.key}
                    className="sidebar-filter-section sidebar-filter-section--group sidebar-panel"
                  >
                    <div
                      className="sidebar-filter-section__header"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div className="sidebar-section-label">{group.title}</div>
                        <p className="sidebar-section-desc" style={{ marginBottom: 0 }}>
                          {group.description}
                        </p>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          多选模式
                        </span>
                        <Switch
                          size="small"
                          checked={multiSelectGroups[group.key]}
                          onChange={(checked) => {
                            setMultiSelectGroups((prev) => ({ ...prev, [group.key]: checked }))
                            if (!checked) {
                              collapseGroupFilters(group.fields)
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="sidebar-filter-grid">
                      {group.fields.map((field) =>
                        renderSidebarField(field, multiSelectGroups[group.key])
                      )}
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
                        <span className="sidebar-summary-item__label">
                          {t('sidebar.groupTime')}
                        </span>
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
                      href="https://www.kaggle.com/datasets/utkarshx27/crimes-2001-to-present"
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

          <div className="urban-oracle-body">
            <header className="urban-oracle-header">
              <div className="header-left">
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
                  <button
                    className="icon-btn"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
                    title={theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark')}
                    style={{ marginLeft: '-8px' }}
                  >
                    {theme === 'light' ? <BulbFilled /> : <BulbOutlined />}
                  </button>
                </nav>
              </div>

              <div className="header-right">
                <div className="brand-panel">
                  <div className="brand-panel__copy">
                    <span className="brand-panel__eyebrow">CHICAGO CRIME VISUAL INTELLIGENCE</span>
                    <span className="brand-panel__title">{t('app.windowTitle')}</span>
                  </div>
                  <img src={appIcon} alt="Logo" className="brand-panel__logo" />
                </div>
                
                <div className="header-logo-divider" />
              </div>
            </header>

            <main className="urban-oracle-main">
              <div key={location.pathname} className="urban-oracle-content route-transition">
                <div className="view-container">{children}</div>
              </div>

              <div className="urban-statusbar">
                <div className="statusbar-coords">
                  <span className="statusbar-coord-item">
                    API 延迟: {summary.avgDurationMs.toFixed(0)}ms
                  </span>
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
                        summary.failed > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-green)'
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

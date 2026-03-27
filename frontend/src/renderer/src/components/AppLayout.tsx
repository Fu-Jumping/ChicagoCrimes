import React from 'react'
import { Button, Space, Tag } from 'antd'
import {
  AppstoreOutlined,
  LineChartOutlined,
  PieChartOutlined,
  BarChartOutlined,
  BulbOutlined,
  GlobalOutlined,
  PrinterOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { useThemeMode } from '../hooks/useThemeMode'
import { useRequestHistory } from '../hooks/useRequestHistory'
import { t } from '../i18n'
import TitleBar from './TitleBar'
import YearFilterSelect from './YearFilterSelect'
import TypeFilterSelect from './TypeFilterSelect'

interface AppLayoutProps {
  children: React.ReactNode
}

const topNavItems = [
  { label: t('nav.overview'), path: '/' },
  { label: t('nav.trend'), path: '/trend' },
  { label: t('nav.type'), path: '/type' },
  { label: t('nav.district'), path: '/district' },
  { label: t('nav.map'), path: '/map' }
]

const pageContextMap: Record<
  string,
  { label: string; icon: React.ReactNode; desc: string }
> = {
  '/': {
    label: t('nav.overview'),
    icon: <AppstoreOutlined />,
    desc: '综合犯罪数据总览，含年度趋势、类型分布及分区对比'
  },
  '/trend': {
    label: t('nav.trend'),
    icon: <LineChartOutlined />,
    desc: '月度·周内·小时三维时序规律分析'
  },
  '/type': {
    label: t('nav.type'),
    icon: <PieChartOutlined />,
    desc: '犯罪类型分类、逮捕效率及家暴比例深度分析'
  },
  '/district': {
    label: t('nav.district'),
    icon: <BarChartOutlined />,
    desc: '各分区案件体量对比及高发地点类型分布'
  },
  '/map': {
    label: t('nav.map'),
    icon: <GlobalOutlined />,
    desc: '基于地图的热力分布与区域动态演变分析'
  }
}

const dimensionLabelMap: Record<string, string> = {
  year: '年份',
  primary_type: '犯罪类型',
  district: '分区'
}

export { dimensionLabelMap }

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { filters, clearFilters, setYear, setPrimaryType } = useGlobalFilters()
  const { theme, toggleTheme } = useThemeMode()

  const currentPage = pageContextMap[location.pathname] ?? pageContextMap['/']
  const hasActiveFilters = !!(filters.year || filters.primaryType)

  const { summary } = useRequestHistory([]) // Get global request summary
  const hitRate = summary.total > 0 ? Math.round((summary.cacheHit / summary.total) * 100) : 0

  return (
    <div className="app-window-container">
      <TitleBar />
      <div className="urban-oracle-layout">
        {/* Top Navigation Bar */}
        <header className="urban-oracle-header">
          <div className="header-left">
            <div className="logo-glow">
              <span className="logo-text">城市神谕系统</span>
            </div>
            <div className="header-logo-divider" />
            <nav className="header-nav">
              {topNavItems.map((item) => (
                <span
                  key={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </span>
              ))}
            </nav>
          </div>
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
        </header>

        {/* Body: Sidebar + Content */}
        <div className="urban-oracle-body">
          {/* Left Sidebar — Context Info Panel */}
          <aside className="urban-sidebar">
            {/* Current Page */}
            <div className="sidebar-page-section">
              <div className="sidebar-page-label">{t('sidebar.currentPage')}</div>
              <div className="sidebar-page-name">
                <span className="sidebar-page-icon">{currentPage.icon}</span>
                <span className="sidebar-page-title">{currentPage.label}</span>
              </div>
              <p className="sidebar-page-desc">{currentPage.desc}</p>
            </div>

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

            {/* Data Source Info */}
            <div className="sidebar-datasource-section">
              <div className="sidebar-section-label">{t('sidebar.dataSource')}</div>
              <div className="sidebar-datasource-name">{t('sidebar.dataRange')}</div>
              <div className="sidebar-datasource-years">{t('sidebar.dataYears')}</div>
              <div className="sidebar-status-row">
                <div className="statusbar-dot" />
                <span className="sidebar-status-text">{t('sidebar.systemOnline')}</span>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="urban-oracle-main">
            <div className="urban-oracle-content">
              {/* Page View */}
              <div className="view-container">{children}</div>
            </div>

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
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout

import React from 'react'
import { Button, Space, Tag } from 'antd'
import {
  AppstoreOutlined,
  LineChartOutlined,
  PieChartOutlined,
  BarChartOutlined,
  BulbOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { useThemeMode } from '../hooks/useThemeMode'
import { t } from '../i18n'
import TitleBar from './TitleBar'

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
  const { filters, clearFilters } = useGlobalFilters()
  const { theme, toggleTheme } = useThemeMode()

  const currentPage = pageContextMap[location.pathname] ?? pageContextMap['/']
  const hasActiveFilters = !!(filters.year || filters.primaryType)

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

            {/* Active Filters */}
            <div className="sidebar-filter-section">
              <div className="sidebar-section-label">{t('sidebar.activeFilters')}</div>
              {hasActiveFilters ? (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {filters.year && (
                    <Tag className="sidebar-filter-tag">
                      {t('global.yearTag', { value: filters.year })}
                    </Tag>
                  )}
                  {filters.primaryType && (
                    <Tag className="sidebar-filter-tag">
                      {t('global.typeTag', { value: filters.primaryType })}
                    </Tag>
                  )}
                  <Button
                    size="small"
                    className="sidebar-clear-btn"
                    onClick={clearFilters}
                  >
                    {t('nav.clearFilters')}
                  </Button>
                </Space>
              ) : (
                <p className="sidebar-no-filter">{t('sidebar.noFilters')}</p>
              )}
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
                <span className="statusbar-coord-item">纬度: 41.8781° N</span>
                <span className="statusbar-coord-item">经度: 87.6298° W</span>
                <span className="statusbar-coord-item">芝加哥 · 伊利诺伊州</span>
              </div>
              <div className="statusbar-channel">
                <div className="statusbar-dot" />
                <span className="statusbar-channel-text">数据库连接正常</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout

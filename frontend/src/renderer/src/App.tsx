import type { JSX } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, theme as antdTheme } from 'antd'
import AppLayout from './components/AppLayout'
import { GlobalFiltersProvider } from './contexts/GlobalFiltersContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { useThemeMode } from './hooks/useThemeMode'
import { t } from './i18n'
import Dashboard from './views/Dashboard'
import TrendAnalysis from './views/TrendAnalysis'
import TypeAnalysis from './views/TypeAnalysis'
import DistrictAnalysis from './views/DistrictAnalysis'
import MapView from './views/MapView'
import './assets/main.css'

function AppContent(): JSX.Element {
  const { theme } = useThemeMode()
  
  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          fontFamily: "'Space Grotesk', 'JetBrains Mono', 'PingFang SC', 'Microsoft YaHei', sans-serif"
        }
      }}
    >
      <HashRouter>
        <GlobalFiltersProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/trend" element={<TrendAnalysis />} />
              <Route path="/type" element={<TypeAnalysis />} />
              <Route path="/district" element={<DistrictAnalysis />} />
              <Route path="/map" element={<MapView />} />
              <Route path="*" element={<div>{t('app.windowTitle')}</div>} />
            </Routes>
          </AppLayout>
        </GlobalFiltersProvider>
      </HashRouter>
    </ConfigProvider>
  )
}

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App

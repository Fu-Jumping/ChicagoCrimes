import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Button, ConfigProvider, Spin, Typography, theme as antdTheme } from 'antd'
import AppLayout from './components/AppLayout'
import SetupWizard from './components/SetupWizard'
import { GlobalFiltersProvider } from './contexts/GlobalFiltersContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { useThemeMode } from './hooks/useThemeMode'
import { t } from './i18n'
import Dashboard from './views/Dashboard'
import TrendAnalysis from './views/TrendAnalysis'
import TypeAnalysis from './views/TypeAnalysis'
import DistrictAnalysis from './views/DistrictAnalysis'
import MapView from './views/MapView'
import { fetchSetupStatus, isSetupFullyReady } from './api/setupWizard'
import './assets/main.css'

function AppContent(): JSX.Element {
  const { theme } = useThemeMode()

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          fontFamily:
            "'Space Grotesk', 'JetBrains Mono', 'PingFang SC', 'Microsoft YaHei', sans-serif"
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

type GatePhase = 'loading' | 'backend_down' | 'wizard' | 'app'

async function checkBackendReachable(): Promise<boolean> {
  try {
    const r = await fetch('http://127.0.0.1:8000/api/setup/status', { signal: AbortSignal.timeout(4000) })
    return r.ok || r.status < 500
  } catch {
    return false
  }
}

function BackendDownScreen({ onRetry }: { onRetry: () => void }): JSX.Element {
  const [retrying, setRetrying] = useState(false)
  const handleRetry = async () => {
    setRetrying(true)
    await new Promise((r) => setTimeout(r, 800))
    setRetrying(false)
    onRetry()
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--cc-bg-deep, #0b1020)',
        padding: 32
      }}
    >
      <div style={{ maxWidth: 600, width: '100%' }}>
        <Spin spinning={false}>
          <div style={{ background: 'rgba(255,80,80,0.08)', borderRadius: 12, padding: 32, border: '1px solid rgba(255,80,80,0.25)' }}>
            <Typography.Title level={4} style={{ color: '#ff6b6b', marginTop: 0 }}>
              ⚠ 无法连接到后端服务
            </Typography.Title>
            <Typography.Paragraph style={{ color: '#c8d0e8', marginBottom: 16 }}>
              应用前端已就绪，但无法连接到本地后端（<Typography.Text code>http://127.0.0.1:8000</Typography.Text>）。
              需要先启动 Python 后端服务，再使用本应用。
            </Typography.Paragraph>
            <Typography.Title level={5} style={{ color: '#8899cc' }}>启动方法（在项目根目录执行）</Typography.Title>
            <pre style={{
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#a8e6cf',
              fontSize: 13,
              marginBottom: 16,
              whiteSpace: 'pre-wrap'
            }}>
{`# 1. 激活 Python 虚拟环境
.venv\\Scripts\\activate

# 2. 启动后端（在项目根目录）
python start.py dev

# 或者仅启动后端
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000`}
            </pre>
            <Typography.Paragraph style={{ color: '#8899cc', fontSize: 12 }}>
              后端启动成功后会显示 <Typography.Text code style={{ fontSize: 12 }}>Uvicorn running on http://127.0.0.1:8000</Typography.Text>，
              之后点击下方重试按钮继续。
            </Typography.Paragraph>
            <Button
              type="primary"
              size="large"
              loading={retrying}
              onClick={() => void handleRetry()}
              style={{ marginTop: 8 }}
            >
              {retrying ? '正在重试…' : '已启动后端，重试连接'}
            </Button>
          </div>
        </Spin>
      </div>
    </div>
  )
}

function SetupGate(): JSX.Element {
  const { theme } = useThemeMode()
  const [phase, setPhase] = useState<GatePhase>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    ;(async () => {
      const reachable = await checkBackendReachable()
      if (cancelled) return
      if (!reachable) {
        setPhase('backend_down')
        return
      }
      try {
        const status = await fetchSetupStatus()
        if (cancelled) return
        if (isSetupFullyReady(status)) {
          try {
            await window.api?.setSetupStore?.({ setupCompleted: true })
          } catch {
            /* ignore */
          }
          setPhase('app')
          return
        }
      } catch {
        /* status fetch failed but backend reachable: go to wizard */
      }
      if (!cancelled) setPhase('wizard')
    })()
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const providerTheme = {
    algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      fontFamily: "'Space Grotesk', 'JetBrains Mono', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    }
  }

  if (phase === 'loading') {
    return (
      <ConfigProvider theme={providerTheme}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--cc-bg-deep, #0b1020)'
          }}
        >
          <Spin size="large" tip={t('setup.loadingGate')} />
        </div>
      </ConfigProvider>
    )
  }

  if (phase === 'backend_down') {
    return (
      <ConfigProvider theme={providerTheme}>
        <BackendDownScreen onRetry={() => setRetryKey((k) => k + 1)} />
      </ConfigProvider>
    )
  }

  if (phase === 'wizard') {
    return (
      <ConfigProvider theme={providerTheme}>
        <SetupWizard onComplete={() => setPhase('app')} />
      </ConfigProvider>
    )
  }

  return <AppContent />
}

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <SetupGate />
    </ThemeProvider>
  )
}

export default App

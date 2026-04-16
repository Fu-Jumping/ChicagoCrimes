import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const setupWizardMocks = vi.hoisted(() => ({
  fetchSetupStatus: vi.fn(),
  passesSetupGate: vi.fn()
}))

vi.mock('./api/setupWizard', () => ({
  fetchSetupStatus: setupWizardMocks.fetchSetupStatus,
  passesSetupGate: setupWizardMocks.passesSetupGate
}))

vi.mock('./contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

vi.mock('./hooks/useThemeMode', () => ({
  useThemeMode: () => ({ theme: 'light' })
}))

vi.mock('./components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  )
}))

vi.mock('./components/SetupWizard', () => ({
  default: () => <div data-testid="setup-wizard">setup wizard</div>
}))

vi.mock('./views/Dashboard', () => ({
  default: () => <div data-testid="dashboard-view">dashboard</div>
}))

vi.mock('./views/TrendAnalysis', () => ({
  default: () => <div>trend</div>
}))

vi.mock('./views/TypeAnalysis', () => ({
  default: () => <div>type</div>
}))

vi.mock('./views/DistrictAnalysis', () => ({
  default: () => <div>district</div>
}))

vi.mock('./views/MapView', () => ({
  default: () => <div>map</div>
}))

vi.mock('./views/RequirementsAnalysis', () => ({
  default: () => <div>requirements</div>
}))

describe('App startup gate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.api = {
      selectCsvFile: vi.fn().mockResolvedValue({ canceled: true, path: null }),
      getSetupStore: vi.fn().mockResolvedValue({ setupCompleted: false, lastCsvPath: '' }),
      setSetupStore: vi.fn().mockResolvedValue(undefined)
    } as Window['api']
    setupWizardMocks.fetchSetupStatus.mockResolvedValue({
      database_configured: true,
      tables_ok: true,
      crimes_populated: true,
      summaries_ready: true,
      percent: 100
    })
    setupWizardMocks.passesSetupGate.mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('waits through a slow backend startup and still enters the app automatically', async () => {
    let attempts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        attempts += 1
        if (attempts < 10) {
          return Promise.reject(new Error('backend_not_ready'))
        }
        return Promise.resolve({ ok: true, status: 200 } satisfies Partial<Response>)
      })
    )

    render(<App />)

    await vi.advanceTimersByTimeAsync(6000)
    await Promise.resolve()

    expect(screen.queryByTestId('dashboard-view')).toBeInTheDocument()
    expect(screen.queryByTestId('setup-wizard')).not.toBeInTheDocument()
    expect(window.api?.setSetupStore).toHaveBeenCalledWith({ setupCompleted: true })
  }, 10000)
})

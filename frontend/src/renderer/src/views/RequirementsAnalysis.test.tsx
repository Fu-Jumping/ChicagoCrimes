import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import RequirementsAnalysis from './RequirementsAnalysis'
import { GlobalFiltersProvider } from '../contexts/GlobalFiltersContext'
import { analyticsApi } from '../api'

vi.mock('../hooks/useDebouncedValue', () => ({
  useDebouncedValue: <T,>(value: T) => value
}))

vi.mock('../components/AnalysisPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('../components/InsightCard', () => ({
  default: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <section data-testid={`card-${String(title)}`}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}))

vi.mock('../components/DataStatePanel', () => ({
  default: ({
    loading,
    error,
    isEmpty,
    children
  }: {
    loading: boolean
    error: Error | null
    isEmpty: boolean
    children: React.ReactNode
  }) => (
    <div
      data-testid="data-state-panel"
      data-state={loading ? 'loading' : error ? 'error' : isEmpty ? 'empty' : 'content'}
    >
      {!loading && !error && !isEmpty ? children : null}
    </div>
  )
}))

vi.mock('../components/charts/BarChart', () => ({
  default: ({
    data,
    series
  }: {
    data?: Record<string, unknown>[]
    series?: Array<{ data: Record<string, unknown>[] }>
  }) => (
    <div
      data-testid={series && series.length > 0 ? 'seasonal-bar-chart' : 'bar-chart'}
      data-points={
        series && series.length > 0
          ? series.reduce((total, item) => total + item.data.length, 0)
          : (data?.length ?? 0)
      }
    />
  )
}))

vi.mock('../components/charts/LineChart', () => ({
  default: ({ data }: { data?: Record<string, unknown>[] }) => (
    <div data-testid="line-chart" data-points={data?.length ?? 0} />
  )
}))

vi.mock('../components/charts/PieChart', () => ({
  default: ({ data }: { data?: Record<string, unknown>[] }) => (
    <div data-testid="pie-chart" data-points={data?.length ?? 0} />
  )
}))

const buildResponse = <T,>(data: T) => ({
  code: 'SUCCESS',
  message: 'ok',
  data,
  meta: {},
  request_id: 'req-test'
})

const renderView = () =>
  render(
    <MemoryRouter initialEntries={['/requirements']}>
      <GlobalFiltersProvider>
        <RequirementsAnalysis />
      </GlobalFiltersProvider>
    </MemoryRouter>
  )

describe('RequirementsAnalysis', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    vi.spyOn(analyticsApi, 'getYearlyTrend').mockImplementation(
      (params?: Record<string, unknown>) => {
        if (Array.isArray(params?.primary_type)) {
          return Promise.resolve(buildResponse([{ year: 2023, count: 9 }]))
        }
        if (Array.isArray(params?.domestic)) {
          return Promise.resolve(buildResponse([{ year: 2023, count: 4 }]))
        }
        return Promise.resolve(buildResponse([{ year: 2023, count: 120 }]))
      }
    )
    vi.spyOn(analyticsApi, 'getHourlyTrend').mockResolvedValue(
      buildResponse([{ hour: 10, count: 18 }])
    )
    vi.spyOn(analyticsApi, 'getWeeklyTrend').mockResolvedValue(
      buildResponse([{ day_of_week: 1, count: 28 }])
    )
    vi.spyOn(analyticsApi, 'getTypesProportion').mockResolvedValue(
      buildResponse([{ primary_type: 'THEFT', count: 42 }])
    )
    vi.spyOn(analyticsApi, 'getLocationTypes').mockResolvedValue(
      buildResponse([{ location_description: 'STREET', count: 35 }])
    )
    vi.spyOn(analyticsApi, 'getDangerousBlocksTop').mockResolvedValue(
      buildResponse([{ block: '001XX W TEST ST', count: 16 }])
    )
    vi.spyOn(analyticsApi, 'getDistrictsComparison').mockResolvedValue(
      buildResponse([{ district: '001', count: 44 }])
    )
    vi.spyOn(analyticsApi, 'getArrestsRate').mockResolvedValue(
      buildResponse([
        { arrest: true, count: 12 },
        { arrest: false, count: 8 }
      ])
    )
    vi.spyOn(analyticsApi, 'getTypesSeasonalCompare').mockImplementation(
      () =>
        new Promise((resolve) => {
          window.setTimeout(() => {
            resolve(
              buildResponse([
                { season: 'winter', primary_type: 'THEFT', proportion: 0.62 },
                { season: 'summer', primary_type: 'THEFT', proportion: 0.38 }
              ])
            )
          }, 12000)
        })
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('keeps the slow seasonal comparison chart loading independently until its late response arrives', async () => {
    renderView()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(
      within(screen.getByTestId('card-整体逮捕率')).getByTestId('pie-chart')
    ).toBeInTheDocument()

    const seasonalCard = screen.getByTestId('card-冬季与夏季类型对比')
    expect(within(seasonalCard).getByTestId('data-state-panel')).toHaveAttribute(
      'data-state',
      'loading'
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(within(seasonalCard).queryByTestId('seasonal-bar-chart')).toBeInTheDocument()
  }, 15000)
})

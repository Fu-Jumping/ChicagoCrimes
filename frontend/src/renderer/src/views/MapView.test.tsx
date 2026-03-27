import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MapView from './MapView'
import { GlobalFiltersProvider } from '../contexts/GlobalFiltersContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { analyticsApi } from '../api'

vi.mock('../hooks/useDebouncedValue', () => ({
  useDebouncedValue: <T,>(value: T) => value
}))

vi.mock('../components/charts/CrimeHeatMap', () => ({
  default: ({ heatData, districtData }: { heatData: unknown[]; districtData: unknown[] }) => (
    <div
      data-testid="crime-heatmap"
      data-heat-count={heatData.length}
      data-district-count={districtData.length}
    />
  )
}))

vi.mock('../components/AnalysisPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('MapView', () => {
  beforeEach(() => {
    vi.spyOn(analyticsApi, 'getGeoHeatmap').mockResolvedValue([
      { lat: 41.88, lng: -87.63, count: 20 }
    ])
    vi.spyOn(analyticsApi, 'getGeoDistricts').mockResolvedValue([
      { district: '001', count: 20 }
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderView = (initialEntry: string) =>
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <GlobalFiltersProvider>
            <MapView />
          </GlobalFiltersProvider>
        </MemoryRouter>
      </ThemeProvider>
    )

  it('uses only the left global filters and no longer renders an independent month timeline', async () => {
    renderView(
      '/map?year=2023&month=2&primary_type=THEFT&district=7&beat=0711&ward=22&community_area=25&arrest=false&domestic=true'
    )

    await waitFor(() => {
      expect(analyticsApi.getGeoHeatmap).toHaveBeenCalledWith({
        year: 2023,
        month: 2,
        primary_type: 'THEFT',
        district: 7,
        beat: '0711',
        ward: 22,
        community_area: 25,
        arrest: false,
        domestic: true,
        start_date: '2023-02-01',
        end_date: '2023-02-28'
      })
    })

    expect(analyticsApi.getGeoDistricts).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('timeline-center-indicator')).not.toBeInTheDocument()
    expect(screen.getByTestId('crime-heatmap')).toBeInTheDocument()
  })

  it('renders the map inside the layered analysis card shell', async () => {
    const { container } = renderView('/map')

    await waitFor(() => {
      expect(screen.getByTestId('crime-heatmap')).toBeInTheDocument()
    })

    expect(container.querySelector('.analysis-module-card')).toBeInTheDocument()
  })
})

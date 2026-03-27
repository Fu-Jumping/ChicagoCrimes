import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { analyticsApi } from '../api'
import { GlobalFiltersProvider } from '../contexts/GlobalFiltersContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import Dashboard from '../views/Dashboard'

describe('visual regression', () => {
  beforeEach(() => {
    ;(analyticsApi as Record<string, unknown>).warmupAppData = vi.fn(() => Promise.resolve())
    vi.spyOn(analyticsApi, 'getTypesProportion').mockResolvedValue({
      code: 'OK',
      message: 'success',
      data: [],
      meta: {},
      request_id: 'types-visual-test'
    })
    vi.spyOn(analyticsApi, 'getFilterOptions').mockResolvedValue({
      code: 'OK',
      message: 'success',
      data: {
        months: [1, 2, 3],
        beats: ['111', '112'],
        wards: [1, 2],
        community_areas: [10, 20]
      },
      meta: {},
      request_id: 'filters-visual-test'
    })
    vi.spyOn(analyticsApi, 'getYearlyTrend').mockResolvedValue({
      code: 'OK',
      message: 'success',
      data: [
        { year: 2021, count: 12 },
        { year: 2022, count: 18 },
        { year: 2023, count: 21 }
      ],
      meta: {},
      request_id: 'yearly-visual-test'
    })
    vi.spyOn(analyticsApi, 'getDistrictsComparison').mockResolvedValue({
      code: 'OK',
      message: 'success',
      data: [
        { district: '001', count: 7 },
        { district: '002', count: 11 }
      ],
      meta: {},
      request_id: 'district-visual-test'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (analyticsApi as Record<string, unknown>).warmupAppData
  })

  it('renders the dashboard shell snapshot with analysis modules', async () => {
    const { container } = render(
      <ThemeProvider>
        <MemoryRouter>
          <GlobalFiltersProvider>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </GlobalFiltersProvider>
        </MemoryRouter>
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(container.querySelectorAll('.analysis-module-card').length).toBeGreaterThan(0)
    })
    expect(container.querySelector('.analysis-shell__eyebrow')).toBeInTheDocument()
    expect(container.firstChild).toMatchSnapshot()
  })
})

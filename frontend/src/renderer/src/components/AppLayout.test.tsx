import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
import { GlobalFiltersProvider } from '../contexts/GlobalFiltersContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { analyticsApi } from '../api'
import { t } from '../i18n'
import { SIDEBAR_FILTER_GROUPS, SIDEBAR_FILTER_LABELS } from '../utils/sidebarFilters'

describe('AppLayout', () => {
  beforeEach(() => {
    ;(analyticsApi as Record<string, unknown>).warmupAppData = vi.fn(() => Promise.resolve())
    vi.spyOn(analyticsApi, 'getTypesProportion').mockResolvedValue({
      code: 'OK',
      message: 'success',
      data: [],
      meta: {},
      request_id: 'types-test'
    })
    vi.spyOn(analyticsApi, 'getDistrictsComparison').mockResolvedValue({
      code: 'OK',
      message: 'success',
      data: [],
      meta: {},
      request_id: 'district-test'
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
      request_id: 'filters-test'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (analyticsApi as Record<string, unknown>).warmupAppData
  })

  const renderLayout = () =>
    render(
      <ThemeProvider>
        <MemoryRouter>
          <GlobalFiltersProvider>
            <AppLayout>
              <div className="analysis-module-card">content</div>
            </AppLayout>
          </GlobalFiltersProvider>
        </MemoryRouter>
      </ThemeProvider>
    )

  it('renders navigation items', () => {
    const { container } = renderLayout()
    expect(container.querySelectorAll('.nav-item').length).toBeGreaterThanOrEqual(5)
  })

  it('renders the mixed-balanced app chrome with brand, grouped filters, and route backdrop', () => {
    const { container } = renderLayout()

    expect(container.querySelector('.brand-panel__title')).toHaveTextContent(t('app.windowTitle'))
    expect(screen.getAllByText(SIDEBAR_FILTER_GROUPS[0].title).length).toBeGreaterThan(0)
    expect(screen.getAllByText(SIDEBAR_FILTER_GROUPS[1].title).length).toBeGreaterThan(0)
    expect(screen.getAllByText(SIDEBAR_FILTER_GROUPS[2].title).length).toBeGreaterThan(0)
    expect(screen.getByText(SIDEBAR_FILTER_LABELS.communityArea)).toBeInTheDocument()
    expect(container.querySelector('.app-route-backdrop')).toBeInTheDocument()
    expect(container.querySelector('.analysis-module-card')).toBeInTheDocument()
  })

  it('renders localized compact filter controls with click-only inputs', () => {
    const { container } = renderLayout()

    expect(screen.getByTestId('global-month-filter')).toBeInTheDocument()
    expect(screen.getByTestId('global-beat-filter')).toBeInTheDocument()
    expect(screen.getByTestId('global-ward-filter')).toBeInTheDocument()
    expect(screen.getByTestId('global-community-area-filter')).toBeInTheDocument()
    expect(screen.getByTestId('global-domestic-filter')).toBeInTheDocument()
    expect(screen.getByText(SIDEBAR_FILTER_LABELS.month)).toBeInTheDocument()
    expect(screen.getByText(SIDEBAR_FILTER_LABELS.beat)).toBeInTheDocument()
    expect(screen.getByText(SIDEBAR_FILTER_LABELS.ward)).toBeInTheDocument()
    expect(screen.getByText(SIDEBAR_FILTER_LABELS.communityArea)).toBeInTheDocument()
    expect(container.querySelector('.sidebar-filter-grid')).toBeInTheDocument()
    expect(container.querySelectorAll('.sidebar-filter-group--half').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.sidebar-filter-grid .ant-select-show-search')).toHaveLength(0)

    const dateInputs = container.querySelectorAll('.ant-picker-input input')
    expect(dateInputs.length).toBeGreaterThan(0)
    expect(Array.from(dateInputs).every((input) => input.hasAttribute('readonly'))).toBe(true)
  })

  it('toggles the sidebar collapsed state', () => {
    const { container } = renderLayout()

    fireEvent.click(screen.getByTestId('sidebar-collapse-toggle'))

    expect(container.querySelector('.urban-sidebar')).toHaveClass('urban-sidebar--collapsed')
    expect(container.querySelector('.urban-sidebar__toggle-row')).toHaveClass(
      'urban-sidebar__toggle-row--collapsed'
    )
  })

  it('shows a visible warmup overlay while preloading app data', async () => {
    let resolveWarmup!: () => void
    const warmupPromise = new Promise<void>((resolve) => {
      resolveWarmup = resolve
    })
    ;(analyticsApi as Record<string, unknown>).warmupAppData = vi.fn(() => warmupPromise)

    renderLayout()

    expect(screen.getByTestId('app-warmup-overlay')).toBeInTheDocument()

    resolveWarmup()

    await waitFor(() => {
      expect(screen.queryByTestId('app-warmup-overlay')).not.toBeInTheDocument()
    })
  })
})

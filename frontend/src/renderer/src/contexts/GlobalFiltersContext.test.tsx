import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { GlobalFiltersProvider } from './GlobalFiltersContext'
import { useGlobalFilters } from '../hooks/useGlobalFilters'

const getParam = (search: string, key: string): string | null =>
  new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(key)

const FilterHarness: React.FC = () => {
  const { filters, setMonth, setYear, setDateRange } = useGlobalFilters()
  const location = useLocation()

  return (
    <div>
      <button type="button" onClick={() => setYear(2023)}>
        set-year-2023
      </button>
      <button type="button" onClick={() => setMonth(2)}>
        set-february
      </button>
      <button type="button" onClick={() => setMonth(null)}>
        clear-month
      </button>
      <button type="button" onClick={() => setDateRange('2023-05-10', '2023-05-20')}>
        set-custom-range
      </button>
      <div data-testid="location-search">{location.search}</div>
      <div data-testid="current-month">
        {filters.month === null ? 'null' : String(filters.month)}
      </div>
      <div data-testid="current-primary-type">
        {filters.primaryType === null
          ? 'null'
          : Array.isArray(filters.primaryType)
            ? filters.primaryType.join('|')
            : filters.primaryType}
      </div>
    </div>
  )
}

describe('GlobalFiltersContext', () => {
  const renderHarness = (initialEntry: string) =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <GlobalFiltersProvider>
          <FilterHarness />
        </GlobalFiltersProvider>
      </MemoryRouter>
    )

  it('syncs the date range to the selected month within the current analysis year', () => {
    renderHarness('/?year=2023&start_date=2023-01-01&end_date=2023-12-31')

    fireEvent.click(screen.getByText('set-february'))

    const search = screen.getByTestId('location-search').textContent ?? ''
    expect(getParam(search, 'year')).toBe('2023')
    expect(getParam(search, 'month')).toBe('2')
    expect(getParam(search, 'start_date')).toBe('2023-02-01')
    expect(getParam(search, 'end_date')).toBe('2023-02-28')
  })

  it('restores the full-year date range when the month filter is cleared', () => {
    renderHarness('/?year=2023&month=2&start_date=2023-02-01&end_date=2023-02-28')

    fireEvent.click(screen.getByText('clear-month'))

    const search = screen.getByTestId('location-search').textContent ?? ''
    expect(getParam(search, 'year')).toBe('2023')
    expect(getParam(search, 'month')).toBeNull()
    expect(getParam(search, 'start_date')).toBe('2023-01-01')
    expect(getParam(search, 'end_date')).toBe('2023-12-31')
  })

  it('clears the month filter when a custom date range no longer matches a full month', () => {
    renderHarness('/?year=2023&month=2&start_date=2023-02-01&end_date=2023-02-28')

    fireEvent.click(screen.getByText('set-custom-range'))

    const search = screen.getByTestId('location-search').textContent ?? ''
    expect(getParam(search, 'month')).toBeNull()
    expect(getParam(search, 'start_date')).toBe('2023-05-10')
    expect(getParam(search, 'end_date')).toBe('2023-05-20')
    expect(screen.getByTestId('current-month')).toHaveTextContent('null')
  })

  it('normalizes Chinese primary_type query values into English codes', () => {
    renderHarness('/?primary_type=盗窃，殴打')
    expect(screen.getByTestId('current-primary-type')).toHaveTextContent('THEFT|BATTERY')
  })
})

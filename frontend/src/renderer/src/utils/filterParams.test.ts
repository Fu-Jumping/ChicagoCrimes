import { describe, expect, it } from 'vitest'
import { buildAnalyticsFilterParams } from './filterParams'

describe('buildAnalyticsFilterParams', () => {
  it('omits redundant full-year dates when a matching year filter is already present', () => {
    const params = buildAnalyticsFilterParams({
      year: 2023,
      month: null,
      primaryType: null,
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      district: null,
      beat: null,
      ward: null,
      communityArea: null,
      arrest: null,
      domestic: null
    })

    expect(params.year).toBe(2023)
    expect(params.start_date).toBeUndefined()
    expect(params.end_date).toBeUndefined()
  })

  it('preserves custom date ranges even when a year is selected', () => {
    const params = buildAnalyticsFilterParams({
      year: 2023,
      month: null,
      primaryType: null,
      startDate: '2023-03-01',
      endDate: '2023-08-31',
      district: null,
      beat: null,
      ward: null,
      communityArea: null,
      arrest: null,
      domestic: null
    })

    expect(params.start_date).toBe('2023-03-01')
    expect(params.end_date).toBe('2023-08-31')
  })
})

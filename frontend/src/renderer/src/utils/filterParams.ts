import type { GlobalFilters } from '../contexts/globalFiltersState'

const isRedundantFullYearRange = (filters: GlobalFilters): boolean => {
  if (filters.year === null || !filters.startDate || !filters.endDate) {
    return false
  }

  return (
    filters.startDate === `${filters.year}-01-01` && filters.endDate === `${filters.year}-12-31`
  )
}

export const buildAnalyticsFilterParams = (
  filters: GlobalFilters
): Record<string, string | number | boolean | undefined> => {
  const omitDateRange = isRedundantFullYearRange(filters)

  return {
    year: filters.year ?? undefined,
    month: filters.month ?? undefined,
    primary_type: filters.primaryType ?? undefined,
    start_date: omitDateRange ? undefined : (filters.startDate ?? undefined),
    end_date: omitDateRange ? undefined : (filters.endDate ?? undefined),
    district: filters.district ?? undefined,
    beat: filters.beat ?? undefined,
    ward: filters.ward ?? undefined,
    community_area: filters.communityArea ?? undefined,
    arrest: filters.arrest ?? undefined,
    domestic: filters.domestic ?? undefined
  }
}

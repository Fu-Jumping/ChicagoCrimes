import type { GlobalFilters } from '../contexts/globalFiltersState'
import { normalizeCrimeTypeValues } from './crimeTypeMap'

export const singleNumber = (v: number | number[] | null | undefined): number | null => {
  if (v === null || v === undefined) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export const isSingleNumber = (v: number | number[] | null | undefined): v is number =>
  typeof v === 'number'

export const singleString = (v: string | string[] | null | undefined): string | null => {
  if (v === null || v === undefined) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export const formatFilterValue = (
  v: string | number | boolean | string[] | number[] | boolean[] | null | undefined
): string => {
  if (v === null || v === undefined) return '未设置'
  if (Array.isArray(v)) return v.length === 0 ? '未设置' : v.join(', ')
  return String(v)
}

const isRedundantFullYearRange = (filters: GlobalFilters): boolean => {
  if (
    filters.year === null ||
    Array.isArray(filters.year) ||
    !filters.startDate ||
    !filters.endDate
  ) {
    return false
  }

  return (
    filters.startDate === `${filters.year}-01-01` && filters.endDate === `${filters.year}-12-31`
  )
}

export const buildAnalyticsFilterParams = (
  filters: GlobalFilters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> => {
  const omitDateRange = isRedundantFullYearRange(filters)
  const normalizedPrimaryType = filters.primaryType
    ? normalizeCrimeTypeValues(Array.isArray(filters.primaryType) ? filters.primaryType : [filters.primaryType])
    : []

  return {
    year: filters.year ?? undefined,
    month: filters.month ?? undefined,
    primary_type:
      normalizedPrimaryType.length === 0
        ? undefined
        : normalizedPrimaryType.length === 1
          ? normalizedPrimaryType[0]
          : normalizedPrimaryType,
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

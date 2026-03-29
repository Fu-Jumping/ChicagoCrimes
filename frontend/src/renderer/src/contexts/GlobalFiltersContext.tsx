import React, { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { normalizeCrimeTypeValues } from '../utils/crimeTypeMap'
import {
  GlobalFiltersContext,
  type GlobalFilters,
  type GlobalFiltersContextValue
} from './globalFiltersState'

const parsePositiveInteger = (value: string | null): number | null => {
  const normalized = value?.trim()
  if (!normalized || !/^\d+$/.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

const parsePositiveIntegerArray = (values: string[]): number | number[] | null => {
  if (values.length === 0) return null
  if (values.length === 1) return parsePositiveInteger(values[0])
  const parsed = values.map(parsePositiveInteger).filter((v): v is number => v !== null)
  if (parsed.length === 0) return null
  if (parsed.length === 1) return parsed[0]
  return parsed
}

const parseStringArray = (values: string[]): string | string[] | null => {
  if (values.length === 0) return null
  if (values.length === 1) return values[0].trim() || null
  const parsed = values.map((v) => v.trim()).filter((v) => v)
  if (parsed.length === 0) return null
  if (parsed.length === 1) return parsed[0]
  return parsed
}

const parseBooleanArray = (values: string[]): boolean | boolean[] | null => {
  if (values.length === 0) return null
  if (values.length === 1) {
    if (values[0] === 'true') return true
    if (values[0] === 'false') return false
    return null
  }
  const parsed = values
    .map((v) => (v === 'true' ? true : v === 'false' ? false : null))
    .filter((v): v is boolean => v !== null)
  if (parsed.length === 0) return null
  if (parsed.length === 1) return parsed[0]
  return parsed
}

const parseYear = (values: string[]): number | number[] | null => parsePositiveIntegerArray(values)

const parseMonth = (values: string[]): number | number[] | null => {
  const parsed = parsePositiveIntegerArray(values)
  if (Array.isArray(parsed)) {
    const valid = parsed.filter((p) => p >= 1 && p <= 12)
    return valid.length === 0 ? null : valid.length === 1 ? valid[0] : valid
  }
  return parsed !== null && parsed >= 1 && parsed <= 12 ? parsed : null
}

const parsePrimaryType = (values: string[]): string | string[] | null => {
  const normalized = normalizeCrimeTypeValues(values)
  if (normalized.length === 0) return null
  if (normalized.length === 1) return normalized[0]
  return normalized
}

const parseDistrict = (values: string[]): number | number[] | null =>
  parsePositiveIntegerArray(values)

const parseBeat = (values: string[]): string | string[] | null => parseStringArray(values)

const parseWard = (values: string[]): number | number[] | null => parsePositiveIntegerArray(values)

const parseCommunityArea = (values: string[]): number | number[] | null =>
  parsePositiveIntegerArray(values)

const parseArrest = (values: string[]): boolean | boolean[] | null => parseBooleanArray(values)

const parseDomestic = (values: string[]): boolean | boolean[] | null => parseBooleanArray(values)

const isValidDateStr = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

const parseDateStr = (value: string | null): string | null => {
  const normalized = value?.trim()
  if (!normalized) return null
  return isValidDateStr(normalized) ? normalized : null
}

const pad = (value: number): string => String(value).padStart(2, '0')

const buildDateRangeForYearMonth = (
  year: number | number[] | null,
  month: number | number[] | null
): { startDate: string | null; endDate: string | null } => {
  if (year === null || Array.isArray(year) || Array.isArray(month)) {
    return { startDate: null, endDate: null }
  }

  if (month === null) {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  return {
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(daysInMonth)}`
  }
}

const normalizeDateRangeOrder = (
  startDate: string,
  endDate: string
): { startDate: string; endDate: string } =>
  startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate }

const isSameDateRange = (
  leftStart: string | null,
  leftEnd: string | null,
  rightStart: string | null,
  rightEnd: string | null
): boolean => leftStart === rightStart && leftEnd === rightEnd

const inferMonthFromDateRange = (
  year: number | null,
  startDate: string | null,
  endDate: string | null
): number | null => {
  if (year === null || !startDate || !endDate) {
    return null
  }

  for (let month = 1; month <= 12; month += 1) {
    const range = buildDateRangeForYearMonth(year, month)
    if (range.startDate === startDate && range.endDate === endDate) {
      return month
    }
  }

  return null
}

const analyzeDateRange = (
  startDate: string,
  endDate: string
): {
  startDate: string
  endDate: string
  sameYear: boolean
  year: number | null
  fullMonth: number | null
  fullYear: boolean
} => {
  const ordered = normalizeDateRangeOrder(startDate, endDate)
  const startYear = Number(ordered.startDate.slice(0, 4))
  const endYear = Number(ordered.endDate.slice(0, 4))
  const sameYear = startYear === endYear
  const year = sameYear ? startYear : null
  const fullMonth = sameYear
    ? inferMonthFromDateRange(startYear, ordered.startDate, ordered.endDate)
    : null
  const fullYear =
    sameYear &&
    ordered.startDate === `${startYear}-01-01` &&
    ordered.endDate === `${startYear}-12-31`

  return {
    ...ordered,
    sameYear,
    year,
    fullMonth,
    fullYear
  }
}

const isSelectorDerivedDateRange = (
  filters: Pick<GlobalFilters, 'year' | 'month' | 'startDate' | 'endDate'>
): boolean => {
  if (
    filters.year === null ||
    Array.isArray(filters.year) ||
    Array.isArray(filters.month) ||
    !filters.startDate ||
    !filters.endDate
  ) {
    return false
  }

  const derivedRange = buildDateRangeForYearMonth(filters.year, filters.month)
  return isSameDateRange(
    filters.startDate,
    filters.endDate,
    derivedRange.startDate,
    derivedRange.endDate
  )
}

const normalizeTimeFilters = (filters: GlobalFilters): GlobalFilters => {
  if (Array.isArray(filters.year) || Array.isArray(filters.month)) {
    return filters
  }

  let startDate = filters.startDate
  let endDate = filters.endDate

  if ((startDate && !endDate) || (!startDate && endDate)) {
    startDate = null
    endDate = null
  }

  if (startDate && endDate) {
    const ordered = normalizeDateRangeOrder(startDate, endDate)
    startDate = ordered.startDate
    endDate = ordered.endDate
  }

  if (!startDate || !endDate) {
    if (filters.year !== null && !Array.isArray(filters.year) && !Array.isArray(filters.month)) {
      const range = buildDateRangeForYearMonth(filters.year, filters.month)
      return {
        ...filters,
        startDate: range.startDate,
        endDate: range.endDate
      }
    }

    return {
      ...filters,
      startDate: null,
      endDate: null
    }
  }

  const rangeInfo = analyzeDateRange(startDate, endDate)

  if (!rangeInfo.sameYear) {
    return {
      ...filters,
      year: null,
      month: null,
      startDate: rangeInfo.startDate,
      endDate: rangeInfo.endDate
    }
  }

  if (filters.year !== null && !Array.isArray(filters.year)) {
    return {
      ...filters,
      year: rangeInfo.year,
      month: rangeInfo.fullMonth,
      startDate: rangeInfo.startDate,
      endDate: rangeInfo.endDate
    }
  }

  if (filters.month !== null && !Array.isArray(filters.month)) {
    if (rangeInfo.fullMonth !== null) {
      return {
        ...filters,
        year: rangeInfo.year,
        month: rangeInfo.fullMonth,
        startDate: rangeInfo.startDate,
        endDate: rangeInfo.endDate
      }
    }

    if (rangeInfo.fullYear) {
      return {
        ...filters,
        year: rangeInfo.year,
        month: null,
        startDate: rangeInfo.startDate,
        endDate: rangeInfo.endDate
      }
    }

    return {
      ...filters,
      year: null,
      month: null,
      startDate: rangeInfo.startDate,
      endDate: rangeInfo.endDate
    }
  }

  if (rangeInfo.fullMonth !== null) {
    return {
      ...filters,
      year: rangeInfo.year,
      month: rangeInfo.fullMonth,
      startDate: rangeInfo.startDate,
      endDate: rangeInfo.endDate
    }
  }

  if (rangeInfo.fullYear) {
    return {
      ...filters,
      year: rangeInfo.year,
      month: null,
      startDate: rangeInfo.startDate,
      endDate: rangeInfo.endDate
    }
  }

  return {
    ...filters,
    year: null,
    month: null,
    startDate: rangeInfo.startDate,
    endDate: rangeInfo.endDate
  }
}

export const GlobalFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isMultiSelect, setIsMultiSelect] = React.useState(false)

  const rawFilters = useMemo<GlobalFilters>(
    () => ({
      year: parseYear(searchParams.getAll('year')),
      month: parseMonth(searchParams.getAll('month')),
      primaryType: parsePrimaryType(searchParams.getAll('primary_type')),
      startDate: parseDateStr(searchParams.get('start_date')),
      endDate: parseDateStr(searchParams.get('end_date')),
      district: parseDistrict(searchParams.getAll('district')),
      beat: parseBeat(searchParams.getAll('beat')),
      ward: parseWard(searchParams.getAll('ward')),
      communityArea: parseCommunityArea(searchParams.getAll('community_area')),
      arrest: parseArrest(searchParams.getAll('arrest')),
      domestic: parseDomestic(searchParams.getAll('domestic'))
    }),
    [searchParams]
  )

  const filters = useMemo<GlobalFilters>(() => normalizeTimeFilters(rawFilters), [rawFilters])

  const updateSearchParams = useCallback(
    (nextFilters: Partial<GlobalFilters>) => {
      const nextParams = new URLSearchParams(searchParams)

      const apply = (key: string, current: any, incoming: any): void => {
        const value = incoming === undefined ? current : incoming
        nextParams.delete(key)
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => nextParams.append(key, String(v)))
          } else {
            nextParams.set(key, String(value))
          }
        }
      }

      apply('year', filters.year, nextFilters.year)
      apply('month', filters.month, nextFilters.month)
      apply('primary_type', filters.primaryType, nextFilters.primaryType)
      apply('start_date', filters.startDate, nextFilters.startDate)
      apply('end_date', filters.endDate, nextFilters.endDate)
      apply('district', filters.district, nextFilters.district)
      apply('beat', filters.beat, nextFilters.beat)
      apply('ward', filters.ward, nextFilters.ward)
      apply('community_area', filters.communityArea, nextFilters.communityArea)
      apply('arrest', filters.arrest, nextFilters.arrest)
      apply('domestic', filters.domestic, nextFilters.domestic)

      setSearchParams(nextParams, { replace: true })
    },
    [filters, searchParams, setSearchParams]
  )

  const setYear = useCallback(
    (year: number | number[] | null) => {
      if (Array.isArray(year)) {
        updateSearchParams({
          year,
          startDate: null,
          endDate: null
        })
        return
      }

      if (year === null) {
        if (
          filters.year === null ||
          !filters.startDate ||
          !filters.endDate ||
          isSelectorDerivedDateRange(filters)
        ) {
          updateSearchParams({
            year: null,
            startDate: null,
            endDate: null
          })
          return
        }

        const rangeInfo = analyzeDateRange(filters.startDate, filters.endDate)
        updateSearchParams({
          year: null,
          month: null,
          startDate: rangeInfo.startDate,
          endDate: rangeInfo.endDate
        })
        return
      }

      const range = buildDateRangeForYearMonth(year, filters.month)
      updateSearchParams({
        year,
        startDate: range.startDate,
        endDate: range.endDate
      })
    },
    [filters, updateSearchParams]
  )

  const setMonth = useCallback(
    (month: number | number[] | null) => {
      if (Array.isArray(month)) {
        updateSearchParams({
          month,
          startDate: null,
          endDate: null
        })
        return
      }

      if (filters.year !== null && !Array.isArray(filters.year)) {
        const range = buildDateRangeForYearMonth(filters.year, month)
        updateSearchParams({
          month,
          startDate: range.startDate,
          endDate: range.endDate
        })
        return
      }

      if (month !== null) {
        updateSearchParams({
          month,
          startDate: null,
          endDate: null
        })
        return
      }

      updateSearchParams({ month: null })
    },
    [filters.year, updateSearchParams]
  )

  const setPrimaryType = useCallback(
    (primaryType: string | string[] | null) =>
      updateSearchParams({
        primaryType: Array.isArray(primaryType)
          ? primaryType
          : parsePrimaryType([primaryType || ''])
      }),
    [updateSearchParams]
  )

  const setDateRange = useCallback(
    (startDate: string | null, endDate: string | null) => {
      if (!startDate || !endDate) {
        if (filters.year !== null) {
          const range = buildDateRangeForYearMonth(filters.year, filters.month)
          updateSearchParams({
            startDate: range.startDate,
            endDate: range.endDate
          })
          return
        }

        updateSearchParams({
          startDate: null,
          endDate: null
        })
        return
      }

      const rangeInfo = analyzeDateRange(startDate, endDate)

      if (!rangeInfo.sameYear) {
        updateSearchParams({
          year: null,
          month: null,
          startDate: rangeInfo.startDate,
          endDate: rangeInfo.endDate
        })
        return
      }

      const shouldSyncSelectors =
        filters.year !== null ||
        filters.month !== null ||
        rangeInfo.fullYear ||
        rangeInfo.fullMonth !== null

      updateSearchParams({
        year: shouldSyncSelectors ? rangeInfo.year : null,
        month: shouldSyncSelectors ? rangeInfo.fullMonth : null,
        startDate: rangeInfo.startDate,
        endDate: rangeInfo.endDate
      })
    },
    [filters.month, filters.year, updateSearchParams]
  )

  const setDistrict = useCallback(
    (district: number | number[] | null) => updateSearchParams({ district }),
    [updateSearchParams]
  )

  const setBeat = useCallback(
    (beat: string | string[] | null) =>
      updateSearchParams({ beat: Array.isArray(beat) ? beat : parseBeat([beat || '']) }),
    [updateSearchParams]
  )

  const setWard = useCallback(
    (ward: number | number[] | null) => updateSearchParams({ ward }),
    [updateSearchParams]
  )

  const setCommunityArea = useCallback(
    (communityArea: number | number[] | null) => updateSearchParams({ communityArea }),
    [updateSearchParams]
  )

  const setArrest = useCallback(
    (arrest: boolean | boolean[] | null) => updateSearchParams({ arrest }),
    [updateSearchParams]
  )

  const setDomestic = useCallback(
    (domestic: boolean | boolean[] | null) => updateSearchParams({ domestic }),
    [updateSearchParams]
  )

  const clearFilters = useCallback(() => {
    updateSearchParams({
      year: null,
      month: null,
      primaryType: null,
      startDate: null,
      endDate: null,
      district: null,
      beat: null,
      ward: null,
      communityArea: null,
      arrest: null,
      domestic: null
    })
  }, [updateSearchParams])

  const value = useMemo<GlobalFiltersContextValue>(
    () => ({
      filters,
      setYear,
      setMonth,
      setPrimaryType,
      setDateRange,
      setDistrict,
      setBeat,
      setWard,
      setCommunityArea,
      setArrest,
      setDomestic,
      clearFilters,
      hasActiveFilters:
        filters.year !== null ||
        filters.month !== null ||
        filters.primaryType !== null ||
        filters.startDate !== null ||
        filters.endDate !== null ||
        filters.district !== null ||
        filters.beat !== null ||
        filters.ward !== null ||
        filters.communityArea !== null ||
        filters.arrest !== null ||
        filters.domestic !== null,
      isMultiSelect,
      setIsMultiSelect
    }),
    [
      clearFilters,
      filters,
      setArrest,
      setBeat,
      setCommunityArea,
      setDateRange,
      setDistrict,
      setDomestic,
      setMonth,
      setPrimaryType,
      setWard,
      setYear,
      isMultiSelect,
      setIsMultiSelect
    ]
  )

  return <GlobalFiltersContext.Provider value={value}>{children}</GlobalFiltersContext.Provider>
}

import React, { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
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

const parseYear = (value: string | null): number | null => parsePositiveInteger(value)

const parseMonth = (value: string | null): number | null => {
  const parsed = parsePositiveInteger(value)
  return parsed !== null && parsed >= 1 && parsed <= 12 ? parsed : null
}

const parsePrimaryType = (value: string | null): string | null => {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

const parseDistrict = (value: string | null): number | null => {
  return parsePositiveInteger(value)
}

const parseBeat = (value: string | null): string | null => {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

const parseWard = (value: string | null): number | null => {
  return parsePositiveInteger(value)
}

const parseCommunityArea = (value: string | null): number | null => {
  return parsePositiveInteger(value)
}

const parseArrest = (value: string | null): boolean | null => {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

const parseDomestic = (value: string | null): boolean | null => {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

const isValidDateStr = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const parseDateStr = (value: string | null): string | null => {
  const normalized = value?.trim()
  if (!normalized) return null
  return isValidDateStr(normalized) ? normalized : null
}

const pad = (value: number): string => String(value).padStart(2, '0')

const buildDateRangeForYearMonth = (
  year: number | null,
  month: number | null
): { startDate: string | null; endDate: string | null } => {
  if (year === null) {
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
  const fullMonth = sameYear ? inferMonthFromDateRange(startYear, ordered.startDate, ordered.endDate) : null
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
  if (filters.year === null || !filters.startDate || !filters.endDate) {
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
    if (filters.year !== null) {
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

  if (filters.year !== null) {
    return {
      ...filters,
      year: rangeInfo.year,
      month: rangeInfo.fullMonth,
      startDate: rangeInfo.startDate,
      endDate: rangeInfo.endDate
    }
  }

  if (filters.month !== null) {
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

  const rawFilters = useMemo<GlobalFilters>(
    () => ({
      year: parseYear(searchParams.get('year')),
      month: parseMonth(searchParams.get('month')),
      primaryType: parsePrimaryType(searchParams.get('primary_type')),
      startDate: parseDateStr(searchParams.get('start_date')),
      endDate: parseDateStr(searchParams.get('end_date')),
      district: parseDistrict(searchParams.get('district')),
      beat: parseBeat(searchParams.get('beat')),
      ward: parseWard(searchParams.get('ward')),
      communityArea: parseCommunityArea(searchParams.get('community_area')),
      arrest: parseArrest(searchParams.get('arrest')),
      domestic: parseDomestic(searchParams.get('domestic'))
    }),
    [searchParams]
  )

  const filters = useMemo<GlobalFilters>(() => normalizeTimeFilters(rawFilters), [rawFilters])

  const updateSearchParams = useCallback(
    (nextFilters: Partial<GlobalFilters>) => {
      const nextParams = new URLSearchParams(searchParams)

      const apply = (
        key: string,
        current: string | number | boolean | null | undefined,
        incoming: string | number | boolean | null | undefined
      ): void => {
        const value = incoming === undefined ? current : incoming
        if (value === null || value === undefined) {
          nextParams.delete(key)
        } else {
          nextParams.set(key, String(value))
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
    (year: number | null) => {
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
    (month: number | null) => {
      if (filters.year !== null) {
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
    (primaryType: string | null) =>
      updateSearchParams({ primaryType: parsePrimaryType(primaryType) }),
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
    (district: number | null) => updateSearchParams({ district }),
    [updateSearchParams]
  )

  const setBeat = useCallback(
    (beat: string | null) => updateSearchParams({ beat: parseBeat(beat) }),
    [updateSearchParams]
  )

  const setWard = useCallback(
    (ward: number | null) => updateSearchParams({ ward }),
    [updateSearchParams]
  )

  const setCommunityArea = useCallback(
    (communityArea: number | null) => updateSearchParams({ communityArea }),
    [updateSearchParams]
  )

  const setArrest = useCallback(
    (arrest: boolean | null) => updateSearchParams({ arrest }),
    [updateSearchParams]
  )

  const setDomestic = useCallback(
    (domestic: boolean | null) => updateSearchParams({ domestic }),
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
        filters.domestic !== null
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
      setYear
    ]
  )

  return <GlobalFiltersContext.Provider value={value}>{children}</GlobalFiltersContext.Provider>
}

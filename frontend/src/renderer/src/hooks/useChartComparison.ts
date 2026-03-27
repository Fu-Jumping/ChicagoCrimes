import { useState, useEffect, useCallback, useRef } from 'react'
import * as d3 from 'd3'
import type { ChartSeries } from '../components/charts/BarChart'
import type { NormalizedChartResult } from '../utils/chartData'
import { normalizeSeriesData } from '../utils/chartData'

const PALETTE = d3.schemeTableau10
const EMPTY_MAP = new Map<number, NormalizedChartResult>()

export interface ComparisonConfig {
  fetchFn: (year: number) => Promise<{ data: Record<string, unknown>[] }>
  xField: string
  yField: string
  fallbackLabel: string
  labelTranslator?: (raw: string) => string
}

export interface UseChartComparisonReturn {
  comparisonYears: number[]
  setComparisonYears: (years: number[]) => void
  series: ChartSeries[]
  loading: boolean
}

export function useChartComparison(config: ComparisonConfig): UseChartComparisonReturn {
  const [comparisonYears, setComparisonYears] = useState<number[]>([])
  const [seriesResults, setSeriesResults] = useState<Map<number, NormalizedChartResult>>(EMPTY_MAP)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef(0)

  const fetchFnRef = useRef(config.fetchFn)
  fetchFnRef.current = config.fetchFn

  const xFieldRef = useRef(config.xField)
  xFieldRef.current = config.xField
  const yFieldRef = useRef(config.yField)
  yFieldRef.current = config.yField
  const fallbackLabelRef = useRef(config.fallbackLabel)
  fallbackLabelRef.current = config.fallbackLabel

  const fetchComparisons = useCallback(async (years: number[]) => {
    if (years.length === 0) {
      setSeriesResults((prev) => (prev.size === 0 ? prev : EMPTY_MAP))
      return
    }

    const token = ++abortRef.current
    setLoading(true)

    try {
      const results = await Promise.allSettled(years.map((year) => fetchFnRef.current(year)))
      if (abortRef.current !== token) return

      const nextMap = new Map<number, NormalizedChartResult>()
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          nextMap.set(
            years[idx],
            normalizeSeriesData(
              result.value.data,
              xFieldRef.current,
              yFieldRef.current,
              fallbackLabelRef.current
            )
          )
        }
      })
      setSeriesResults(nextMap)
    } finally {
      if (abortRef.current === token) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchComparisons(comparisonYears)
  }, [comparisonYears, fetchComparisons])

  const series: ChartSeries[] = comparisonYears
    .filter((year) => seriesResults.has(year))
    .map((year, idx) => ({
      data: seriesResults.get(year)!.data,
      label: `${year} 年`,
      color: PALETTE[idx % PALETTE.length]
    }))

  return { comparisonYears, setComparisonYears, series, loading }
}

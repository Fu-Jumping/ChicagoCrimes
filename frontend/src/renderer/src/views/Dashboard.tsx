import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Row, Col } from 'antd'
import { analyticsApi, type NormalizedApiError } from '../api'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import PieChart from '../components/charts/PieChart'
import DataStatePanel from '../components/DataStatePanel'
import AnalysisPageShell from '../components/AnalysisPageShell'
import ComparisonSelect from '../components/ComparisonSelect'
import InsightCard from '../components/InsightCard'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { useChartComparison } from '../hooks/useChartComparison'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { t } from '../i18n'
import { dimensionLabelMap } from '../components/AppLayout'
import type { ChartInteractionEvent } from '../types/chartEvents'
import {
  normalizeSeriesData,
  type GenericRow,
  type NormalizedChartResult
} from '../utils/chartData'
import { translateCrimeType } from '../utils/crimeTypeMap'
import { buildAnalyticsFilterParams, singleNumber, formatFilterValue } from '../utils/filterParams'

interface ChartState {
  loading: boolean
  error: NormalizedApiError | null
  result: NormalizedChartResult
}

const createChartState = (): ChartState => ({
  loading: true,
  error: null,
  result: { data: [], downgradedCount: 0 }
})

const Dashboard: React.FC = () => {
  const { filters } = useGlobalFilters()
  const [trendState, setTrendState] = useState<ChartState>(createChartState())
  const [typeState, setTypeState] = useState<ChartState>(createChartState())
  const [districtState, setDistrictState] = useState<ChartState>(createChartState())
  const [activeDistrict, setActiveDistrict] = useState<string | null>(null)
  const [lastChartEvent, setLastChartEvent] = useState<ChartInteractionEvent | null>(null)

  const hasYearFilter = filters.year !== null
  const requestParams = useMemo(() => buildAnalyticsFilterParams(filters), [filters])
  const debouncedRequestParams = useDebouncedValue(requestParams, 160)
  const debouncedYear = singleNumber(debouncedRequestParams.year as number | number[] | null)

  const trendComparison = useChartComparison({
    fetchFn: (year) =>
      hasYearFilter
        ? analyticsApi.getMonthlyTrend({
            ...debouncedRequestParams,
            year
          })
        : analyticsApi.getYearlyTrend({
            ...debouncedRequestParams,
            start_year: year,
            end_year: year
          }),
    xField: hasYearFilter ? 'month' : 'year',
    yField: 'count',
    fallbackLabel: hasYearFilter ? t('common.unknownMonth') : t('common.unknownYear')
  })

  const districtComparison = useChartComparison({
    fetchFn: (year) =>
      analyticsApi.getDistrictsComparison({
        ...debouncedRequestParams,
        year,
        limit: 10
      }),
    xField: 'district',
    yField: 'count',
    fallbackLabel: t('common.unknownDistrict')
  })

  const fetchData = useCallback(async (): Promise<void> => {
    setTrendState((prev) => ({ ...prev, loading: true, error: null }))
    setTypeState((prev) => ({ ...prev, loading: true, error: null }))
    setDistrictState((prev) => ({ ...prev, loading: true, error: null }))

    const trendPromise = hasYearFilter
      ? analyticsApi.getMonthlyTrend({
          ...debouncedRequestParams,
          year: debouncedYear || 2022
        })
      : analyticsApi.getYearlyTrend(debouncedRequestParams)

    const [trendResult, typeResult, districtResult] = await Promise.allSettled([
      trendPromise,
      analyticsApi.getTypesProportion({
        ...debouncedRequestParams,
        limit: 5
      }),
      analyticsApi.getDistrictsComparison({
        ...debouncedRequestParams,
        limit: 10
      })
    ])

    if (trendResult.status === 'fulfilled') {
      const xField = hasYearFilter ? 'month' : 'year'
      const fallbackLabel = hasYearFilter ? t('common.unknownMonth') : t('common.unknownYear')
      const normalized = normalizeSeriesData(
        trendResult.value.data as GenericRow[],
        xField,
        'count',
        fallbackLabel
      )
      setTrendState({ loading: false, error: null, result: normalized })
    } else {
      setTrendState({
        loading: false,
        error: trendResult.reason as NormalizedApiError,
        result: { data: [], downgradedCount: 0 }
      })
    }

    if (typeResult.status === 'fulfilled') {
      const normalized = normalizeSeriesData(
        typeResult.value.data as GenericRow[],
        'primary_type',
        'count',
        t('common.unknownType')
      )
      setTypeState({ loading: false, error: null, result: normalized })
    } else {
      setTypeState({
        loading: false,
        error: typeResult.reason as NormalizedApiError,
        result: { data: [], downgradedCount: 0 }
      })
    }

    if (districtResult.status === 'fulfilled') {
      const normalized = normalizeSeriesData(
        districtResult.value.data as GenericRow[],
        'district',
        'count',
        t('common.unknownDistrict')
      )
      setDistrictState({ loading: false, error: null, result: normalized })
    } else {
      setDistrictState({
        loading: false,
        error: districtResult.reason as NormalizedApiError,
        result: { data: [], downgradedCount: 0 }
      })
    }
  }, [debouncedRequestParams, debouncedYear, hasYearFilter])

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      if (cancelled) {
        return
      }
      await fetchData()
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [fetchData])

  const handleChartEvent = (event: ChartInteractionEvent): void => {
    setLastChartEvent(event)
    if (event.dimension === 'district') {
      if (event.action === 'clear') {
        setActiveDistrict(null)
        return
      }
      const values = Array.isArray(event.value) ? event.value : [event.value]
      const district = String(values[0] ?? '').trim()
      setActiveDistrict(district || null)
    }
  }

  const dimensionLabel = lastChartEvent
    ? (dimensionLabelMap[lastChartEvent.dimension] ?? lastChartEvent.dimension)
    : ''
  const rawEventValue = lastChartEvent
    ? Array.isArray(lastChartEvent.value)
      ? lastChartEvent.value.join(', ')
      : String(lastChartEvent.value)
    : ''
  const eventValue =
    lastChartEvent?.dimension === 'primary_type' ? translateCrimeType(rawEventValue) : rawEventValue

  const translatedType = filters.primaryType
    ? Array.isArray(filters.primaryType)
      ? filters.primaryType.map(translateCrimeType).join(', ')
      : translateCrimeType(filters.primaryType)
    : ''
  const yearDisplay = formatFilterValue(filters.year)
  const trendCardTitle = hasYearFilter
    ? `${yearDisplay} 年月度趋势 ${translatedType ? `// ${translatedType}` : ''}`
    : `${t('pages.dashboard.yearlyCard')} ${translatedType ? `// ${translatedType}` : ''}`

  const trendXField = hasYearFilter ? 'month' : 'year'
  const trendChartId = hasYearFilter ? 'dashboard-monthly-trend' : 'dashboard-yearly-trend'

  const buildSeriesWithCurrent = (
    currentData: Record<string, unknown>[],
    comparisonSeries: { data: Record<string, unknown>[]; label: string; color: string }[],
    currentYear: number | null
  ): { data: Record<string, unknown>[]; label: string; color: string }[] | undefined => {
    if (comparisonSeries.length === 0) return undefined
    const currentLabel = currentYear ? `${currentYear} 年（当前）` : '当前'
    return [{ data: currentData, label: currentLabel, color: '#1677ff' }, ...comparisonSeries]
  }

  return (
    <AnalysisPageShell
      variant="dashboard"
      systemTag="城市态势总览 // 综合分析页"
      title="综合总览"
      subtitle="从时间趋势、类型结构和空间分布三个视角快速建立芝加哥犯罪态势的整体认知。"
      eventStatus={
        lastChartEvent
          ? t('pages.dashboard.eventStatusDesc', {
              dimension: dimensionLabel,
              value: eventValue
            })
          : undefined
      }
      eventStatusTitle={lastChartEvent ? t('pages.dashboard.eventStatusTitle') : undefined}
      debugTitle={t('debug.title')}
      debugPathPrefixes={[
        '/analytics/trend/yearly',
        '/analytics/trend/monthly',
        '/analytics/types/proportion',
        '/analytics/districts/comparison'
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <InsightCard
            eyebrow="趋势模块"
            title={trendCardTitle}
            description="按当前筛选条件观察案件量变化，并支持年度对比。"
            extra={
              <ComparisonSelect
                value={trendComparison.comparisonYears}
                onChange={trendComparison.setComparisonYears}
                excludeYear={filters.year}
              />
            }
          >
            <DataStatePanel
              loading={trendState.loading}
              error={trendState.error}
              isEmpty={trendState.result.data.length === 0}
              downgradedCount={trendState.result.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <LineChart
                chartId={trendChartId}
                data={trendState.result.data}
                xField={trendXField}
                yField="count"
                yFieldLabel="案件数量"
                height={300}
                series={buildSeriesWithCurrent(
                  trendState.result.data,
                  trendComparison.series,
                  singleNumber(filters.year)
                )}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="类型结构"
            title={t('pages.dashboard.typeCard')}
            description="聚焦当前筛选下案件类型的头部构成。"
          >
            <DataStatePanel
              loading={typeState.loading}
              error={typeState.error}
              isEmpty={typeState.result.data.length === 0}
              downgradedCount={typeState.result.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <PieChart
                chartId="dashboard-type-proportion"
                data={typeState.result.data}
                labelField="primary_type"
                valueField="count"
                height={300}
                labelTranslator={translateCrimeType}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="空间分布"
            title={t('pages.dashboard.districtCard')}
            description="对比分区案件量，并联动高亮当前聚焦区域。"
            extra={
              <ComparisonSelect
                value={districtComparison.comparisonYears}
                onChange={districtComparison.setComparisonYears}
                excludeYear={filters.year}
              />
            }
          >
            <DataStatePanel
              loading={districtState.loading}
              error={districtState.error}
              isEmpty={districtState.result.data.length === 0}
              downgradedCount={districtState.result.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart
                chartId="dashboard-district-comparison"
                data={districtState.result.data}
                xField="district"
                yField="count"
                yFieldLabel="案件数量"
                height={300}
                activeValue={activeDistrict}
                onDataPointClick={handleChartEvent}
                series={buildSeriesWithCurrent(
                  districtState.result.data,
                  districtComparison.series,
                  singleNumber(filters.year)
                )}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
      </Row>
    </AnalysisPageShell>
  )
}

export default Dashboard

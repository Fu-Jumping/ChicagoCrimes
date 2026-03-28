import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Row, Col } from 'antd'
import { analyticsApi, type NormalizedApiError } from '../api'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import DataStatePanel from '../components/DataStatePanel'
import AnalysisPageShell from '../components/AnalysisPageShell'
import ComparisonSelect from '../components/ComparisonSelect'
import InsightCard from '../components/InsightCard'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { useChartComparison } from '../hooks/useChartComparison'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { t } from '../i18n'
import { normalizeSeriesData, type NormalizedChartResult } from '../utils/chartData'
import { buildAnalyticsFilterParams, singleNumber } from '../utils/filterParams'

const TrendAnalysis: React.FC = () => {
  const { filters } = useGlobalFilters()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<NormalizedApiError | null>(null)
  const [monthlyResult, setMonthlyResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [weeklyResult, setWeeklyResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [hourlyResult, setHourlyResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const requestParams = useMemo(() => buildAnalyticsFilterParams(filters), [filters])
  const debouncedRequestParams = useDebouncedValue(requestParams, 160)
  const debouncedYear = singleNumber(debouncedRequestParams.year as number | number[] | null)

  const monthlyComparison = useChartComparison({
    fetchFn: (year) =>
      analyticsApi.getMonthlyTrend({
        ...debouncedRequestParams,
        year
      }),
    xField: 'month',
    yField: 'count',
    fallbackLabel: t('common.unknownMonth')
  })

  const weeklyComparison = useChartComparison({
    fetchFn: (year) =>
      analyticsApi.getWeeklyTrend({
        ...debouncedRequestParams,
        year
      }),
    xField: 'day_of_week',
    yField: 'count',
    fallbackLabel: t('common.unknownWeekday')
  })

  const hourlyComparison = useChartComparison({
    fetchFn: (year) =>
      analyticsApi.getHourlyTrend({
        ...debouncedRequestParams,
        year
      }),
    xField: 'hour',
    yField: 'count',
    fallbackLabel: t('common.unknownHour')
  })

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [monthlyRes, weeklyRes, hourlyRes] = await Promise.all([
        analyticsApi.getMonthlyTrend({
          ...debouncedRequestParams,
          year: debouncedYear || 2022
        }),
        analyticsApi.getWeeklyTrend({
          ...debouncedRequestParams
        }),
        analyticsApi.getHourlyTrend({
          ...debouncedRequestParams
        })
      ])

      setMonthlyResult(
        normalizeSeriesData(monthlyRes.data, 'month', 'count', t('common.unknownMonth'))
      )
      setWeeklyResult(
        normalizeSeriesData(weeklyRes.data, 'day_of_week', 'count', t('common.unknownWeekday'))
      )
      setHourlyResult(normalizeSeriesData(hourlyRes.data, 'hour', 'count', t('common.unknownHour')))
    } catch (requestError) {
      setError(requestError as NormalizedApiError)
      setMonthlyResult({ data: [], downgradedCount: 0 })
      setWeeklyResult({ data: [], downgradedCount: 0 })
      setHourlyResult({ data: [], downgradedCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [debouncedRequestParams, debouncedYear])

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
      variant="trend"
      systemTag="时间序列分析 // 月度 · 周内 · 小时"
      title="趋势分析"
      subtitle="围绕月度、周内和小时三个时间颗粒度识别犯罪高峰与变化节奏。"
      debugTitle={t('debug.title')}
      debugPathPrefixes={[
        '/analytics/trend/monthly',
        '/analytics/trend/weekly',
        '/analytics/trend/hourly'
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <InsightCard
            eyebrow="月度趋势"
            title={t('pages.trend.monthlyCard')}
            description="观察月份级别的案件起伏，并支持跨年份对比。"
            extra={
              <ComparisonSelect
                value={monthlyComparison.comparisonYears}
                onChange={monthlyComparison.setComparisonYears}
                excludeYear={filters.year}
              />
            }
          >
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={monthlyResult.data.length === 0}
              downgradedCount={monthlyResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <LineChart
                data={monthlyResult.data}
                xField="month"
                yField="count"
                yFieldLabel="案件数量"
                height={300}
                series={buildSeriesWithCurrent(
                  monthlyResult.data,
                  monthlyComparison.series,
                  singleNumber(filters.year) || 2022
                )}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="周内分布"
            title={t('pages.trend.weeklyCard')}
            description="对比一周内不同工作日与周末的案件压力。"
            extra={
              <ComparisonSelect
                value={weeklyComparison.comparisonYears}
                onChange={weeklyComparison.setComparisonYears}
                excludeYear={filters.year}
              />
            }
          >
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={weeklyResult.data.length === 0}
              downgradedCount={weeklyResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart
                data={weeklyResult.data}
                xField="day_of_week"
                yField="count"
                yFieldLabel="案件数量"
                height={300}
                series={buildSeriesWithCurrent(
                  weeklyResult.data,
                  weeklyComparison.series,
                  singleNumber(filters.year)
                )}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="小时分布"
            title={t('pages.trend.hourlyCard')}
            description="定位一天中案件更高发的时间段。"
            extra={
              <ComparisonSelect
                value={hourlyComparison.comparisonYears}
                onChange={hourlyComparison.setComparisonYears}
                excludeYear={filters.year}
              />
            }
          >
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={hourlyResult.data.length === 0}
              downgradedCount={hourlyResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <LineChart
                data={hourlyResult.data}
                xField="hour"
                yField="count"
                yFieldLabel="案件数量"
                height={300}
                series={buildSeriesWithCurrent(
                  hourlyResult.data,
                  hourlyComparison.series,
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

export default TrendAnalysis

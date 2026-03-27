import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Row, Col } from 'antd'
import { analyticsApi, type NormalizedApiError } from '../api'
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
import { translateLocationType } from '../utils/locationTypeMap'
import { buildAnalyticsFilterParams } from '../utils/filterParams'

const DistrictAnalysis: React.FC = () => {
  const { filters } = useGlobalFilters()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<NormalizedApiError | null>(null)
  const [districtResult, setDistrictResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [locationResult, setLocationResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const requestParams = useMemo(() => buildAnalyticsFilterParams(filters), [filters])
  const debouncedRequestParams = useDebouncedValue(requestParams, 160)

  const districtComparison = useChartComparison({
    fetchFn: (year) =>
      analyticsApi.getDistrictsComparison({
        ...debouncedRequestParams,
        year,
        limit: 20
      }),
    xField: 'district',
    yField: 'count',
    fallbackLabel: t('common.unknownDistrict')
  })

  const locationComparison = useChartComparison({
    fetchFn: (year) =>
      analyticsApi.getLocationTypes({
        ...debouncedRequestParams,
        year,
        limit: 15
      }),
    xField: 'location_description',
    yField: 'count',
    fallbackLabel: t('common.unknownLocation')
  })

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [districtRes, locationRes] = await Promise.all([
        analyticsApi.getDistrictsComparison({
          ...debouncedRequestParams,
          limit: 20,
        }),
        analyticsApi.getLocationTypes({
          ...debouncedRequestParams,
          limit: 15,
        })
      ])

      setDistrictResult(
        normalizeSeriesData(districtRes.data, 'district', 'count', t('common.unknownDistrict'))
      )
      setLocationResult(
        normalizeSeriesData(
          locationRes.data,
          'location_description',
          'count',
          t('common.unknownLocation')
        )
      )
    } catch (requestError) {
      setError(requestError as NormalizedApiError)
      setDistrictResult({ data: [], downgradedCount: 0 })
      setLocationResult({ data: [], downgradedCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [
    debouncedRequestParams,
  ])

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
      variant="district"
      systemTag="空间范围分析 // 分区对比 · 地点类型"
      title="区域分析"
      subtitle="从分区总量和高发地点类型两个角度识别城市中的重点防控空间。"
      debugTitle={t('debug.title')}
      debugPathPrefixes={['/analytics/districts/comparison', '/analytics/location/types']}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <InsightCard
            eyebrow="分区对比"
            title={t('pages.district.districtCard')}
            description="比较各警务分区的案件体量，并支持年度对照。"
            extra={
              <ComparisonSelect
                value={districtComparison.comparisonYears}
                onChange={districtComparison.setComparisonYears}
                excludeYear={filters.year}
              />
            }
          >
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={districtResult.data.length === 0}
              downgradedCount={districtResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart
                data={districtResult.data}
                xField="district"
                yField="count"
                yFieldLabel="案件数量"
                height={300}
                series={buildSeriesWithCurrent(
                  districtResult.data,
                  districtComparison.series,
                  filters.year
                )}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={24}>
          <InsightCard
            eyebrow="高发地点"
            title={t('pages.district.locationCard')}
            description="查看最常见的案件发生地点类型及其变化。"
            extra={
              <ComparisonSelect
                value={locationComparison.comparisonYears}
                onChange={locationComparison.setComparisonYears}
                excludeYear={filters.year}
              />
            }
          >
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={locationResult.data.length === 0}
              downgradedCount={locationResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart
                data={locationResult.data}
                xField="location_description"
                yField="count"
                yFieldLabel="案件数量"
                height={350}
                labelTranslator={translateLocationType}
                series={buildSeriesWithCurrent(
                  locationResult.data,
                  locationComparison.series,
                  filters.year
                )}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
      </Row>
    </AnalysisPageShell>
  )
}

export default DistrictAnalysis

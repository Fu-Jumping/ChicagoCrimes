import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Row, Col } from 'antd'
import { analyticsApi, type NormalizedApiError } from '../api'
import PieChart from '../components/charts/PieChart'
import RoseChart from '../components/charts/RoseChart'
import BarChart from '../components/charts/BarChart'
import DataStatePanel from '../components/DataStatePanel'
import AnalysisPageShell from '../components/AnalysisPageShell'
import ComparisonSelect from '../components/ComparisonSelect'
import InsightCard from '../components/InsightCard'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { useChartComparison } from '../hooks/useChartComparison'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { t } from '../i18n'
import {
  normalizeSeriesData,
  type GenericRow,
  type NormalizedChartResult
} from '../utils/chartData'
import { translateCrimeType } from '../utils/crimeTypeMap'
import { buildAnalyticsFilterParams } from '../utils/filterParams'

const normalizeArrestRows = (rows: GenericRow[]): GenericRow[] =>
  rows.map((row) => {
    const rateValue = row.arrest_rate
    const numericRate =
      typeof rateValue === 'number'
        ? rateValue
        : typeof rateValue === 'string'
          ? Number(rateValue)
          : 0
    return {
      ...row,
      arrest_rate: Number.isFinite(numericRate) ? numericRate * 100 : 0
    }
  })

const TypeAnalysis: React.FC = () => {
  const { filters } = useGlobalFilters()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<NormalizedApiError | null>(null)
  const [typeResult, setTypeResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [arrestRateResult, setArrestRateResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [domesticResult, setDomesticResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const requestParams = useMemo(() => buildAnalyticsFilterParams(filters), [filters])
  const debouncedRequestParams = useDebouncedValue(requestParams, 160)

  const arrestComparison = useChartComparison({
    fetchFn: async (year) => {
      const res = await analyticsApi.getTypesArrestRate({
        ...debouncedRequestParams,
        year,
        limit: 5
      })
      return { data: normalizeArrestRows(res.data as GenericRow[]) }
    },
    xField: 'primary_type',
    yField: 'arrest_rate',
    fallbackLabel: t('common.unknownType')
  })

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [typeRes, arrestRes, domesticRes] = await Promise.all([
        analyticsApi.getTypesProportion({
          ...debouncedRequestParams,
          limit: 10,
        }),
        analyticsApi.getTypesArrestRate({
          ...debouncedRequestParams,
          limit: 5,
        }),
        analyticsApi.getDomesticProportion(debouncedRequestParams)
      ])

      setTypeResult(
        normalizeSeriesData(typeRes.data, 'primary_type', 'count', t('common.unknownType'))
      )

      setArrestRateResult(
        normalizeSeriesData(
          normalizeArrestRows(arrestRes.data as GenericRow[]),
          'primary_type',
          'arrest_rate',
          t('common.unknownType')
        )
      )

      const domesticRows = (domesticRes.data as GenericRow[]).map((row) => ({
        ...row,
        label:
          row.domestic === true
            ? t('common.yes')
            : row.domestic === false
              ? t('common.no')
              : t('common.unknownType')
      }))
      setDomesticResult(
        normalizeSeriesData(domesticRows, 'label', 'count', t('common.unknownType'))
      )
    } catch (requestError) {
      setError(requestError as NormalizedApiError)
      setTypeResult({ data: [], downgradedCount: 0 })
      setArrestRateResult({ data: [], downgradedCount: 0 })
      setDomesticResult({ data: [], downgradedCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [debouncedRequestParams])

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
      variant="type"
      systemTag="事件类型分析 // 分类 · 逮捕率 · 家暴占比"
      title="类型分析"
      subtitle="从案件类型、逮捕率和家暴占比三条线索理解案件结构特征。"
      debugTitle={t('debug.title')}
      debugPathPrefixes={[
        '/analytics/types/proportion',
        '/analytics/types/arrest_rate',
        '/analytics/domestic/proportion'
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <InsightCard
            eyebrow="类型构成"
            title={t('pages.type.typeCard')}
            description="展示当前筛选下主要案件类型的占比关系。"
          >
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={typeResult.data.length === 0}
              downgradedCount={typeResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <RoseChart
                data={typeResult.data}
                labelField="primary_type"
                valueField="count"
                height={350}
                labelTranslator={translateCrimeType}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="家暴占比"
            title={t('pages.type.domesticCard')}
            description="比较家暴与非家暴案件在当前条件下的占比。"
          >
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={domesticResult.data.length === 0}
              downgradedCount={domesticResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <PieChart
                data={domesticResult.data}
                labelField="label"
                valueField="count"
                height={350}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={24}>
          <InsightCard
            eyebrow="逮捕效率"
            title={t('pages.type.arrestCard')}
            description="针对高频案件类型对比逮捕率表现。"
            extra={
              <ComparisonSelect
                value={arrestComparison.comparisonYears}
                onChange={arrestComparison.setComparisonYears}
                excludeYear={filters.year}
              />
            }
          >
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={arrestRateResult.data.length === 0}
              downgradedCount={arrestRateResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart
                data={arrestRateResult.data}
                xField="primary_type"
                yField="arrest_rate"
                yFieldLabel="逮捕率(%)"
                height={300}
                labelTranslator={translateCrimeType}
                series={buildSeriesWithCurrent(
                  arrestRateResult.data,
                  arrestComparison.series,
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

export default TypeAnalysis

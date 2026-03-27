import React, { useCallback, useEffect, useState } from 'react'
import { Row, Col, Card } from 'antd'
import { analyticsApi, type NormalizedApiError } from '../api'
import PieChart from '../components/charts/PieChart'
import BarChart from '../components/charts/BarChart'
import DataStatePanel from '../components/DataStatePanel'
import AnalysisPageShell from '../components/AnalysisPageShell'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { t } from '../i18n'
import {
  normalizeSeriesData,
  type GenericRow,
  type NormalizedChartResult
} from '../utils/chartData'

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

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [typeRes, arrestRes, domesticRes] = await Promise.all([
        analyticsApi.getTypesProportion({ year: filters.year ?? undefined, limit: 10 }),
        analyticsApi.getTypesArrestRate({ year: filters.year ?? undefined, limit: 5 }),
        analyticsApi.getDomesticProportion({ year: filters.year ?? undefined })
      ])

      setTypeResult(
        normalizeSeriesData(typeRes.data, 'primary_type', 'count', t('common.unknownType'))
      )

      const normalizedArrestRows = (arrestRes.data as GenericRow[]).map((row) => {
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
      setArrestRateResult(
        normalizeSeriesData(
          normalizedArrestRows,
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
  }, [filters.year])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchData])

  return (
    <AnalysisPageShell
      variant="type"
      systemTag="数据维度：事件类型 // 分析：分类 · 逮捕率 · 家暴占比"
      title="类型分析"
      subtitle="对犯罪事件分类、逮捕效率指标及家暴与公共事件比例进行深度对比分析。"
      debugTitle={t('debug.title')}
      debugPathPrefixes={[
        '/analytics/types/proportion',
        '/analytics/types/arrest_rate',
        '/analytics/domestic/proportion'
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title={t('pages.type.typeCard')} bordered={false}>
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={typeResult.data.length === 0}
              downgradedCount={typeResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <PieChart
                data={typeResult.data}
                labelField="primary_type"
                valueField="count"
                height={350}
              />
            </DataStatePanel>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('pages.type.domesticCard')} bordered={false}>
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
          </Card>
        </Col>
        <Col span={24}>
          <Card title={t('pages.type.arrestCard')} bordered={false}>
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
                height={300}
              />
            </DataStatePanel>
          </Card>
        </Col>
      </Row>
    </AnalysisPageShell>
  )
}

export default TypeAnalysis

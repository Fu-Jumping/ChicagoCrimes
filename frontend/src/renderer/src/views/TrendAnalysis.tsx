import React, { useCallback, useEffect, useState } from 'react'
import { Row, Col, Card } from 'antd'
import { analyticsApi, type NormalizedApiError } from '../api'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import DataStatePanel from '../components/DataStatePanel'
import AnalysisPageShell from '../components/AnalysisPageShell'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { t } from '../i18n'
import { normalizeSeriesData, type NormalizedChartResult } from '../utils/chartData'

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

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [monthlyRes, weeklyRes, hourlyRes] = await Promise.all([
        analyticsApi.getMonthlyTrend({ year: filters.year || 2015 }),
        analyticsApi.getWeeklyTrend({ year: filters.year ?? undefined }),
        analyticsApi.getHourlyTrend({ year: filters.year ?? undefined })
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
  }, [filters.year])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchData])

  return (
    <AnalysisPageShell
      variant="trend"
      systemTag="数据维度：时间序列 // 分析：月度 · 周 · 小时"
      title="趋势分析"
      subtitle="分析芝加哥大都会区的时序规律与犯罪密度模式，交叉比对月度波动、周内分布与小时高峰。"
      debugTitle={t('debug.title')}
      debugPathPrefixes={[
        '/analytics/trend/monthly',
        '/analytics/trend/weekly',
        '/analytics/trend/hourly'
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={t('pages.trend.monthlyCard')} bordered={false}>
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={monthlyResult.data.length === 0}
              downgradedCount={monthlyResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <LineChart data={monthlyResult.data} xField="month" yField="count" height={300} />
            </DataStatePanel>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('pages.trend.weeklyCard')} bordered={false}>
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={weeklyResult.data.length === 0}
              downgradedCount={weeklyResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart data={weeklyResult.data} xField="day_of_week" yField="count" height={300} />
            </DataStatePanel>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('pages.trend.hourlyCard')} bordered={false}>
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={hourlyResult.data.length === 0}
              downgradedCount={hourlyResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <LineChart data={hourlyResult.data} xField="hour" yField="count" height={300} />
            </DataStatePanel>
          </Card>
        </Col>
      </Row>
    </AnalysisPageShell>
  )
}

export default TrendAnalysis

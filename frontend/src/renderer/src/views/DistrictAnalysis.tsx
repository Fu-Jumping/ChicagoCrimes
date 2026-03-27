import React, { useCallback, useEffect, useState } from 'react'
import { Row, Col, Card } from 'antd'
import { analyticsApi, type NormalizedApiError } from '../api'
import BarChart from '../components/charts/BarChart'
import DataStatePanel from '../components/DataStatePanel'
import AnalysisPageShell from '../components/AnalysisPageShell'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { t } from '../i18n'
import { normalizeSeriesData, type NormalizedChartResult } from '../utils/chartData'

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

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [districtRes, locationRes] = await Promise.all([
        analyticsApi.getDistrictsComparison({ year: filters.year ?? undefined, limit: 20 }),
        analyticsApi.getLocationTypes({ year: filters.year ?? undefined, limit: 15 })
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
  }, [filters.year])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchData])

  return (
    <AnalysisPageShell
      variant="district"
      systemTag="数据维度：地理区域 // 分析：分区对比 · 地点类型"
      title="区域分析"
      subtitle="各分区案件总量横向对比，并深入分析高发场所类型分布，识别重点防控区域。"
      debugTitle={t('debug.title')}
      debugPathPrefixes={['/analytics/districts/comparison', '/analytics/location/types']}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={t('pages.district.districtCard')} bordered={false}>
            <DataStatePanel
              loading={loading}
              error={error}
              isEmpty={districtResult.data.length === 0}
              downgradedCount={districtResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart data={districtResult.data} xField="district" yField="count" height={300} />
            </DataStatePanel>
          </Card>
        </Col>
        <Col span={24}>
          <Card title={t('pages.district.locationCard')} bordered={false}>
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
                height={350}
              />
            </DataStatePanel>
          </Card>
        </Col>
      </Row>
    </AnalysisPageShell>
  )
}

export default DistrictAnalysis

import React, { useState, useEffect, useCallback } from 'react'
import { Card, Space } from 'antd'
import AnalysisPageShell from '../components/AnalysisPageShell'
import CrimeHeatMap from '../components/charts/CrimeHeatMap'
import TimelinePlayer from '../components/TimelinePlayer'
import DataStatePanel from '../components/DataStatePanel'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { analyticsApi } from '../api'

const MapView: React.FC = () => {
  const { filters } = useGlobalFilters()
  const [month, setMonth] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [heatData, setHeatData] = useState([])
  const [districtData, setDistrictData] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [heatRes, distRes] = await Promise.all([
        analyticsApi.getGeoHeatmap({ year: filters.year ?? undefined, month: month ?? undefined }),
        analyticsApi.getGeoDistricts({ year: filters.year ?? undefined, month: month ?? undefined })
      ])
      setHeatData(heatRes.data)
      setDistrictData(distRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters.year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <AnalysisPageShell
      variant="dashboard"
      systemTag="空间分析引擎 // 卫星遥测"
      title="地理热力图"
      subtitle="基于经纬度的犯罪密度热力分布与区域聚合分析。"
      debugTitle="地理请求调试"
      debugPathPrefixes={['/analytics/geo/heatmap', '/analytics/geo/districts']}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <TimelinePlayer currentMonth={month} onChange={setMonth} />
        
        <Card bordered={false} bodyStyle={{ padding: 0, height: '600px' }}>
          <DataStatePanel
            loading={loading}
            error={null}
            isEmpty={heatData.length === 0}
            onRetry={fetchData}
          >
            <CrimeHeatMap 
              heatData={heatData} 
              districtData={districtData} 
              onDistrictClick={(d) => console.log('Clicked district:', d)} 
            />
          </DataStatePanel>
        </Card>
      </Space>
    </AnalysisPageShell>
  )
}

export default MapView

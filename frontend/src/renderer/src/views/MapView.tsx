import React, { useCallback, useEffect, useMemo, useState } from 'react'
import AnalysisPageShell from '../components/AnalysisPageShell'
import CrimeHeatMap from '../components/charts/CrimeHeatMap'
import DataStatePanel from '../components/DataStatePanel'
import InsightCard from '../components/InsightCard'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { analyticsApi } from '../api'
import { buildAnalyticsFilterParams } from '../utils/filterParams'

const cn = (...codes: number[]): string => String.fromCharCode(...codes)

const MAP_SYSTEM_TAG = [
  cn(0x7a7a, 0x95f4, 0x5206, 0x6790, 0x5f15, 0x64ce),
  ' // ',
  cn(0x5730, 0x7406, 0x70ed, 0x529b, 0x4e0e, 0x9632, 0x533a, 0x6001, 0x52bf)
].join('')

const MAP_TITLE = cn(0x7a7a, 0x95f4, 0x5730, 0x56fe)

const MAP_SUBTITLE = cn(
  0x5728,
  0x5730,
  0x56fe,
  0x4e2d,
  0x67e5,
  0x770b,
  0x6848,
  0x4ef6,
  0x70ed,
  0x70b9,
  0x3001,
  0x533a,
  0x57df,
  0x5206,
  0x5e03,
  0x4e0e,
  0x7a7a,
  0x95f4,
  0x805a,
  0x96c6,
  0x7279,
  0x5f81,
  0x3002
)

const MAP_DEBUG_TITLE = cn(0x5730, 0x7406, 0x8bf7, 0x6c42, 0x8c03, 0x8bd5)
const MAP_LOAD_ERROR = cn(0x52a0, 0x8f7d, 0x5931, 0x8d25)

const MapView: React.FC = () => {
  const { filters } = useGlobalFilters()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [heatData, setHeatData] = useState<{ lat: number; lng: number; count: number }[]>([])
  const [districtData, setDistrictData] = useState<{ district: string; count: number }[]>([])

  const requestParams = useMemo(() => buildAnalyticsFilterParams(filters), [filters])
  const debouncedRequestParams = useDebouncedValue(requestParams, 160)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [heatRes, distRes] = await Promise.all([
        analyticsApi.getGeoHeatmap(debouncedRequestParams),
        analyticsApi.getGeoDistricts(debouncedRequestParams)
      ])
      setHeatData(heatRes)
      setDistrictData(distRes)
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : MAP_LOAD_ERROR
      setError(message)
      console.error(requestError)
    } finally {
      setLoading(false)
    }
  }, [debouncedRequestParams])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return (
    <AnalysisPageShell
      variant="dashboard"
      systemTag={MAP_SYSTEM_TAG}
      title={MAP_TITLE}
      subtitle={MAP_SUBTITLE}
      debugTitle={MAP_DEBUG_TITLE}
      debugPathPrefixes={['/analytics/geo/heatmap', '/analytics/geo/districts']}
    >
      <InsightCard
        eyebrow="空间热力"
        title="城市热点地图"
        description="结合热力层与分区轮廓查看案件热点在城市空间中的聚集情况。"
      >
        <DataStatePanel
          loading={loading}
          error={
            error
              ? {
                  status: 0,
                  code: 'GEO_ERROR',
                  message: error,
                  errorType: 'network_error',
                  details: []
                }
              : null
          }
          isEmpty={heatData.length === 0 && districtData.length === 0}
          onRetry={fetchData}
        >
          <div style={{ height: '600px' }}>
            <CrimeHeatMap heatData={heatData} districtData={districtData} />
          </div>
        </DataStatePanel>
      </InsightCard>
    </AnalysisPageShell>
  )
}

export default MapView

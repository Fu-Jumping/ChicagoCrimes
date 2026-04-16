import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Row, Col } from 'antd'
import { analyticsApi, type NormalizedApiError } from '../api'
import BarChart, { type ChartSeries } from '../components/charts/BarChart'
import LineChart from '../components/charts/LineChart'
import PieChart from '../components/charts/PieChart'
import DataStatePanel from '../components/DataStatePanel'
import AnalysisPageShell from '../components/AnalysisPageShell'
import InsightCard from '../components/InsightCard'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { t } from '../i18n'
import {
  normalizeSeriesData,
  type GenericRow,
  type NormalizedChartResult
} from '../utils/chartData'
import { buildAnalyticsFilterParams } from '../utils/filterParams'
import { translateCrimeType } from '../utils/crimeTypeMap'
import { translateLocationType } from '../utils/locationTypeMap'

const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const REQUIREMENTS_REQUEST_TIMEOUT_MS = 10000
const SEASONAL_COMPARE_REQUEST_TIMEOUT_MS = 25000

const toNumber = (value: unknown): number =>
  typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0

const dayLabel = (raw: string): string => {
  const index = Number(raw)
  if (!Number.isFinite(index) || index < 0 || index > 6) return raw
  return weekdayLabels[index] ?? raw
}

const translateCrimeTypeForReport = (raw: string): string => {
  const translated = translateCrimeType(raw)
  return translated === raw ? '其他类型' : translated
}

const translateLocationTypeForReport = (raw: string): string => {
  const translated = translateLocationType(raw)
  const normalized = translated === raw ? '其他地点' : translated
  return normalized.replace(/CTA/g, '芝加哥交通局').replace(/CHA/g, '芝加哥房管局')
}

const blockAbbreviationMap: Record<string, string> = {
  ST: '街',
  AVE: '大道',
  BLVD: '林荫道',
  RD: '路',
  DR: '道',
  CT: '小路',
  PL: '广场',
  LN: '巷',
  PKWY: '公园大道',
  WAY: '通道',
  TER: '台地'
}

const translateBlockLabel = (raw: string): string => {
  const cleaned = raw.trim()
  if (!cleaned) return '未知街区'
  const tokens = cleaned.split(/\s+/)
  const translatedTokens = tokens.map((token) => {
    const upper = token.toUpperCase()
    if (upper === 'N') return '北'
    if (upper === 'S') return '南'
    if (upper === 'E') return '东'
    if (upper === 'W') return '西'
    if (upper === 'XX') return '号段'
    if (blockAbbreviationMap[upper]) return blockAbbreviationMap[upper]
    return token
  })
  return translatedTokens.join(' ')
}

const findMaxLabel = (
  rows: Record<string, unknown>[],
  labelKey: string,
  metricKey: string,
  labelTransform?: (v: string) => string
): string => {
  if (rows.length === 0) return '暂无'
  const winner = [...rows].sort((a, b) => toNumber(b[metricKey]) - toNumber(a[metricKey]))[0]
  const raw = String(winner?.[labelKey] ?? '暂无')
  return labelTransform ? labelTransform(raw) : raw
}

const findMinLabel = (
  rows: Record<string, unknown>[],
  labelKey: string,
  metricKey: string,
  labelTransform?: (v: string) => string
): string => {
  if (rows.length === 0) return '暂无'
  const winner = [...rows].sort((a, b) => toNumber(a[metricKey]) - toNumber(b[metricKey]))[0]
  const raw = String(winner?.[labelKey] ?? '暂无')
  return labelTransform ? labelTransform(raw) : raw
}

const buildArrestRows = (rows: Record<string, unknown>[]): Record<string, unknown>[] =>
  rows.map((row) => ({
    ...row,
    status: row.arrest === true ? '已逮捕' : row.arrest === false ? '未逮捕' : '未知'
  }))

const withRequestTimeout = <T,>(
  request: Promise<T>,
  timeoutMs = REQUIREMENTS_REQUEST_TIMEOUT_MS
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('request_timeout'))
    }, timeoutMs)
    request
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })

const RequirementsAnalysis: React.FC = () => {
  const { filters } = useGlobalFilters()
  const [primaryLoading, setPrimaryLoading] = useState(true)
  const [secondaryLoading, setSecondaryLoading] = useState(true)
  const [seasonalLoading, setSeasonalLoading] = useState(true)
  const [error, setError] = useState<NormalizedApiError | null>(null)
  const [yearlyResult, setYearlyResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [hourlyResult, setHourlyResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [nightlyPeakResult, setNightlyPeakResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [weeklyResult, setWeeklyResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [typeTopResult, setTypeTopResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [homicideResult, setHomicideResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [locationResult, setLocationResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [blockResult, setBlockResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [districtRankResult, setDistrictRankResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [arrestResult, setArrestResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [domesticYearlyResult, setDomesticYearlyResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [communityTopResult, setCommunityTopResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [caseQualityResult, setCaseQualityResult] = useState<NormalizedChartResult>({
    data: [],
    downgradedCount: 0
  })
  const [seasonSeries, setSeasonSeries] = useState<ChartSeries[]>([])

  const requestParams = useMemo(() => buildAnalyticsFilterParams(filters), [filters])
  const debouncedRequestParams = useDebouncedValue(requestParams, 160)

  const fetchData = useCallback(async (): Promise<void> => {
    setPrimaryLoading(true)
    setSecondaryLoading(true)
    setSeasonalLoading(true)
    setError(null)
    try {
      const primaryResults = await Promise.allSettled([
        withRequestTimeout(analyticsApi.getYearlyTrend(debouncedRequestParams)),
        withRequestTimeout(analyticsApi.getHourlyTrend(debouncedRequestParams)),
        withRequestTimeout(analyticsApi.getNightlyPeak(debouncedRequestParams)),
        withRequestTimeout(analyticsApi.getWeeklyTrend(debouncedRequestParams)),
        withRequestTimeout(
          analyticsApi.getTypesProportion({
            ...debouncedRequestParams,
            limit: 10
          })
        ),
        withRequestTimeout(
          analyticsApi.getYearlyTrend({
            ...debouncedRequestParams,
            primary_type: ['HOMICIDE']
          })
        )
      ])

      const [yearlyRes, hourlyRes, nightlyPeakRes, weeklyRes, typeTopRes, homicideRes] =
        primaryResults

      if (yearlyRes?.status === 'fulfilled') {
        setYearlyResult(
          normalizeSeriesData(yearlyRes.value.data, 'year', 'count', t('common.unknownYear'))
        )
      } else {
        setYearlyResult({ data: [], downgradedCount: 0 })
      }

      if (hourlyRes?.status === 'fulfilled') {
        setHourlyResult(
          normalizeSeriesData(hourlyRes.value.data, 'hour', 'count', t('common.unknownHour'))
        )
      } else {
        setHourlyResult({ data: [], downgradedCount: 0 })
      }

      if (nightlyPeakRes?.status === 'fulfilled') {
        setNightlyPeakResult(
          normalizeSeriesData(nightlyPeakRes.value.data, 'hour', 'count', t('common.unknownHour'))
        )
      } else {
        setNightlyPeakResult({ data: [], downgradedCount: 0 })
      }

      if (weeklyRes?.status === 'fulfilled') {
        setWeeklyResult(
          normalizeSeriesData(
            weeklyRes.value.data,
            'day_of_week',
            'count',
            t('common.unknownWeekday')
          )
        )
      } else {
        setWeeklyResult({ data: [], downgradedCount: 0 })
      }

      if (typeTopRes?.status === 'fulfilled') {
        setTypeTopResult(
          normalizeSeriesData(
            typeTopRes.value.data,
            'primary_type',
            'count',
            t('common.unknownType')
          )
        )
      } else {
        setTypeTopResult({ data: [], downgradedCount: 0 })
      }

      if (homicideRes?.status === 'fulfilled') {
        setHomicideResult(
          normalizeSeriesData(homicideRes.value.data, 'year', 'count', t('common.unknownYear'))
        )
      } else {
        setHomicideResult({ data: [], downgradedCount: 0 })
      }
      setPrimaryLoading(false)

      const seasonalResultPromise = withRequestTimeout(
        analyticsApi.getTypesSeasonalCompare({
          ...debouncedRequestParams,
          limit: 8
        }),
        SEASONAL_COMPARE_REQUEST_TIMEOUT_MS
      )
        .then((value) => ({ status: 'fulfilled' as const, value }))
        .catch((reason) => ({ status: 'rejected' as const, reason }))

      const secondaryResults = await Promise.allSettled([
        withRequestTimeout(
          analyticsApi.getLocationTypes({
            ...debouncedRequestParams,
            limit: 10
          })
        ),
        withRequestTimeout(
          analyticsApi.getDangerousBlocksTop({
            ...debouncedRequestParams,
            limit: 10
          })
        ),
        withRequestTimeout(
          analyticsApi.getDistrictsComparison({
            ...debouncedRequestParams,
            limit: 10
          })
        ),
        withRequestTimeout(analyticsApi.getArrestsRate(debouncedRequestParams)),
        withRequestTimeout(
          analyticsApi.getYearlyTrend({
            ...debouncedRequestParams,
            domestic: [true]
          })
        ),
        withRequestTimeout(
          analyticsApi.getCommunityTop10({
            ...debouncedRequestParams,
            limit: 10
          })
        ),
        withRequestTimeout(analyticsApi.getCaseNumberQuality(debouncedRequestParams))
      ])

      const [
        locationRes,
        blockRes,
        districtRankRes,
        arrestRes,
        domesticYearlyRes,
        communityTopRes,
        caseQualityRes
      ] = secondaryResults

      if (locationRes?.status === 'fulfilled') {
        setLocationResult(
          normalizeSeriesData(
            locationRes.value.data,
            'location_description',
            'count',
            t('common.unknownLocation')
          )
        )
      } else {
        setLocationResult({ data: [], downgradedCount: 0 })
      }

      if (blockRes?.status === 'fulfilled') {
        setBlockResult(normalizeSeriesData(blockRes.value.data, 'block', 'count', '未知街区'))
      } else {
        setBlockResult({ data: [], downgradedCount: 0 })
      }

      if (districtRankRes?.status === 'fulfilled') {
        setDistrictRankResult(
          normalizeSeriesData(
            districtRankRes.value.data,
            'district',
            'count',
            t('common.unknownDistrict')
          )
        )
      } else {
        setDistrictRankResult({ data: [], downgradedCount: 0 })
      }

      if (arrestRes?.status === 'fulfilled') {
        setArrestResult(
          normalizeSeriesData(
            buildArrestRows(arrestRes.value.data as Record<string, unknown>[]),
            'status',
            'count',
            '未知'
          )
        )
      } else {
        setArrestResult({ data: [], downgradedCount: 0 })
      }

      if (domesticYearlyRes?.status === 'fulfilled') {
        setDomesticYearlyResult(
          normalizeSeriesData(
            domesticYearlyRes.value.data,
            'year',
            'count',
            t('common.unknownYear')
          )
        )
      } else {
        setDomesticYearlyResult({ data: [], downgradedCount: 0 })
      }

      if (communityTopRes?.status === 'fulfilled') {
        setCommunityTopResult(
          normalizeSeriesData(communityTopRes.value.data, 'community_area', 'count', '未知社区')
        )
      } else {
        setCommunityTopResult({ data: [], downgradedCount: 0 })
      }

      if (caseQualityRes?.status === 'fulfilled') {
        setCaseQualityResult(
          normalizeSeriesData(caseQualityRes.value.data, 'status', 'count', '未知状态')
        )
      } else {
        setCaseQualityResult({ data: [], downgradedCount: 0 })
      }

      setSecondaryLoading(false)

      const seasonalRes = await seasonalResultPromise
      if (seasonalRes.status !== 'fulfilled') {
        setSeasonSeries([])
      } else {
        const seasonRows = seasonalRes.value.data as GenericRow[]
        const seasonTypeMap: Record<string, Map<string, number>> = {
          winter: new Map<string, number>(),
          summer: new Map<string, number>()
        }
        const allTypes = new Set<string>()
        for (const row of seasonRows) {
          const season = String(row.season ?? '')
          const primaryType = String(row.primary_type ?? '')
          if (!seasonTypeMap[season] || !primaryType) continue
          const proportion = Math.round(toNumber(row.proportion) * 10000) / 100
          seasonTypeMap[season]?.set(primaryType, proportion)
          allTypes.add(primaryType)
        }
        const categories = Array.from(allTypes)
        setSeasonSeries([
          {
            label: '冬季',
            color: '#1677ff',
            data: categories.map((primary_type) => ({
              primary_type,
              proportion: seasonTypeMap.winter.get(primary_type) ?? 0
            }))
          },
          {
            label: '夏季',
            color: '#fa8c16',
            data: categories.map((primary_type) => ({
              primary_type,
              proportion: seasonTypeMap.summer.get(primary_type) ?? 0
            }))
          }
        ])
      }

      const primaryFailed = primaryResults.filter((item) => item.status === 'rejected')
      const secondaryFailed = secondaryResults.filter((item) => item.status === 'rejected')

      const allSecondaryFailed =
        secondaryFailed.length === secondaryResults.length && seasonalRes.status === 'rejected'
      if (primaryFailed.length === primaryResults.length && allSecondaryFailed) {
        const firstRejected = [...primaryFailed, ...secondaryFailed][0] as
          | PromiseRejectedResult
          | undefined
        const seasonalReason = seasonalRes.status === 'rejected' ? seasonalRes.reason : undefined
        setError(
          (firstRejected?.reason ?? seasonalReason ?? new Error('request_failed')) as
            | NormalizedApiError
            | Error as NormalizedApiError
        )
      } else {
        setError(null)
      }
      setSeasonalLoading(false)
    } catch (requestError) {
      setError(requestError as NormalizedApiError)
      setYearlyResult({ data: [], downgradedCount: 0 })
      setHourlyResult({ data: [], downgradedCount: 0 })
      setNightlyPeakResult({ data: [], downgradedCount: 0 })
      setWeeklyResult({ data: [], downgradedCount: 0 })
      setDistrictRankResult({ data: [], downgradedCount: 0 })
      setTypeTopResult({ data: [], downgradedCount: 0 })
      setHomicideResult({ data: [], downgradedCount: 0 })
      setLocationResult({ data: [], downgradedCount: 0 })
      setBlockResult({ data: [], downgradedCount: 0 })
      setArrestResult({ data: [], downgradedCount: 0 })
      setDomesticYearlyResult({ data: [], downgradedCount: 0 })
      setCommunityTopResult({ data: [], downgradedCount: 0 })
      setCaseQualityResult({ data: [], downgradedCount: 0 })
      setSeasonSeries([])
    } finally {
      setPrimaryLoading(false)
      setSecondaryLoading(false)
      setSeasonalLoading(false)
    }
  }, [debouncedRequestParams])

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      if (cancelled) return
      await fetchData()
    }
    void run()

    return () => {
      cancelled = true
    }
  }, [fetchData])

  const weeklyMost = useMemo(
    () => findMaxLabel(weeklyResult.data, 'day_of_week', 'count', dayLabel),
    [weeklyResult.data]
  )
  const weeklyLeast = useMemo(
    () => findMinLabel(weeklyResult.data, 'day_of_week', 'count', dayLabel),
    [weeklyResult.data]
  )
  const hourlyMost = useMemo(
    () => findMaxLabel(hourlyResult.data, 'hour', 'count', (v) => `${v}:00`),
    [hourlyResult.data]
  )
  const hourlyLeast = useMemo(
    () => findMinLabel(hourlyResult.data, 'hour', 'count', (v) => `${v}:00`),
    [hourlyResult.data]
  )

  const arrestRateText = useMemo(() => {
    const arrested = arrestResult.data.find((item) => String(item.status) === '已逮捕')?.count ?? 0
    const notArrested =
      arrestResult.data.find((item) => String(item.status) === '未逮捕')?.count ?? 0
    const total = toNumber(arrested) + toNumber(notArrested)
    if (total <= 0) return '暂无可计算的逮捕率'
    return `当前筛选下总体逮捕率约 ${((toNumber(arrested) / total) * 100).toFixed(2)}%`
  }, [arrestResult.data])

  return (
    <AnalysisPageShell
      variant="district"
      systemTag="专项总结分析 // 2001-2023"
      title="专项需求图表"
      subtitle="覆盖年度、小时、星期、类型、暴力、空间、执法与家暴维度的总结报告图表。"
      debugTitle={t('debug.title')}
      debugPathPrefixes={[
        '/analytics/trend/yearly',
        '/analytics/trend/hourly',
        '/analytics/trend/nightly_peak',
        '/analytics/trend/weekly',
        '/analytics/types/seasonal_compare',
        '/analytics/types/proportion',
        '/analytics/location/types',
        '/analytics/blocks/top_dangerous',
        '/analytics/districts/comparison',
        '/analytics/arrests/rate',
        '/analytics/community/top10',
        '/analytics/quality/case_number'
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <InsightCard
            eyebrow="时间维度"
            title="年度趋势（2001-2023）"
            description="验证总体是否长期下降，并识别疫情阶段异常低点。"
          >
            <DataStatePanel
              loading={primaryLoading}
              error={error}
              isEmpty={yearlyResult.data.length === 0}
              downgradedCount={yearlyResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <LineChart
                data={yearlyResult.data}
                xField="year"
                yField="count"
                yFieldLabel="案件数量"
                height={300}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="时间维度"
            title="小时分布"
            description={`当前高峰时段：${hourlyMost}；当前低谷时段：${hourlyLeast}`}
          >
            <DataStatePanel
              loading={primaryLoading}
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
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="时间维度"
            title="夜间高发时段 (22:00-04:00)"
            description="专门分析夜间治安情况，突出22:00后的犯罪规模。"
          >
            <DataStatePanel
              loading={primaryLoading}
              error={error}
              isEmpty={nightlyPeakResult.data.length === 0}
              downgradedCount={nightlyPeakResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <LineChart
                data={nightlyPeakResult.data}
                xField="hour"
                yField="count"
                yFieldLabel="案件数量"
                labelTranslator={(v) => `${v}:00`}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="时间维度"
            title="星期分布"
            description={`当前最高发：${weeklyMost}；当前最低发：${weeklyLeast}`}
          >
            <DataStatePanel
              loading={primaryLoading}
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
                labelTranslator={dayLabel}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="罪行维度"
            title="犯罪类型前10"
            description="验证盗窃、殴打、刑事损毁等类型是否稳定位于高位。"
          >
            <DataStatePanel
              loading={primaryLoading}
              error={error}
              isEmpty={typeTopResult.data.length === 0}
              downgradedCount={typeTopResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart
                data={typeTopResult.data}
                xField="primary_type"
                yField="count"
                yFieldLabel="案件数量"
                layout="horizontal"
                height={360}
                labelTranslator={translateCrimeTypeForReport}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="罪行维度"
            title="杀人案年度趋势"
            description="观察总体下降背景下，极端暴力案件是否存在逆势反弹。"
          >
            <DataStatePanel
              loading={primaryLoading}
              error={error}
              isEmpty={homicideResult.data.length === 0}
              downgradedCount={homicideResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <LineChart
                data={homicideResult.data}
                xField="year"
                yField="count"
                yFieldLabel="案件数量"
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="空间维度"
            title="危险地点前10"
            description="验证街道、住宅、公寓等地点类型是否长期高发。"
          >
            <DataStatePanel
              loading={secondaryLoading}
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
                layout="horizontal"
                height={420}
                labelTranslator={translateLocationTypeForReport}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="空间维度"
            title="高危街区前10"
            description="补齐危险街区榜单，可直接定位交通枢纽与商业街区风险。"
          >
            <DataStatePanel
              loading={secondaryLoading}
              error={error}
              isEmpty={blockResult.data.length === 0}
              downgradedCount={blockResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart
                data={blockResult.data}
                xField="block"
                yField="count"
                yFieldLabel="案件数量"
                layout="horizontal"
                height={420}
                labelTranslator={translateBlockLabel}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="空间维度"
            title="社区区域犯罪 TOP10"
            description="案件数量最高的十个社区区域（Community Area）。"
          >
            <DataStatePanel
              loading={secondaryLoading}
              error={error}
              isEmpty={communityTopResult.data.length === 0}
              downgradedCount={communityTopResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart
                data={communityTopResult.data}
                xField="community_area"
                yField="count"
                yFieldLabel="案件数量"
                layout="horizontal"
                height={420}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="空间维度"
            title="警区排名分析"
            description="定位案件总量最高的警务分区。"
          >
            <DataStatePanel
              loading={secondaryLoading}
              error={error}
              isEmpty={districtRankResult.data.length === 0}
              downgradedCount={districtRankResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <BarChart
                data={districtRankResult.data}
                xField="district"
                yField="count"
                yFieldLabel="案件数量"
                layout="horizontal"
                height={420}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard eyebrow="执法维度" title="整体逮捕率" description={arrestRateText}>
            <DataStatePanel
              loading={secondaryLoading}
              error={error}
              isEmpty={arrestResult.data.length === 0}
              downgradedCount={arrestResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <PieChart
                data={arrestResult.data}
                labelField="status"
                valueField="count"
                height={320}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="特殊维度"
            title="家庭暴力年度趋势"
            description="在总趋势下降背景下，观察疫情后阶段家暴案件的波动情况。"
          >
            <DataStatePanel
              loading={secondaryLoading}
              error={error}
              isEmpty={domesticYearlyResult.data.length === 0}
              downgradedCount={domesticYearlyResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <LineChart
                data={domesticYearlyResult.data}
                xField="year"
                yField="count"
                yFieldLabel="案件数量"
                height={320}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="数据质量"
            title="案件编号完整性统计分析"
            description="分析案件编号（Case Number）的有效性与缺失情况。"
          >
            <DataStatePanel
              loading={secondaryLoading}
              error={error}
              isEmpty={caseQualityResult.data.length === 0}
              downgradedCount={caseQualityResult.downgradedCount}
              onRetry={() => void fetchData()}
            >
              <PieChart
                data={caseQualityResult.data}
                labelField="status"
                valueField="count"
                height={320}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
        <Col span={12}>
          <InsightCard
            eyebrow="补充优化"
            title="冬季与夏季类型对比"
            description="对“类型结构变化”补充季节对照，提升结论解释力。"
          >
            <DataStatePanel
              loading={seasonalLoading}
              error={error}
              isEmpty={seasonSeries.length === 0}
              onRetry={() => void fetchData()}
            >
              <BarChart
                data={[]}
                xField="primary_type"
                yField="proportion"
                yFieldLabel="占比(%)"
                series={seasonSeries}
                labelTranslator={translateCrimeTypeForReport}
                height={320}
              />
            </DataStatePanel>
          </InsightCard>
        </Col>
      </Row>
    </AnalysisPageShell>
  )
}

export default RequirementsAnalysis

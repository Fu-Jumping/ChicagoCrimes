import axios from 'axios'
import {
  createMemoryHitTiming,
  createRequestTraceMeta,
  finalizeRequestTiming,
  type RequestTraceMeta
} from '../utils/requestTiming'

export interface ApiErrorDetail {
  field: string
  reason: string
}

export interface ApiMeta {
  filters?: Record<string, unknown>
  dimension?: string[]
  metrics?: string[]
  dimension_definitions?: Record<string, unknown>[]
  metric_definitions?: Record<string, unknown>[]
  metric_scope?: string
  metric_scope_note?: string
  state_contract?: {
    empty?: Record<string, unknown>
    loading?: Record<string, unknown>
    error?: Record<string, unknown>
  }
  generated_at?: string
  contract_version?: string
  api_version?: string
  sort?: string
  [key: string]: unknown
}

export interface ApiResponse<T> {
  code: string
  message: string
  data: T
  meta: ApiMeta
  request_id: string
}

export interface NormalizedApiError {
  status: number
  code: string
  message: string
  errorType: string
  requestId?: string
  details: ApiErrorDetail[]
  retryAttempt?: number
}

export type ApiCacheStatus = 'HIT' | 'MISS' | 'NONE' | 'MEMORY_HIT'

export interface RequestHistoryEntry {
  id: string
  method: string
  url: string
  startedAt: number
  endedAt: number
  durationMs: number
  status: number
  success: boolean
  cacheStatus: ApiCacheStatus
  requestId?: string
  errorSummary?: string
  retryAttempt: number
  params?: Record<string, unknown>
}

export interface FilterOptionsResponse {
  months: number[]
  beats: string[]
  wards: number[]
  community_areas: number[]
  domestic_values?: boolean[]
}

export interface WarmupProgressSnapshot {
  completed: number
  total: number
  key: string
  label: string
}

interface MemoryCacheEntry {
  expiresAt: number
  response: ApiResponse<unknown>
}

interface GeoAnalyticsParams {
  [key: string]: boolean | number | string | boolean[] | number[] | string[] | undefined
  year?: number | number[]
  month?: number | number[]
  primary_type?: string | string[]
  district?: number | number[]
  arrest?: boolean | boolean[]
  beat?: string | string[]
  ward?: number | number[]
  community_area?: number | number[]
  domestic?: boolean | boolean[]
}

type RequestHistoryListener = () => void

declare module 'axios' {
  interface AxiosRequestConfig {
    __retryAttempt?: number
    __traceMeta?: RequestTraceMeta
  }

  interface InternalAxiosRequestConfig {
    __retryAttempt?: number
    __traceMeta?: RequestTraceMeta
  }
}

const requestHistory: RequestHistoryEntry[] = []
const requestHistoryListeners = new Set<RequestHistoryListener>()
const requestHistoryLimit = 50
const responseMemoryCache = new Map<string, MemoryCacheEntry>()
const inFlightRequests = new Map<string, Promise<ApiResponse<unknown>>>()
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000
const WARMUP_STAGE_TIMEOUT_MS = 12000
let requirementsWarmupPromise: Promise<void> | null = null

const normalizeError = (error: unknown): NormalizedApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 500
    const payload = error.response?.data as
      | {
          code?: string
          message?: string
          error_type?: string
          request_id?: string
          details?: ApiErrorDetail[]
        }
      | undefined

    return {
      status,
      code: payload?.code ?? 'UNKNOWN_ERROR',
      message: payload?.message ?? error.message ?? '请求失败',
      errorType: payload?.error_type ?? 'network_error',
      requestId: payload?.request_id,
      details: payload?.details ?? [],
      retryAttempt: Number(
        (error.config as Record<string, unknown> | undefined)?.__retryAttempt ?? 0
      )
    }
  }

  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    message: '请求失败',
    errorType: 'unknown_error',
    details: [],
    retryAttempt: 0
  }
}

const emitHistoryChanged = (): void => {
  requestHistoryListeners.forEach((listener) => listener())
}

const getCacheStatus = (value?: string): ApiCacheStatus => {
  if (value && value.includes('HIT')) {
    return 'HIT'
  }
  if (value && value.includes('MISS')) {
    return 'MISS'
  }
  return 'NONE'
}

const getRequestIdFromPayload = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') {
    return undefined
  }

  const requestId = (data as Record<string, unknown>).request_id
  if (typeof requestId === 'string' && requestId.trim().length > 0) {
    return requestId
  }

  return undefined
}

const createErrorSummary = (error: NormalizedApiError): string => {
  const summary = `${error.code}: ${error.message}`
  return summary.length > 120 ? `${summary.slice(0, 117)}...` : summary
}

const appendRequestHistory = (entry: RequestHistoryEntry): void => {
  requestHistory.unshift(entry)
  if (requestHistory.length > requestHistoryLimit) {
    requestHistory.length = requestHistoryLimit
  }
  emitHistoryChanged()
}

const buildRequestKey = (url: string, params?: Record<string, unknown>): string => {
  if (!params) {
    return url
  }

  const searchParams = new URLSearchParams()
  Object.keys(params)
    .sort()
    .forEach((key) => {
      const value = params[key]
      if (value === null || value === undefined) {
        return
      }
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)))
        return
      }
      searchParams.append(key, String(value))
    })

  const query = searchParams.toString()
  return query ? `${url}?${query}` : url
}

const cloneResponse = <T>(response: ApiResponse<T>): ApiResponse<T> => {
  if (typeof structuredClone === 'function') {
    return structuredClone(response)
  }
  return JSON.parse(JSON.stringify(response)) as ApiResponse<T>
}

const readMemoryCache = <T>(key: string): ApiResponse<T> | null => {
  const cached = responseMemoryCache.get(key)
  if (!cached) {
    return null
  }
  if (cached.expiresAt <= Date.now()) {
    responseMemoryCache.delete(key)
    return null
  }
  return cloneResponse(cached.response as ApiResponse<T>)
}

const appendMemoryHitHistory = <T>(
  url: string,
  params: Record<string, unknown> | undefined,
  response: ApiResponse<T>
): void => {
  const timing = createMemoryHitTiming()
  appendRequestHistory({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    method: 'GET',
    url,
    startedAt: timing.startedAt,
    endedAt: timing.endedAt,
    durationMs: timing.durationMs,
    status: 200,
    success: true,
    cacheStatus: 'MEMORY_HIT',
    requestId: response.request_id,
    retryAttempt: 0,
    params
  })
}

export const getRequestHistory = (): RequestHistoryEntry[] => [...requestHistory]

export const clearRequestHistory = (): void => {
  requestHistory.length = 0
  emitHistoryChanged()
}

export const clearApiMemoryCache = (): void => {
  responseMemoryCache.clear()
  inFlightRequests.clear()
}

export const subscribeRequestHistory = (listener: RequestHistoryListener): (() => void) => {
  requestHistoryListeners.add(listener)
  return () => {
    requestHistoryListeners.delete(listener)
  }
}

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  timeout: 60000,
  paramsSerializer: {
    serialize: (params: Record<string, unknown>): string => {
      const sp = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined) continue
        if (Array.isArray(value)) {
          value.forEach((item) => sp.append(key, String(item)))
        } else {
          sp.append(key, String(value))
        }
      }
      return sp.toString()
    }
  }
})

api.interceptors.request.use((config) => {
  const traceMeta = createRequestTraceMeta(`${Date.now()}-${Math.random().toString(16).slice(2)}`)
  config.__traceMeta = traceMeta
  return config
})

api.interceptors.response.use(
  (response) => {
    const traceMeta = response.config.__traceMeta
    const retryAttempt = Number(response.config.__retryAttempt ?? 0)
    const timing = finalizeRequestTiming(traceMeta)
    const requestId = getRequestIdFromPayload(response.data) ?? response.headers['x-request-id']

    appendRequestHistory({
      id: traceMeta?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      method: String(response.config.method ?? 'GET').toUpperCase(),
      url: String(response.config.url ?? ''),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      durationMs: timing.durationMs,
      status: response.status,
      success: true,
      cacheStatus: getCacheStatus(response.headers['x-cache']),
      requestId: typeof requestId === 'string' ? requestId : undefined,
      retryAttempt,
      params:
        response.config.params && typeof response.config.params === 'object'
          ? (response.config.params as Record<string, unknown>)
          : undefined
    })

    return response.data
  },
  (error) => {
    const normalizedError = normalizeError(error)

    if (axios.isAxiosError(error)) {
      const traceMeta = error.config?.__traceMeta
      const retryAttempt = Number(error.config?.__retryAttempt ?? 0)
      const timing = finalizeRequestTiming(traceMeta)

      appendRequestHistory({
        id: traceMeta?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method: String(error.config?.method ?? 'GET').toUpperCase(),
        url: String(error.config?.url ?? ''),
        startedAt: timing.startedAt,
        endedAt: timing.endedAt,
        durationMs: timing.durationMs,
        status: normalizedError.status,
        success: false,
        cacheStatus: getCacheStatus(error.response?.headers?.['x-cache']),
        requestId: normalizedError.requestId,
        errorSummary: createErrorSummary(normalizedError),
        retryAttempt,
        params:
          error.config?.params && typeof error.config.params === 'object'
            ? (error.config.params as Record<string, unknown>)
            : undefined
      })
    }

    return Promise.reject(normalizedError)
  }
)

const shouldRetry = (error: NormalizedApiError): boolean => {
  if (error.status >= 500) {
    return true
  }
  return error.errorType === 'network_error' || error.code === 'ECONNABORTED'
}

const get = async <T>(
  url: string,
  params?: Record<string, unknown>,
  maxRetries = 1
): Promise<ApiResponse<T>> => {
  const requestKey = buildRequestKey(url, params)
  const cached = readMemoryCache<T>(requestKey)
  if (cached) {
    appendMemoryHitHistory(url, params, cached)
    return cached
  }

  const inFlight = inFlightRequests.get(requestKey)
  if (inFlight) {
    return (await inFlight) as ApiResponse<T>
  }

  const requestPromise = (async (): Promise<ApiResponse<T>> => {
    let attempt = 0
    while (attempt <= maxRetries) {
      try {
        const response = await api.get<ApiResponse<T>>(url, {
          params,
          __retryAttempt: attempt
        })
        const normalizedResponse = response as unknown as ApiResponse<T>
        responseMemoryCache.set(requestKey, {
          expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
          response: cloneResponse(normalizedResponse)
        })
        return normalizedResponse
      } catch (error) {
        const normalizedError = error as NormalizedApiError
        if (attempt >= maxRetries || !shouldRetry(normalizedError)) {
          throw normalizedError
        }
        attempt += 1
      }
    }

    throw {
      status: 500,
      code: 'UNKNOWN_ERROR',
      message: '请求失败',
      errorType: 'unknown_error',
      details: [],
      retryAttempt: maxRetries
    } as NormalizedApiError
  })()

  inFlightRequests.set(requestKey, requestPromise as Promise<ApiResponse<unknown>>)

  try {
    return await requestPromise
  } finally {
    inFlightRequests.delete(requestKey)
  }
}

const getData = async <T>(
  url: string,
  params?: Record<string, unknown>,
  maxRetries = 1
): Promise<T> => {
  const response = await get<T>(url, params, maxRetries)
  return response.data
}

export const analyticsApi = {
  getYearlyTrend: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/trend/yearly', params),
  getWeeklyTrend: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/trend/weekly', params),
  getHourlyTrend: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/trend/hourly', params),
  getNightlyPeak: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/trend/nightly_peak', params),
  getTypesProportion: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/types/proportion', params),
  getTypesSeasonalCompare: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/types/seasonal_compare', params),
  getDistrictsComparison: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/districts/comparison', params),
  getDistrictsTypeBreakdown: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/districts/type_breakdown', params),
  getCommunityTop10: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/community/top10', params),
  getDangerousBlocksTop: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/blocks/top_dangerous', params),
  getArrestsRate: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/arrests/rate', params),
  getDomesticProportion: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/domestic/proportion', params),
  getLocationTypes: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/location/types', params),
  getMonthlyTrend: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/trend/monthly', params),
  getTypesArrestRate: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/types/arrest_rate', params),
  getCaseNumberQuality: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/quality/case_number', params),
  getFilterOptions: (params?: Record<string, unknown>) =>
    get<FilterOptionsResponse>('/analytics/filters/options', params),
  getGeoHeatmap: (
    params?: GeoAnalyticsParams
  ): Promise<{ lat: number; lng: number; count: number }[]> =>
    getData<{ lat: number; lng: number; count: number }[]>('/analytics/geo/heatmap', params),
  getGeoDistricts: (params?: GeoAnalyticsParams): Promise<{ district: string; count: number }[]> =>
    getData<{ district: string; count: number }[]>('/analytics/geo/districts', params),
  warmupAppData: async (onProgress?: (snapshot: WarmupProgressSnapshot) => void): Promise<void> => {
    const stages: Array<{ key: string; label: string; run: () => Promise<unknown> }> = [
      {
        key: 'overview',
        label: '预加载总览与筛选器',
        run: () =>
          Promise.allSettled([
            analyticsApi.getFilterOptions(),
            analyticsApi.getYearlyTrend(),
            analyticsApi.getTypesProportion({ limit: 5 }),
            analyticsApi.getDistrictsComparison({ limit: 10 })
          ])
      },
      {
        key: 'trend',
        label: '预加载趋势分析图表',
        run: () =>
          Promise.allSettled([
            analyticsApi.getMonthlyTrend({ year: 2023 }),
            analyticsApi.getWeeklyTrend(),
            analyticsApi.getHourlyTrend()
          ])
      },
      {
        key: 'type',
        label: '预加载类型与逮捕分析',
        run: () =>
          Promise.allSettled([
            analyticsApi.getDomesticProportion(),
            analyticsApi.getTypesArrestRate({ limit: 10 }),
            analyticsApi.getTypesProportion({ limit: 20 })
          ])
      },
      {
        key: 'district',
        label: '预加载区域与地点分析',
        run: () =>
          Promise.allSettled([
            analyticsApi.getDistrictsComparison({ limit: 20 }),
            analyticsApi.getLocationTypes({ limit: 15 })
          ])
      },
      {
        key: 'map',
        label: '预加载地图热力与分区数据',
        run: () =>
          Promise.allSettled([analyticsApi.getGeoHeatmap(), analyticsApi.getGeoDistricts()])
      },
      {
        key: 'requirements',
        label: '预加载专项分析图表',
        run: () =>
          Promise.allSettled([
            analyticsApi.getTypesSeasonalCompare({ limit: 8 }),
            analyticsApi.getDangerousBlocksTop({ limit: 10 })
          ])
      }
    ]

    for (let index = 0; index < stages.length; index += 1) {
      const stage = stages[index]
      if (!stage) {
        continue
      }

      onProgress?.({
        completed: index,
        total: stages.length,
        key: stage.key,
        label: stage.label
      })

      await Promise.race([
        stage.run(),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, WARMUP_STAGE_TIMEOUT_MS)
        })
      ])
    }

    onProgress?.({
      completed: stages.length,
      total: stages.length,
      key: 'done',
      label: '预加载完成'
    })
  },
  warmupRequirementsData: (): Promise<void> => {
    if (requirementsWarmupPromise) {
      return requirementsWarmupPromise
    }
    requirementsWarmupPromise = Promise.allSettled([
      analyticsApi.getYearlyTrend(),
      analyticsApi.getHourlyTrend(),
      analyticsApi.getWeeklyTrend(),
      analyticsApi.getTypesProportion({ limit: 10 }),
      analyticsApi.getYearlyTrend({ primary_type: ['HOMICIDE'] }),
      analyticsApi.getLocationTypes({ limit: 10 }),
      analyticsApi.getDangerousBlocksTop({ limit: 10 }),
      analyticsApi.getDistrictsComparison({ limit: 10 }),
      analyticsApi.getArrestsRate(),
      analyticsApi.getYearlyTrend({ domestic: [true] }),
      analyticsApi.getTypesSeasonalCompare({ limit: 8 }),
      analyticsApi.getCommunityTop10({ limit: 10 }),
      analyticsApi.getCaseNumberQuality()
    ])
      .catch(() => undefined)
      .then(() => undefined)
    return requirementsWarmupPromise
  }
}

export default api

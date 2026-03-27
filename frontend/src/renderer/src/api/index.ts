import axios from 'axios'

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

export type ApiCacheStatus = 'HIT' | 'MISS' | 'NONE'

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

interface RequestTraceMeta {
  id: string
  startedAt: number
}

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

type RequestHistoryListener = () => void

const requestHistory: RequestHistoryEntry[] = []
const requestHistoryListeners = new Set<RequestHistoryListener>()
const requestHistoryLimit = 50

const emitHistoryChanged = (): void => {
  requestHistoryListeners.forEach((listener) => listener())
}

const getCacheStatus = (value?: string): ApiCacheStatus => {
  if (value === 'HIT' || value === 'MISS') {
    return value
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

export const getRequestHistory = (): RequestHistoryEntry[] => [...requestHistory]

export const clearRequestHistory = (): void => {
  requestHistory.length = 0
  emitHistoryChanged()
}

export const subscribeRequestHistory = (listener: RequestHistoryListener): (() => void) => {
  requestHistoryListeners.add(listener)
  return () => {
    requestHistoryListeners.delete(listener)
  }
}

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 10000
})

api.interceptors.request.use((config) => {
  const traceMeta: RequestTraceMeta = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    startedAt: performance.now()
  }
  config.__traceMeta = traceMeta
  return config
})

// Response interceptor for generic error handling
api.interceptors.response.use(
  (response) => {
    const traceMeta = response.config.__traceMeta
    const retryAttempt = Number(response.config.__retryAttempt ?? 0)
    const startedAt = traceMeta?.startedAt ?? performance.now()
    const endedAt = performance.now()
    const requestId = getRequestIdFromPayload(response.data) ?? response.headers['x-request-id']
    appendRequestHistory({
      id: traceMeta?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      method: String(response.config.method ?? 'GET').toUpperCase(),
      url: String(response.config.url ?? ''),
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
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
      const startedAt = traceMeta?.startedAt ?? performance.now()
      const endedAt = performance.now()
      appendRequestHistory({
        id: traceMeta?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method: String(error.config?.method ?? 'GET').toUpperCase(),
        url: String(error.config?.url ?? ''),
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
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
  let attempt = 0
  while (attempt <= maxRetries) {
    try {
      const response = await api.get<ApiResponse<T>>(url, {
        params,
        __retryAttempt: attempt
      })
      return response as unknown as ApiResponse<T>
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
}

export const analyticsApi = {
  getYearlyTrend: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/trend/yearly', params),
  getWeeklyTrend: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/trend/weekly', params),
  getHourlyTrend: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/trend/hourly', params),
  getTypesProportion: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/types/proportion', params),
  getDistrictsComparison: (params?: Record<string, unknown>) =>
    get<Record<string, unknown>[]>('/analytics/districts/comparison', params),
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

  getGeoHeatmap: (params?: { year?: number; month?: number }) =>
    api.get('/analytics/geo/heatmap', { params }).then((res: any) => res.data),

  getGeoDistricts: (params?: { year?: number; month?: number }) =>
    api.get('/analytics/geo/districts', { params }).then((res: any) => res.data)
}

export default api

import { useEffect, useMemo, useState } from 'react'
import {
  clearRequestHistory,
  getRequestHistory,
  subscribeRequestHistory,
  type RequestHistoryEntry
} from '../api'

export interface RequestHistorySummary {
  total: number
  failed: number
  cacheHit: number
  avgDurationMs: number
}

export const useRequestHistory = (
  pathPrefixes: string[] = []
): {
  entries: RequestHistoryEntry[]
  summary: RequestHistorySummary
  clear: () => void
} => {
  const [history, setHistory] = useState<RequestHistoryEntry[]>(() => getRequestHistory())

  useEffect(() => {
    return subscribeRequestHistory(() => {
      setHistory(getRequestHistory())
    })
  }, [])

  const entries = useMemo(() => {
    if (pathPrefixes.length === 0) {
      return history
    }
    return history.filter((entry) => pathPrefixes.some((prefix) => entry.url.startsWith(prefix)))
  }, [history, pathPrefixes])

  const summary = useMemo<RequestHistorySummary>(() => {
    if (entries.length === 0) {
      return {
        total: 0,
        failed: 0,
        cacheHit: 0,
        avgDurationMs: 0
      }
    }
    const failed = entries.filter((entry) => !entry.success).length
    const cacheHit = entries.filter(
      (entry) => entry.cacheStatus === 'HIT' || entry.cacheStatus === 'MEMORY_HIT'
    ).length
    const totalDuration = entries.reduce((accumulator, entry) => accumulator + entry.durationMs, 0)
    return {
      total: entries.length,
      failed,
      cacheHit,
      avgDurationMs: totalDuration / entries.length
    }
  }, [entries])

  return {
    entries,
    summary,
    clear: clearRequestHistory
  }
}

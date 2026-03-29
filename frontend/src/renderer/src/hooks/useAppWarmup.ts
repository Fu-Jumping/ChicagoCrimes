import { useEffect, useMemo, useState } from 'react'
import { analyticsApi, type WarmupProgressSnapshot } from '../api'

const MIN_WARMUP_OVERLAY_MS = 900
const MAX_WARMUP_OVERLAY_MS = 6000
const REQUIREMENTS_WARMUP_DELAY_MS = 300
const INITIAL_PROGRESS: WarmupProgressSnapshot = {
  completed: 0,
  total: 6,
  key: 'boot',
  label: '正在初始化分析缓存'
}

export const useAppWarmup = (): {
  isWarmupActive: boolean
  progress: WarmupProgressSnapshot
  progressPercent: number
} => {
  const [isWarmupActive, setIsWarmupActive] = useState(true)
  const [progress, setProgress] = useState<WarmupProgressSnapshot>(INITIAL_PROGRESS)

  useEffect(() => {
    let cancelled = false
    const startedAt = performance.now()
    const forceHideTimer = window.setTimeout(() => {
      if (!cancelled) {
        setIsWarmupActive(false)
      }
    }, MAX_WARMUP_OVERLAY_MS)

    const runWarmup = async (): Promise<void> => {
      try {
        await analyticsApi.warmupAppData((snapshot) => {
          if (!cancelled) {
            setProgress(snapshot)
          }
        })
      } catch (error) {
        console.error('App warmup failed', error)
      } finally {
        window.clearTimeout(forceHideTimer)
        const elapsed = performance.now() - startedAt
        const remaining = Math.max(0, MIN_WARMUP_OVERLAY_MS - elapsed)
        if (remaining > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remaining))
        }
        if (!cancelled) {
          setIsWarmupActive(false)
          if (import.meta.env.MODE !== 'test') {
            window.setTimeout(() => {
              void analyticsApi.warmupRequirementsData()
            }, REQUIREMENTS_WARMUP_DELAY_MS)
          }
        }
      }
    }

    void runWarmup()

    return () => {
      cancelled = true
      window.clearTimeout(forceHideTimer)
    }
  }, [])

  const progressPercent = useMemo(() => {
    if (progress.total <= 0) {
      return 0
    }
    return Math.max(8, Math.min(100, Math.round((progress.completed / progress.total) * 100)))
  }, [progress.completed, progress.total])

  return {
    isWarmupActive,
    progress,
    progressPercent
  }
}

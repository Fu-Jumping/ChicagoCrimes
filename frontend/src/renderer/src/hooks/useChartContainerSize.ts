import { useEffect, useRef, useState, type RefObject } from 'react'

interface ChartContainerSize {
  width: number
  height: number
}

interface UseChartContainerSizeOptions {
  throttleMs?: number
  minDelta?: number
}

const initialSize: ChartContainerSize = { width: 0, height: 0 }

const useChartContainerSize = (
  options: UseChartContainerSizeOptions = {}
): {
  containerRef: RefObject<HTMLDivElement | null>
  containerSize: ChartContainerSize
} => {
  const { throttleMs = 120, minDelta = 12 } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState<ChartContainerSize>(initialSize)
  const pendingSizeRef = useRef<ChartContainerSize | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const lastEmitAtRef = useRef(0)
  const lastSizeRef = useRef<ChartContainerSize>(initialSize)

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const commitSize = (nextSize: ChartContainerSize): void => {
      const lastSize = lastSizeRef.current
      const widthDelta = Math.abs(nextSize.width - lastSize.width)
      const heightDelta = Math.abs(nextSize.height - lastSize.height)
      if (lastSize.width > 0 && widthDelta < minDelta && heightDelta < minDelta) {
        return
      }
      lastSizeRef.current = nextSize
      lastEmitAtRef.current = Date.now()
      setContainerSize(nextSize)
    }

    const flushPending = (): void => {
      timeoutRef.current = null
      if (!pendingSizeRef.current) {
        return
      }
      commitSize(pendingSizeRef.current)
      pendingSizeRef.current = null
    }

    const queueSize = (nextSize: ChartContainerSize): void => {
      if (nextSize.width <= 0 || nextSize.height <= 0) {
        return
      }
      if (lastSizeRef.current.width <= 0) {
        commitSize(nextSize)
        return
      }
      const elapsed = Date.now() - lastEmitAtRef.current
      if (elapsed >= throttleMs) {
        commitSize(nextSize)
        return
      }
      pendingSizeRef.current = nextSize
      if (timeoutRef.current !== null) {
        return
      }
      timeoutRef.current = window.setTimeout(flushPending, throttleMs - elapsed)
    }

    const observer = new ResizeObserver((entries) => {
      const firstEntry = entries[0]
      if (!firstEntry) {
        return
      }
      const nextSize: ChartContainerSize = {
        width: firstEntry.contentRect.width,
        height: firstEntry.contentRect.height
      }
      queueSize(nextSize)
    })
    observer.observe(element)

    queueSize({
      width: element.clientWidth,
      height: element.clientHeight
    })

    return () => {
      observer.disconnect()
      pendingSizeRef.current = null
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [minDelta, throttleMs])

  return { containerRef, containerSize }
}

export default useChartContainerSize

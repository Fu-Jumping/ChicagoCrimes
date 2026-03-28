import React, { useEffect, useMemo, useRef } from 'react'
import { Typography } from 'antd'

interface TimelinePlayerProps {
  currentMonth: number | null
  onChange: (month: number | null) => void
  loading?: boolean
}

interface TimelineOption {
  value: number | null
  label: string
}

const TIMELINE_OPTIONS: TimelineOption[] = [
  { value: null, label: '全年' },
  ...Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: `${index + 1} 月`
  }))
]

const SELECTOR_HEIGHT = 56
const EDGE_PADDING = SELECTOR_HEIGHT * 2

const TimelinePlayer: React.FC<TimelinePlayerProps> = ({
  currentMonth,
  onChange,
  loading = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const frameRef = useRef<number | null>(null)

  const activeIndex = useMemo(
    () => TIMELINE_OPTIONS.findIndex((option) => option.value === currentMonth),
    [currentMonth]
  )

  useEffect(() => {
    const index = activeIndex >= 0 ? activeIndex : 0
    const target = itemRefs.current[index]
    target?.scrollIntoView?.({ block: 'center', inline: 'nearest' })
  }, [activeIndex])

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    },
    []
  )

  const updateValueFromCenter = (): void => {
    const scroller = scrollRef.current
    if (!scroller) return

    const containerRect = scroller.getBoundingClientRect()
    const containerCenter = containerRect.top + containerRect.height / 2
    let nearestValue: number | null = currentMonth
    let nearestDistance = Number.POSITIVE_INFINITY

    itemRefs.current.forEach((element, index) => {
      if (!element) return
      const rect = element.getBoundingClientRect()
      const elementCenter = rect.top + rect.height / 2
      const distance = Math.abs(elementCenter - containerCenter)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestValue = TIMELINE_OPTIONS[index]?.value ?? null
      }
    })

    if (nearestValue !== currentMonth) {
      onChange(nearestValue)
    }
  }

  const handleScroll = (): void => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
    }
    frameRef.current = window.requestAnimationFrame(() => {
      updateValueFromCenter()
      frameRef.current = null
    })
  }

  const handleSelect = (index: number): void => {
    const option = TIMELINE_OPTIONS[index]
    if (!option) return
    onChange(option.value)
    itemRefs.current[index]?.scrollIntoView?.({ block: 'center', inline: 'nearest' })
  }

  return (
    <div
      style={{
        padding: '16px 12px',
        background: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Typography.Text
        type="secondary"
        style={{ marginBottom: 12, fontSize: 12, textAlign: 'center' }}
      >
        月份滑动选择
      </Typography.Text>

      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 18, fontWeight: 600 }}>
        {currentMonth === null ? '全年' : `${currentMonth} 月`}
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div
          data-testid="timeline-center-indicator"
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            top: '50%',
            height: SELECTOR_HEIGHT,
            transform: 'translateY(-50%)',
            borderRadius: 14,
            border: '1px solid rgba(0, 240, 255, 0.45)',
            background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.08), rgba(22, 119, 255, 0.12))',
            boxShadow: '0 0 16px rgba(0, 240, 255, 0.12)',
            pointerEvents: 'none'
          }}
        />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            position: 'absolute',
            inset: 0,
            overflowY: 'auto',
            scrollSnapType: 'y mandatory',
            scrollbarWidth: 'thin',
            paddingBlock: EDGE_PADDING
          }}
        >
          {TIMELINE_OPTIONS.map((option, index) => {
            const selected = option.value === currentMonth
            const testId =
              option.value === null ? 'timeline-option-all' : `timeline-option-${option.value}`
            return (
              <button
                key={option.label}
                ref={(element) => {
                  itemRefs.current[index] = element
                }}
                data-testid={testId}
                type="button"
                aria-pressed={selected}
                onClick={() => handleSelect(index)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: SELECTOR_HEIGHT,
                  marginBottom: 8,
                  border: 'none',
                  borderRadius: 12,
                  background: selected ? 'rgba(22, 119, 255, 0.24)' : 'transparent',
                  color: selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontSize: 14,
                  fontWeight: selected ? 700 : 500,
                  cursor: loading ? 'wait' : 'pointer',
                  scrollSnapAlign: 'center',
                  transition: 'background 0.2s ease, color 0.2s ease, transform 0.2s ease',
                  transform: selected ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            marginTop: 12,
            color: 'var(--color-text-secondary)',
            fontSize: 12,
            textAlign: 'center'
          }}
        >
          数据加载中...
        </div>
      ) : null}
    </div>
  )
}

export default TimelinePlayer

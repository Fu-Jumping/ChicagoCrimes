import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('publishes only the latest value after the debounce window', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 180), {
      initialProps: { value: 'initial' }
    })

    rerender({ value: 'month-1' })
    rerender({ value: 'month-2' })
    rerender({ value: 'month-3' })

    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(179)
    })

    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(result.current).toBe('month-3')
  })
})

import { describe, expect, it } from 'vitest'
import {
  createMemoryHitTiming,
  createRequestTraceMeta,
  finalizeRequestTiming
} from './requestTiming'

describe('requestTiming', () => {
  it('records real-world timestamps while still computing duration from a monotonic clock', () => {
    const traceMeta = createRequestTraceMeta('request-1', {
      wallClockNow: () => 1_710_000_000_000,
      perfNow: () => 250.5
    })

    const timing = finalizeRequestTiming(traceMeta, {
      wallClockNow: () => 1_710_000_000_380,
      perfNow: () => 294.8
    })

    expect(traceMeta.startedAt).toBe(1_710_000_000_000)
    expect(timing.startedAt).toBe(1_710_000_000_000)
    expect(timing.endedAt).toBe(1_710_000_000_380)
    expect(timing.durationMs).toBeCloseTo(44.3, 5)
  })

  it('uses the same real-world timestamp for instant memory-cache hits', () => {
    const timing = createMemoryHitTiming(() => 1_710_000_123_456)

    expect(timing.startedAt).toBe(1_710_000_123_456)
    expect(timing.endedAt).toBe(1_710_000_123_456)
    expect(timing.durationMs).toBe(0)
  })
})

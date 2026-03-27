export interface RequestTraceMeta {
  id: string
  startedAt: number
  startedAtPerf: number
}

export interface RequestTimingSnapshot {
  startedAt: number
  endedAt: number
  durationMs: number
}

interface RequestTimingClock {
  wallClockNow?: () => number
  perfNow?: () => number
}

const defaultWallClockNow = (): number => Date.now()
const defaultPerfNow = (): number => performance.now()

const resolveClock = (
  clock: RequestTimingClock = {}
): Required<RequestTimingClock> => ({
  wallClockNow: clock.wallClockNow ?? defaultWallClockNow,
  perfNow: clock.perfNow ?? defaultPerfNow
})

export const createRequestTraceMeta = (
  id: string,
  clock: RequestTimingClock = {}
): RequestTraceMeta => {
  const { wallClockNow, perfNow } = resolveClock(clock)
  return {
    id,
    startedAt: wallClockNow(),
    startedAtPerf: perfNow()
  }
}

export const finalizeRequestTiming = (
  traceMeta?: RequestTraceMeta,
  clock: RequestTimingClock = {}
): RequestTimingSnapshot => {
  const { wallClockNow, perfNow } = resolveClock(clock)
  const endedAt = wallClockNow()
  const endedAtPerf = perfNow()
  const startedAt = traceMeta?.startedAt ?? endedAt
  const startedAtPerf = traceMeta?.startedAtPerf ?? endedAtPerf

  return {
    startedAt,
    endedAt,
    durationMs: Math.max(0, endedAtPerf - startedAtPerf)
  }
}

export const createMemoryHitTiming = (
  wallClockNow: () => number = defaultWallClockNow
): RequestTimingSnapshot => {
  const timestamp = wallClockNow()
  return {
    startedAt: timestamp,
    endedAt: timestamp,
    durationMs: 0
  }
}

import { useEffect, useState } from 'react'

export const useDebouncedValue = <T>(value: T, delayMs = 160): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [delayMs, value])

  return debouncedValue
}

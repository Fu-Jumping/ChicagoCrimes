import { describe, expect, it } from 'vitest'
import { getChartTheme } from './chartTheme'

describe('chartTheme', () => {
  it('returns layered palette values for dark and light modes', () => {
    const dark = getChartTheme('dark')
    const light = getChartTheme('light')

    expect(dark.lineFillGradient.length).toBeGreaterThan(0)
    expect(light.tooltipBackground).toContain('rgba')
  })
})

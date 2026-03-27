import { describe, expect, it } from 'vitest'
import { getMapTheme } from './mapTheme'

describe('mapTheme', () => {
  it('returns tile, heat, and district overlay tokens for both themes', () => {
    expect(getMapTheme('dark').districtStroke).toBeTruthy()
    expect(getMapTheme('light').heatGradient[0]).toBeTruthy()
  })
})
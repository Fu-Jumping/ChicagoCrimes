import { describe, expect, it } from 'vitest'
import { translateLocationType } from './locationTypeMap'

describe('translateLocationType', () => {
  it('normalizes spacing and casing before lookup', () => {
    expect(translateLocationType(' parking lot ')).toBe(translateLocationType('PARKING LOT'))
  })

  it('supports slash variants used by the dataset', () => {
    expect(translateLocationType('PARKING LOT / GARAGE (NON.RESID.)')).toBe(
      translateLocationType('PARKING LOT/GARAGE(NON.RESID.)')
    )
  })
})

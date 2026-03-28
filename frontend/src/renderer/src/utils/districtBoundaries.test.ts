import { describe, expect, it } from 'vitest'
import { hasMeaningfulDistrictBoundaries } from './districtBoundaries'

describe('districtBoundaries', () => {
  it('treats the bundled single-rectangle placeholder as non-meaningful', () => {
    const placeholder = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { dist_num: '01' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-87.6, 41.8],
                [-87.6, 41.9],
                [-87.5, 41.9],
                [-87.5, 41.8],
                [-87.6, 41.8]
              ]
            ]
          }
        }
      ]
    }

    expect(hasMeaningfulDistrictBoundaries(placeholder)).toBe(false)
  })
})

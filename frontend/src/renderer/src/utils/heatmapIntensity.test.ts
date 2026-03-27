import { describe, expect, it } from 'vitest'
import { buildHeatmapLayerModel } from './heatmapIntensity'

describe('heatmapIntensity', () => {
  it('normalizes hotspot intensity instead of saturating everything to full red', () => {
    const model = buildHeatmapLayerModel([
      { lat: 41.8, lng: -87.6, count: 12 },
      { lat: 41.81, lng: -87.61, count: 24 },
      { lat: 41.82, lng: -87.62, count: 48 },
      { lat: 41.83, lng: -87.63, count: 96 },
      { lat: 41.84, lng: -87.64, count: 192 },
      { lat: 41.85, lng: -87.65, count: 4800 }
    ])

    const intensities = model.points.map((point) => point[2])

    expect(intensities.every((value) => value >= 0.04 && value <= 1)).toBe(true)
    expect(new Set(intensities.map((value) => value.toFixed(3))).size).toBeGreaterThan(3)
    expect(intensities.at(-1)).toBe(1)
  })

  it('uses a tighter radius and blur when the current filter scope is very broad', () => {
    const sparseModel = buildHeatmapLayerModel(
      Array.from({ length: 80 }, (_, index) => ({
        lat: 41.7 + index * 0.001,
        lng: -87.7 + index * 0.001,
        count: 10 + index
      }))
    )

    const denseModel = buildHeatmapLayerModel(
      Array.from({ length: 18000 }, (_, index) => ({
        lat: 41.6 + (index % 300) * 0.001,
        lng: -87.8 + Math.floor(index / 300) * 0.001,
        count: 5 + (index % 200)
      }))
    )

    expect(denseModel.options.radius).toBeLessThan(sparseModel.options.radius)
    expect(denseModel.options.blur).toBeLessThan(sparseModel.options.blur)
  })
})

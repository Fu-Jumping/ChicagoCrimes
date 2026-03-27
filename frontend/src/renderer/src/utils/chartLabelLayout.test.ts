import { describe, expect, it } from 'vitest'
import {
  distributeLabelYPositions,
  resolveLeaderLineLayout,
  type LeaderLineAnchor
} from './chartLabelLayout'

describe('chartLabelLayout', () => {
  it('keeps redistributed labels inside the drawable range while preserving order', () => {
    const positions = distributeLabelYPositions([0, 6, 10, 15], {
      minY: -20,
      maxY: 20,
      minGap: 12
    })

    expect(positions).toEqual([-16, -4, 8, 20])
  })

  it('stops the leader line outside the text bounds on the right side', () => {
    const layout = resolveLeaderLineLayout({
      anchor: 'start',
      textX: 92,
      text: '示例标签 12.3%',
      middleX: 80,
      y: 18
    })

    expect(layout.lineEndX).toBeLessThan(layout.textLeft)
    expect(layout.points.at(-1)?.[0]).toBe(layout.lineEndX)
    expect(layout.points.at(-1)?.[1]).toBe(18)
  })

  it('stops the leader line outside the text bounds on the left side', () => {
    const layout = resolveLeaderLineLayout({
      anchor: 'end',
      textX: -92,
      text: '示例标签 12.3%',
      middleX: -80,
      y: -18
    })

    expect(layout.lineEndX).toBeGreaterThan(layout.textRight)
    expect(layout.points.at(-1)?.[0]).toBe(layout.lineEndX)
    expect(layout.points.at(-1)?.[1]).toBe(-18)
  })

  it('exports the anchor type used by both pie and rose charts', () => {
    const anchor: LeaderLineAnchor = 'start'
    expect(anchor).toBe('start')
  })
})

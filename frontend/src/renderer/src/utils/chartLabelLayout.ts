export type LeaderLineAnchor = 'start' | 'end'

export interface DistributeLabelYPositionsOptions {
  minY: number
  maxY: number
  minGap: number
}

export interface ResolveLeaderLineLayoutInput {
  anchor: LeaderLineAnchor
  textX: number
  text: string
  middleX: number
  y: number
  textWidth?: number
  linePadding?: number
  elbowPadding?: number
}

export interface ResolveLeaderLineLayoutResult {
  textWidth: number
  textLeft: number
  textRight: number
  lineEndX: number
  elbowX: number
  points: [[number, number], [number, number]]
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

export const estimateLabelTextWidth = (text: string): number =>
  Array.from(text).reduce((width, char) => {
    const charCode = char.charCodeAt(0)
    return width + (charCode <= 0xff ? 6.2 : 10.8)
  }, 4)

export const distributeLabelYPositions = (
  desiredYPositions: number[],
  options: DistributeLabelYPositionsOptions
): number[] => {
  if (desiredYPositions.length === 0) {
    return []
  }

  const { minY, maxY, minGap } = options
  const positions = desiredYPositions.map((value) => clamp(value, minY, maxY))

  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index], positions[index - 1]! + minGap)
  }

  const last = positions[positions.length - 1]
  if (last !== undefined && last > maxY) {
    const overflow = last - maxY
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] -= overflow
    }
  }

  const first = positions[0]
  if (first !== undefined && first < minY) {
    const underflow = minY - first
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] += underflow
    }
  }

  positions[positions.length - 1] = clamp(positions[positions.length - 1]!, minY, maxY)
  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(positions[index]!, positions[index + 1]! - minGap)
  }

  positions[0] = clamp(positions[0]!, minY, maxY)
  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index]!, positions[index - 1]! + minGap)
  }

  return positions.map((value) => clamp(value, minY, maxY))
}

export const resolveLeaderLineLayout = (
  input: ResolveLeaderLineLayoutInput
): ResolveLeaderLineLayoutResult => {
  const linePadding = input.linePadding ?? 14
  const elbowPadding = input.elbowPadding ?? 12
  const textWidth = input.textWidth ?? estimateLabelTextWidth(input.text)
  const textLeft = input.anchor === 'start' ? input.textX : input.textX - textWidth
  const textRight = input.anchor === 'start' ? input.textX + textWidth : input.textX
  const lineEndX = input.anchor === 'start' ? textLeft - linePadding : textRight + linePadding
  const distanceToMiddle = Math.abs(lineEndX - input.middleX)
  const elbowOffset = Math.min(elbowPadding, distanceToMiddle / 2)
  const elbowX = lineEndX - Math.sign(lineEndX - input.middleX || 1) * elbowOffset

  return {
    textWidth,
    textLeft,
    textRight,
    lineEndX,
    elbowX,
    points: [
      [elbowX, input.y],
      [lineEndX, input.y]
    ]
  }
}

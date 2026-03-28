export interface HeatmapDatum {
  lat: number
  lng: number
  count: number
}

export interface HeatmapLayerOptions {
  radius: number
  blur: number
  maxZoom: number
  gradient: Record<number, string>
}

export interface HeatmapLayerModel {
  points: Array<[number, number, number]>
  options: HeatmapLayerOptions
}

interface RelativeIntensityOptions {
  minimumIntensity?: number
  percentile?: number
}

const DEFAULT_MINIMUM_INTENSITY = 0.04
const DEFAULT_PERCENTILE = 0.94

const DEFAULT_GRADIENT: Record<number, string> = {
  0.4: 'blue',
  0.6: 'cyan',
  0.7: 'lime',
  0.8: 'yellow',
  1: 'red'
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const getQuantile = (values: number[], percentile: number): number => {
  if (values.length === 0) {
    return 0
  }

  const clampedPercentile = clamp(percentile, 0, 1)
  const index = (values.length - 1) * clampedPercentile
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  const lowerValue = values[lowerIndex] ?? values[0] ?? 0
  const upperValue = values[upperIndex] ?? lowerValue

  if (lowerIndex === upperIndex) {
    return lowerValue
  }

  return lowerValue + (upperValue - lowerValue) * (index - lowerIndex)
}

const getAdaptiveLayerOptions = (
  pointCount: number
): Pick<HeatmapLayerOptions, 'radius' | 'blur'> => {
  if (pointCount >= 18000) {
    return { radius: 10, blur: 8 }
  }
  if (pointCount >= 10000) {
    return { radius: 12, blur: 9 }
  }
  if (pointCount >= 5000) {
    return { radius: 14, blur: 11 }
  }
  if (pointCount >= 2000) {
    return { radius: 16, blur: 12 }
  }

  return { radius: 20, blur: 15 }
}

export const buildRelativeIntensityNormalizer = (
  values: number[],
  options: RelativeIntensityOptions = {}
): ((value: number) => number) => {
  const minimumIntensity = options.minimumIntensity ?? DEFAULT_MINIMUM_INTENSITY
  const percentile = options.percentile ?? DEFAULT_PERCENTILE

  const transformedValues = values
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.log1p(Math.max(value, 0)))
    .sort((left, right) => left - right)

  if (transformedValues.length === 0) {
    return () => minimumIntensity
  }

  const cap = Math.max(getQuantile(transformedValues, percentile), transformedValues[0] ?? 0, 1)

  return (value: number): number => {
    const scaled = Math.log1p(Math.max(value, 0))
    const normalized = clamp(scaled / cap, 0, 1)
    return clamp(Math.max(normalized, minimumIntensity), minimumIntensity, 1)
  }
}

export const buildHeatmapLayerModel = (data: HeatmapDatum[]): HeatmapLayerModel => {
  const validPoints = data.filter(
    (point) =>
      Number.isFinite(point.lat) && Number.isFinite(point.lng) && Number.isFinite(point.count)
  )
  const normalizeIntensity = buildRelativeIntensityNormalizer(
    validPoints.map((point) => point.count)
  )

  return {
    points: validPoints.map(
      (point) => [point.lat, point.lng, normalizeIntensity(point.count)] as [number, number, number]
    ),
    options: {
      ...getAdaptiveLayerOptions(validPoints.length),
      maxZoom: 12,
      gradient: DEFAULT_GRADIENT
    }
  }
}

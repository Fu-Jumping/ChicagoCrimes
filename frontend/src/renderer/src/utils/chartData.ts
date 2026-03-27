export type GenericRow = Record<string, unknown>

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

const normalizeText = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return null
}

export interface NormalizedChartResult {
  data: GenericRow[]
  downgradedCount: number
}

export const normalizeSeriesData = (
  rows: GenericRow[],
  categoryField: string,
  metricField: string,
  categoryFallback: string
): NormalizedChartResult => {
  let downgradedCount = 0
  const data = rows.map((row, index) => {
    const normalizedCategory =
      normalizeText(row[categoryField] ?? row.key) ?? `${categoryFallback}${index + 1}`
    const normalizedMetric = normalizeNumber(row[metricField]) ?? 0
    const usedFallback =
      normalizedCategory !== (normalizeText(row[categoryField]) ?? '') ||
      normalizeNumber(row[metricField]) === null

    if (usedFallback) {
      downgradedCount += 1
    }

    return {
      ...row,
      [categoryField]: normalizedCategory,
      [metricField]: normalizedMetric,
      key: normalizeText(row.key) ?? normalizedCategory
    }
  })

  return {
    data,
    downgradedCount
  }
}

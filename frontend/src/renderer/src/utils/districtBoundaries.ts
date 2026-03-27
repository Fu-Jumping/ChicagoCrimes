interface DistrictBoundaryCollection {
  type?: string
  features?: unknown[]
}

export const hasMeaningfulDistrictBoundaries = (
  collection: DistrictBoundaryCollection | null | undefined
): boolean => {
  if (!collection || collection.type !== 'FeatureCollection') {
    return false
  }

  return Array.isArray(collection.features) && collection.features.length > 1
}

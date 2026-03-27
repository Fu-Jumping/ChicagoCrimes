import { describe, expect, it } from 'vitest'
import { getRoutePresentation, ROUTE_PRESENTATIONS } from './routePresentation'

describe('routePresentation', () => {
  it('maps every primary route to a dedicated presentation profile', () => {
    expect(getRoutePresentation('/').backgroundKey).toBe('overview')
    expect(getRoutePresentation('/trend').backgroundKey).toBe('trend')
    expect(getRoutePresentation('/type').backgroundKey).toBe('type')
    expect(getRoutePresentation('/district').backgroundKey).toBe('district')
    expect(getRoutePresentation('/map').title).toBe('空间地图')
  })

  it('falls back to the overview presentation for unknown routes', () => {
    expect(getRoutePresentation('/missing')).toBe(ROUTE_PRESENTATIONS['/'])
  })
})

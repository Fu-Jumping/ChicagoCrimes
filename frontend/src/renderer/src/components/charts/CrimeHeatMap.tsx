import React, { useEffect, useMemo, useRef } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import chicagoDistricts from '../../assets/chicago-districts.json'
import { hasMeaningfulDistrictBoundaries } from '../../utils/districtBoundaries'
import {
  buildHeatmapLayerModel,
  buildRelativeIntensityNormalizer
} from '../../utils/heatmapIntensity'
import { getMapTheme } from '../../utils/mapTheme'
import { useThemeMode } from '../../hooks/useThemeMode'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

interface HeatMapProps {
  heatData: Array<{ lat: number; lng: number; count: number }>
  districtData: Array<{ district: string; count: number }>
  onDistrictClick?: (district: string) => void
}

const HeatLayer = ({ data }: { data: HeatMapProps['heatData'] }): null => {
  const map = useMap()
  const layerRef = useRef<L.Layer | null>(null)
  const { theme } = useThemeMode()
  const mapTheme = useMemo(() => getMapTheme(theme), [theme])
  
  const layerModel = useMemo(() => {
    const model = buildHeatmapLayerModel(data)
    if (model.options) {
      // Overwrite the default gradient from buildHeatmapLayerModel with the theme gradient
      model.options.gradient = mapTheme.heatGradient.reduce((acc, color, index, arr) => {
        acc[index / (arr.length - 1)] = color
        return acc
      }, {} as Record<number, string>)
    }
    return model
  }, [data, mapTheme])

  useEffect(() => {
    if (!map) {
      return
    }

    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }

    layerRef.current = (L as typeof L & {
      heatLayer: (
        items: Array<[number, number, number]>,
        options: Record<string, unknown>
      ) => L.Layer
    })
      .heatLayer(layerModel.points, layerModel.options)
      .addTo(map)

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
      }
    }
  }, [layerModel, map])

  return null
}

const CrimeHeatMap: React.FC<HeatMapProps> = ({ heatData, districtData, onDistrictClick }) => {
  const { theme } = useThemeMode()
  const mapTheme = useMemo(() => getMapTheme(theme), [theme])
  const center: [number, number] = [41.8781, -87.6298]
  const showDistrictOverlay = hasMeaningfulDistrictBoundaries(chicagoDistricts)
  const districtStats = useMemo(() => {
    const normalizeIntensity = buildRelativeIntensityNormalizer(
      districtData.map((item) => item.count),
      {
        minimumIntensity: 0.18,
        percentile: 0.9
      }
    )

    return new Map(
      districtData.map((item) => {
        const key = String(item.district).padStart(2, '0')
        const relativeOpacity = 0.08 + normalizeIntensity(item.count) * 0.27

        return [
          key,
          {
            count: item.count,
            fillOpacity: Math.min(0.35, relativeOpacity)
          }
        ]
      })
    )
  }, [districtData])

  const getDistrictStyle = (districtNum?: string | number): L.PathOptions => {
    const stat = districtStats.get(String(districtNum ?? '').padStart(2, '0'))

    return {
      fillColor: stat ? 'rgba(0, 240, 255, 0.35)' : 'transparent',
      weight: 2,
      opacity: 0.55,
      color: mapTheme.districtStroke,
      fillOpacity: stat?.fillOpacity ?? 0.08
    }
  }

  const onEachFeature = (
    feature: { properties?: { dist_num?: string } },
    layer: L.Layer
  ): void => {
    const districtNum = feature.properties?.dist_num
    const pathLayer = layer as L.Path

    pathLayer.setStyle(getDistrictStyle(districtNum))
    pathLayer.on({
      mouseover: () => {
        pathLayer.setStyle({ fillOpacity: 0.32, color: '#6bff83' })
      },
      mouseout: () => {
        pathLayer.setStyle(getDistrictStyle(districtNum))
      },
      click: () => {
        if (districtNum && onDistrictClick) {
          onDistrictClick(String(districtNum))
        }
      }
    })
  }

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: '100%', width: '100%', background: theme === 'dark' ? '#0e1320' : '#e6f4ff' }}
        zoomControl={true}
      >
        <TileLayer
          url={mapTheme.tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <HeatLayer data={heatData} />
        {showDistrictOverlay ? (
          <GeoJSON
            data={chicagoDistricts as GeoJSON.GeoJsonObject}
            style={(feature) => getDistrictStyle(feature?.properties?.dist_num)}
            onEachFeature={onEachFeature}
          />
        ) : null}
      </MapContainer>
    </div>
  )
}

export default CrimeHeatMap

import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import chicagoDistricts from '../../assets/chicago-districts.json'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl
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

const HeatLayer = ({ data }: { data: HeatMapProps['heatData'] }) => {
  const map = useMap()
  const layerRef = useRef<any>(null)

  useEffect(() => {
    if (!map) return
    
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }

    const points = data.map(p => [p.lat, p.lng, p.count * 0.1]) // scale intensity
    layerRef.current = (L as any).heatLayer(points, {
      radius: 20,
      blur: 15,
      maxZoom: 12,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map)

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current)
      }
    }
  }, [map, data])

  return null
}

const CrimeHeatMap: React.FC<HeatMapProps> = ({ heatData, districtData, onDistrictClick }) => {
  const center: [number, number] = [41.8781, -87.6298] // Chicago
  
  const getDistrictStyle = () => {
    return {
      fillColor: 'transparent',
      weight: 2,
      opacity: 0.5,
      color: '#00f0ff',
      fillOpacity: 0.1
    }
  }

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const districtNum = feature.properties.dist_num
    const stat = districtData.find(d => String(d.district).padStart(2, '0') === String(districtNum).padStart(2, '0'))
    
    layer.bindTooltip(`防区: ${districtNum}<br/>案件数: ${stat ? stat.count : 0}`, {
      sticky: true,
      className: 'district-tooltip'
    })

    layer.on({
      mouseover: (e) => {
        const target = e.target
        target.setStyle({ fillOpacity: 0.3, color: '#6bff83' })
      },
      mouseout: (e) => {
        const target = e.target
        target.setStyle(getDistrictStyle())
      },
      click: () => {
        if (onDistrictClick) onDistrictClick(districtNum)
      }
    })
  }

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%', background: '#0e1320' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <HeatLayer data={heatData} />
        <GeoJSON 
          data={chicagoDistricts as any} 
          style={getDistrictStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </div>
  )
}

export default CrimeHeatMap

# 地理可视化套件 (Geo-Visualization Suite) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于 Leaflet 和后端新增的地理聚合接口，实现带有热力图、区域边界交互和按月时间轴播放器的地理可视化分析页面。

**Architecture:** 
1. **后端**：新增 `/api/v1/analytics/geo/heatmap` 接口返回经纬度聚合数据（按网格或直接返回坐标点用于热力图），新增 `/api/v1/analytics/geo/districts` 接口返回各区域的统计数据和边界（或前端自带 GeoJSON）。
2. **前端**：引入 `leaflet`、`react-leaflet` 和 `leaflet.heat`。新增 `/map` 路由和 `MapView` 页面。封装 `CrimeHeatMap` 组件处理地图渲染，封装 `TimelinePlayer` 处理时间轴播放逻辑。

**Tech Stack:** FastAPI, SQLAlchemy, React, Leaflet, react-leaflet, leaflet.heat

---

### Task 1: 后端 - 实现地理热力图接口

**Files:**
- Modify: `backend/app/routers/analytics.py`
- Modify: `backend/app/services/analytics.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_geo_analytics.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_geo_heatmap():
    response = client.get("/api/v1/analytics/geo/heatmap?year=2023")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "SUCCESS"
    assert "data" in data
    # 至少应包含 lat, lng, count 字段
    if len(data["data"]) > 0:
        assert "lat" in data["data"][0]
        assert "lng" in data["data"][0]
        assert "count" in data["data"][0]
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_geo_analytics.py -v`
Expected: FAIL with "404 Not Found"

**Step 3: Write minimal implementation**

```python
# backend/app/services/analytics.py (add function)
from sqlalchemy import func, and_

def get_geo_heatmap(db: Session, year: Optional[int] = None, month: Optional[int] = None):
    query = db.query(
        Crime.latitude.label("lat"),
        Crime.longitude.label("lng"),
        func.count(Crime.id).label("count")
    ).filter(
        Crime.latitude.isnot(None),
        Crime.longitude.isnot(None)
    )
    
    if year is not None:
        query = query.filter(Crime.year == year)
    if month is not None:
        # SQLite extract month
        query = query.filter(func.strftime('%m', Crime.date) == f"{month:02d}")
        
    # Group by exact coordinates for heatmap (or round to grid for performance)
    # For simplicity, round to 3 decimal places (~110m resolution)
    query = query.group_by(
        func.round(Crime.latitude, 3),
        func.round(Crime.longitude, 3)
    )
    
    results = query.all()
    return [{"lat": r.lat, "lng": r.lng, "count": r.count} for r in results]

# backend/app/routers/analytics.py (add endpoint)
@router.get("/geo/heatmap", response_model=ResponseModel)
async def get_geo_heatmap_endpoint(
    request: Request,
    year: Optional[int] = Query(None, ge=YEAR_MIN, le=YEAR_MAX),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db)
):
    data = analytics_service.get_geo_heatmap(db, year=year, month=month)
    return {
        "code": "SUCCESS",
        "message": "ok",
        "data": data,
        "meta": {
            "filters": {"year": year, "month": month},
            "dimension": ["lat", "lng"],
            "metrics": ["count"],
            "state_contract": build_state_contract(data),
            "data_quality": {"status": "pass", "alerts": []},
            "contract_version": CONTRACT_VERSION,
            "api_version": API_VERSION
        },
        "request_id": get_request_id(request)
    }
```

**Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_geo_analytics.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/routers/analytics.py backend/app/services/analytics.py backend/tests/test_geo_analytics.py
git commit -m "feat(backend): add geo heatmap endpoint"
```

---

### Task 2: 后端 - 实现区域统计接口 (用于地图交互)

**Files:**
- Modify: `backend/app/routers/analytics.py`
- Modify: `backend/app/services/analytics.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_geo_analytics.py (append)
def test_get_geo_districts():
    response = client.get("/api/v1/analytics/geo/districts?year=2023")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "SUCCESS"
    if len(data["data"]) > 0:
        assert "district" in data["data"][0]
        assert "count" in data["data"][0]
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_geo_analytics.py::test_get_geo_districts -v`
Expected: FAIL with "404 Not Found"

**Step 3: Write minimal implementation**

```python
# backend/app/services/analytics.py (add function)
def get_geo_districts(db: Session, year: Optional[int] = None, month: Optional[int] = None):
    query = db.query(
        Crime.district,
        func.count(Crime.id).label("count")
    ).filter(Crime.district.isnot(None))
    
    if year is not None:
        query = query.filter(Crime.year == year)
    if month is not None:
        query = query.filter(func.strftime('%m', Crime.date) == f"{month:02d}")
        
    query = query.group_by(Crime.district)
    results = query.all()
    return [{"district": r.district, "count": r.count} for r in results]

# backend/app/routers/analytics.py (add endpoint)
@router.get("/geo/districts", response_model=ResponseModel)
async def get_geo_districts_endpoint(
    request: Request,
    year: Optional[int] = Query(None, ge=YEAR_MIN, le=YEAR_MAX),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db)
):
    data = analytics_service.get_geo_districts(db, year=year, month=month)
    return {
        "code": "SUCCESS",
        "message": "ok",
        "data": data,
        "meta": {
            "filters": {"year": year, "month": month},
            "dimension": ["district"],
            "metrics": ["count"],
            "state_contract": build_state_contract(data),
            "data_quality": {"status": "pass", "alerts": []},
            "contract_version": CONTRACT_VERSION,
            "api_version": API_VERSION
        },
        "request_id": get_request_id(request)
    }
```

**Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_geo_analytics.py::test_get_geo_districts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/routers/analytics.py backend/app/services/analytics.py backend/tests/test_geo_analytics.py
git commit -m "feat(backend): add geo districts endpoint"
```

---

### Task 3: 前端 - 安装地图依赖并配置 API

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/renderer/src/api/index.ts`

**Step 1: Install dependencies**

Run: `cd frontend && npm install leaflet react-leaflet leaflet.heat && npm install -D @types/leaflet @types/leaflet.heat`

**Step 2: Add API methods**

```typescript
// frontend/src/renderer/src/api/index.ts (add to analyticsApi object)

  getGeoHeatmap: (params?: { year?: number; month?: number }) =>
    apiClient.get('/analytics/geo/heatmap', { params }).then((res) => res.data),

  getGeoDistricts: (params?: { year?: number; month?: number }) =>
    apiClient.get('/analytics/geo/districts', { params }).then((res) => res.data),
```

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/renderer/src/api/index.ts
git commit -m "feat(frontend): install leaflet and add geo apis"
```

---

### Task 4: 前端 - 准备芝加哥区域 GeoJSON 数据

**Files:**
- Create: `frontend/src/renderer/src/assets/chicago-districts.json`

**Step 1: Create GeoJSON file**
(We will use a simplified mock GeoJSON or fetch a real one if available. For the plan, we'll assume we create a basic file structure).

```json
// frontend/src/renderer/src/assets/chicago-districts.json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "dist_num": "01" },
      "geometry": { "type": "Polygon", "coordinates": [[[-87.6, 41.8], [-87.6, 41.9], [-87.5, 41.9], [-87.5, 41.8], [-87.6, 41.8]]] }
    }
  ]
}
```
*(Note: In actual execution, the agent should try to download a real Chicago police districts GeoJSON if possible, or use a robust mock).*

**Step 2: Commit**

```bash
git add frontend/src/renderer/src/assets/chicago-districts.json
git commit -m "chore(frontend): add chicago districts geojson"
```

---

### Task 5: 前端 - 创建 CrimeHeatMap 组件

**Files:**
- Create: `frontend/src/renderer/src/components/charts/CrimeHeatMap.tsx`
- Modify: `frontend/src/renderer/src/assets/main.css`

**Step 1: Write implementation**

```tsx
// frontend/src/renderer/src/components/charts/CrimeHeatMap.tsx
import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import chicagoDistricts from '../../assets/chicago-districts.json'

// Fix Leaflet icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
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
  
  const getDistrictStyle = (feature: any) => {
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
        target.setStyle(getDistrictStyle(feature))
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
```

```css
/* frontend/src/renderer/src/assets/main.css (append) */
.district-tooltip {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  padding: 8px;
}
.leaflet-container {
  font-family: inherit;
}
```

**Step 2: Commit**

```bash
git add frontend/src/renderer/src/components/charts/CrimeHeatMap.tsx frontend/src/renderer/src/assets/main.css
git commit -m "feat(frontend): create CrimeHeatMap component"
```

---

### Task 6: 前端 - 创建 TimelinePlayer 组件

**Files:**
- Create: `frontend/src/renderer/src/components/TimelinePlayer.tsx`

**Step 1: Write implementation**

```tsx
// frontend/src/renderer/src/components/TimelinePlayer.tsx
import React, { useState, useEffect } from 'react'
import { Slider, Button, Space } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'

interface TimelinePlayerProps {
  currentMonth: number | null
  onChange: (month: number | null) => void
}

const TimelinePlayer: React.FC<TimelinePlayerProps> = ({ currentMonth, onChange }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  
  useEffect(() => {
    let timer: number
    if (isPlaying) {
      timer = window.setInterval(() => {
        onChange((prev) => {
          if (prev === null) return 1
          if (prev >= 12) {
            setIsPlaying(false)
            return null // reset
          }
          return prev + 1
        })
      }, 1500) // 1.5s per month
    }
    return () => clearInterval(timer)
  }, [isPlaying, onChange])

  const togglePlay = () => setIsPlaying(!isPlaying)

  return (
    <div className="timeline-player" style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <Space style={{ width: '100%' }}>
        <Button 
          type="primary" 
          icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
          onClick={togglePlay}
        />
        <div style={{ width: '400px', padding: '0 16px' }}>
          <Slider
            min={1}
            max={12}
            value={currentMonth || 1}
            onChange={(val) => {
              setIsPlaying(false)
              onChange(val)
            }}
            marks={{
              1: '1月', 3: '3月', 6: '6月', 9: '9月', 12: '12月'
            }}
            tooltip={{ formatter: (val) => `${val}月` }}
          />
        </div>
        <Button onClick={() => { setIsPlaying(false); onChange(null); }}>
          重置 (全年)
        </Button>
      </Space>
    </div>
  )
}

export default TimelinePlayer
```

**Step 2: Commit**

```bash
git add frontend/src/renderer/src/components/TimelinePlayer.tsx
git commit -m "feat(frontend): create TimelinePlayer component"
```

---

### Task 7: 前端 - 创建 MapView 页面并集成

**Files:**
- Create: `frontend/src/renderer/src/views/MapView.tsx`
- Modify: `frontend/src/renderer/src/App.tsx`
- Modify: `frontend/src/renderer/src/components/AppLayout.tsx`
- Modify: `frontend/src/renderer/src/i18n/zh-CN.json`

**Step 1: Write MapView implementation**

```tsx
// frontend/src/renderer/src/views/MapView.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Card, Space } from 'antd'
import AnalysisPageShell from '../components/AnalysisPageShell'
import CrimeHeatMap from '../components/charts/CrimeHeatMap'
import TimelinePlayer from '../components/TimelinePlayer'
import YearFilterSelect from '../components/YearFilterSelect'
import DataStatePanel from '../components/DataStatePanel'
import { useGlobalFilters } from '../hooks/useGlobalFilters'
import { analyticsApi } from '../api'

const MapView: React.FC = () => {
  const { filters, setYear } = useGlobalFilters()
  const [month, setMonth] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [heatData, setHeatData] = useState([])
  const [districtData, setDistrictData] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [heatRes, distRes] = await Promise.all([
        analyticsApi.getGeoHeatmap({ year: filters.year ?? undefined, month: month ?? undefined }),
        analyticsApi.getGeoDistricts({ year: filters.year ?? undefined, month: month ?? undefined })
      ])
      setHeatData(heatRes.data)
      setDistrictData(distRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters.year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <AnalysisPageShell
      variant="dashboard"
      systemTag="空间分析引擎 // 卫星遥测"
      title="地理热力图"
      subtitle="基于经纬度的犯罪密度热力分布与区域聚合分析。"
      filter={<YearFilterSelect value={filters.year} onChange={setYear} />}
      debugTitle="地理请求调试"
      debugPathPrefixes={['/analytics/geo/heatmap', '/analytics/geo/districts']}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <TimelinePlayer currentMonth={month} onChange={setMonth} />
        
        <Card bordered={false} bodyStyle={{ padding: 0, height: '600px' }}>
          <DataStatePanel
            loading={loading}
            error={null}
            isEmpty={heatData.length === 0}
            onRetry={fetchData}
          >
            <CrimeHeatMap 
              heatData={heatData} 
              districtData={districtData} 
              onDistrictClick={(d) => console.log('Clicked district:', d)} 
            />
          </DataStatePanel>
        </Card>
      </Space>
    </AnalysisPageShell>
  )
}

export default MapView
```

**Step 2: Update Routing and Navigation**

```tsx
// frontend/src/renderer/src/App.tsx (add route)
import MapView from './views/MapView'
// ... inside Routes ...
<Route path="/map" element={<MapView />} />

// frontend/src/renderer/src/components/AppLayout.tsx (add to nav)
import { GlobalOutlined } from '@ant-design/icons'
// ... topNavItems ...
{ label: t('nav.map'), path: '/map' }
// ... pageContextMap ...
'/map': {
  label: t('nav.map'),
  icon: <GlobalOutlined />,
  desc: '基于地图的热力分布与区域动态演变分析'
}

// frontend/src/renderer/src/i18n/zh-CN.json (add translation)
// under "nav":
"map": "空间地图"
```

**Step 3: Commit**

```bash
git add frontend/src/renderer/src/views/MapView.tsx frontend/src/renderer/src/App.tsx frontend/src/renderer/src/components/AppLayout.tsx frontend/src/renderer/src/i18n/zh-CN.json
git commit -m "feat(frontend): integrate MapView and routing"
```

---

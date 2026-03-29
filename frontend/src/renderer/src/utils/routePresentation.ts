export type RouteBackgroundKey = 'overview' | 'trend' | 'type' | 'district' | 'map' | 'requirements'

export interface RoutePresentation {
  key: RouteBackgroundKey
  title: string
  eyebrow: string
  description: string
  backgroundKey: RouteBackgroundKey
}

const ROUTE_PRESENTATION_MAP: Record<string, RoutePresentation> = {
  '/': {
    key: 'overview',
    title: '综合总览',
    eyebrow: '城市态势总览',
    description: '总览芝加哥犯罪数据的趋势、类型结构与区域对比。',
    backgroundKey: 'overview'
  },
  '/trend': {
    key: 'trend',
    title: '趋势分析',
    eyebrow: '时间序列分析',
    description: '观察年份、月份、周内与小时维度的案件波动规律。',
    backgroundKey: 'trend'
  },
  '/type': {
    key: 'type',
    title: '类型分析',
    eyebrow: '事件类型分析',
    description: '比较案件类型占比、逮捕率与家暴案件构成。',
    backgroundKey: 'type'
  },
  '/district': {
    key: 'district',
    title: '区域分析',
    eyebrow: '空间差异分析',
    description: '对比分区案件总量与高发地点类型，定位重点区域。',
    backgroundKey: 'district'
  },
  '/map': {
    key: 'map',
    title: '空间地图',
    eyebrow: '空间热力分析',
    description: '在地图上查看案件热点、区域分布与空间聚集特征。',
    backgroundKey: 'map'
  },
  '/requirements': {
    key: 'requirements',
    title: '专项需求图表',
    eyebrow: '任务导向分析',
    description: '集中展示8项业务需求对应的专题图表与数据质量指标。',
    backgroundKey: 'requirements'
  }
}

export const getRoutePresentation = (pathname: string): RoutePresentation =>
  ROUTE_PRESENTATION_MAP[pathname] ?? ROUTE_PRESENTATION_MAP['/']

export const ROUTE_PRESENTATIONS = ROUTE_PRESENTATION_MAP

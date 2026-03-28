export interface MapTheme {
  tileUrl: string
  districtStroke: string
  heatGradient: string[]
  tooltipBackground: string
  tooltipColor: string
}

export const getMapTheme = (mode: 'dark' | 'light'): MapTheme => ({
  tileUrl:
    mode === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  districtStroke: mode === 'dark' ? '#77f7ff' : '#006dff',
  heatGradient:
    mode === 'dark'
      ? ['rgba(0,0,0,0)', '#00f0ff', '#00ffaa', '#fa8c16', '#ff4d4f']
      : ['rgba(0,0,0,0)', '#1677ff', '#52c41a', '#fa8c16', '#f5222d'],
  tooltipBackground: mode === 'dark' ? 'rgba(7, 13, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
  tooltipColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'
})

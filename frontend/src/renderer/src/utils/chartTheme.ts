export interface ChartTheme {
  tooltipBackground: string
  gridStroke: string
  lineFillGradient: [string, string]
  palette: string[]
  activeHighlight: string
  labelFill: string
}

export const getChartTheme = (mode: 'dark' | 'light'): ChartTheme => ({
  tooltipBackground: mode === 'dark' ? 'rgba(7, 13, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
  gridStroke: mode === 'dark' ? 'rgba(219, 252, 255, 0.10)' : 'rgba(16, 33, 58, 0.10)',
  lineFillGradient: mode === 'dark' 
    ? ['rgba(0, 240, 255, 0.28)', 'rgba(0, 240, 255, 0.02)']
    : ['rgba(22, 119, 255, 0.28)', 'rgba(22, 119, 255, 0.02)'],
  palette: mode === 'dark'
    ? ['#00f0ff', '#00ffaa', '#77f7ff', '#00aeff', '#006dff']
    : ['#1677ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16'],
  activeHighlight: mode === 'dark' ? '#ffffff' : '#000000',
  labelFill: mode === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)'
})

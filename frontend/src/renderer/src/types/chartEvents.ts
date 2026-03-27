export type ChartEventAction = 'select' | 'clear' | 'brush'
export type ChartEventTrigger = 'click' | 'brush'
export type ChartEventValue = string | number | boolean | Array<string | number>

export interface ChartInteractionEvent {
  sourceChart: string
  trigger: ChartEventTrigger
  action: ChartEventAction
  dimension: string
  value: ChartEventValue
  label: string
  timestamp: string
  rawData: Record<string, unknown>
}

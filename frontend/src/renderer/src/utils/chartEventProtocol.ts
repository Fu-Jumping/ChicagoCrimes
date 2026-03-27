import type {
  ChartEventAction,
  ChartEventTrigger,
  ChartEventValue,
  ChartInteractionEvent
} from '../types/chartEvents'

interface BuildChartEventInput {
  sourceChart: string
  trigger: ChartEventTrigger
  action: ChartEventAction
  dimension: string
  value: ChartEventValue
  label: string
  rawData: Record<string, unknown>
}

export const buildChartEvent = ({
  sourceChart,
  trigger,
  action,
  dimension,
  value,
  label,
  rawData
}: BuildChartEventInput): ChartInteractionEvent => ({
  sourceChart,
  trigger,
  action,
  dimension,
  value,
  label,
  timestamp: new Date().toISOString(),
  rawData
})

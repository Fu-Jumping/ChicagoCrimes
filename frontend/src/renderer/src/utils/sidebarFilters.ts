export const ALL_FILTER_OPTION = { label: '全部', value: '__all__' }

export type SidebarFilterFieldKey =
  | 'year'
  | 'month'
  | 'dateRange'
  | 'type'
  | 'arrest'
  | 'domestic'
  | 'district'
  | 'beat'
  | 'ward'
  | 'communityArea'

export interface SidebarFilterGroup {
  key: 'time' | 'event' | 'space'
  title: string
  description: string
  fields: SidebarFilterFieldKey[]
}

export const SIDEBAR_FILTER_GROUPS: SidebarFilterGroup[] = [
  {
    key: 'time',
    title: '时间范围',
    description: '限定当前分析的时间窗口。',
    fields: ['year', 'month', 'dateRange']
  },
  {
    key: 'event',
    title: '事件条件',
    description: '筛选具体案件类型与事件属性。',
    fields: ['type', 'arrest', 'domestic']
  },
  {
    key: 'space',
    title: '空间范围',
    description: '按分区、警区、选区和社区限定观察范围。',
    fields: ['district', 'beat', 'ward', 'communityArea']
  }
]

export const SIDEBAR_FILTER_LABELS = {
  sectionTitle: '全局分析参数',
  year: '分析年份',
  month: '月份筛选',
  type: '案件类型',
  dateRange: '日期范围',
  district: '分区筛选',
  beat: '警区筛选',
  ward: '选区筛选',
  communityArea: '社区筛选',
  arrest: '是否逮捕',
  domestic: '是否家暴'
} as const

export const formatBeatOptionLabel = (value: string): string => `警区 ${value}`

export const formatWardOptionLabel = (value: number): string => `第 ${value} 选区`

export const formatCommunityAreaOptionLabel = (value: number): string => `社区 ${value}`

export const MONTH_FILTER_OPTIONS = [
  ALL_FILTER_OPTION,
  ...Array.from({ length: 12 }, (_, index) => ({
    label: `${index + 1} 月`,
    value: index + 1
  }))
]

export const DOMESTIC_FILTER_OPTIONS = [
  ALL_FILTER_OPTION,
  { label: '家暴案件', value: 'true' },
  { label: '非家暴案件', value: 'false' }
]

import { describe, expect, it } from 'vitest'
import {
  SIDEBAR_FILTER_GROUPS,
  SIDEBAR_FILTER_LABELS,
  formatBeatOptionLabel,
  formatCommunityAreaOptionLabel,
  formatWardOptionLabel
} from './sidebarFilters'

describe('sidebarFilters', () => {
  it('groups filters into time, event, and space sections', () => {
    expect(SIDEBAR_FILTER_GROUPS.map((group) => group.key)).toEqual(['time', 'event', 'space'])
    expect(SIDEBAR_FILTER_GROUPS[0]?.fields).toEqual(['year', 'month', 'dateRange'])
    expect(SIDEBAR_FILTER_GROUPS[2]?.fields).toContain('communityArea')
  })

  it('uses the approved Chinese control labels', () => {
    expect(SIDEBAR_FILTER_LABELS.sectionTitle).toBe('全局分析参数')
    expect(SIDEBAR_FILTER_LABELS.month).toBe('月份筛选')
    expect(SIDEBAR_FILTER_LABELS.beat).toBe('警区筛选')
    expect(SIDEBAR_FILTER_LABELS.ward).toBe('选区筛选')
    expect(SIDEBAR_FILTER_LABELS.communityArea).toBe('社区筛选')
  })

  it('formats english dimension options into Chinese labels', () => {
    expect(formatBeatOptionLabel('111')).toBe('警区 111')
    expect(formatWardOptionLabel(22)).toBe('第 22 选区')
    expect(formatCommunityAreaOptionLabel(5)).toBe('社区 5')
  })
})

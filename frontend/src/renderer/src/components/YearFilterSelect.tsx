import React from 'react'
import { Select } from 'antd'
import { ALL_FILTER_OPTION } from '../utils/sidebarFilters'

interface YearFilterSelectProps {
  value: number | number[] | null
  onChange: (year: number | number[] | null) => void
  mode?: 'multiple'
}

const years = Array.from({ length: 2023 - 2001 + 1 }, (_, index) => 2001 + index)

const YearFilterSelect: React.FC<YearFilterSelectProps> = ({ value, onChange, mode }) => {
  const safeValue =
    mode === 'multiple'
      ? value === null
        ? []
        : Array.isArray(value)
          ? value
          : [value]
      : Array.isArray(value)
        ? (value[0] ?? ALL_FILTER_OPTION.value)
        : (value ?? ALL_FILTER_OPTION.value)

  return (
    <Select<any>
      mode={mode}
      placeholder="选择年份"
      style={{ width: '100%' }}
      size="small"
      showSearch={false}
      value={safeValue}
      options={[
        ALL_FILTER_OPTION,
        ...years.map((year) => ({
          value: year,
          label: String(year)
        }))
      ]}
      onChange={(nextValue) => {
        if (mode === 'multiple') {
          const arr = Array.isArray(nextValue) ? nextValue : [nextValue]
          const filtered = arr.filter((v) => v !== ALL_FILTER_OPTION.value)
          onChange(filtered.length > 0 ? (filtered as number[]) : null)
        } else {
          onChange(nextValue === ALL_FILTER_OPTION.value ? null : (nextValue as number))
        }
      }}
    />
  )
}

export default YearFilterSelect

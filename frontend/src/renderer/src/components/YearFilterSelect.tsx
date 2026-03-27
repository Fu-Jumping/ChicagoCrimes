import React from 'react'
import { Select } from 'antd'
import { ALL_FILTER_OPTION } from '../utils/sidebarFilters'

interface YearFilterSelectProps {
  value: number | null
  onChange: (year: number | null) => void
}

const years = Array.from({ length: 2023 - 2001 + 1 }, (_, index) => 2001 + index)

const YearFilterSelect: React.FC<YearFilterSelectProps> = ({ value, onChange }) => {
  return (
    <Select<number | string>
      placeholder="选择年份"
      style={{ width: '100%' }}
      size="small"
      showSearch={false}
      value={value ?? ALL_FILTER_OPTION.value}
      options={[
        ALL_FILTER_OPTION,
        ...years.map((year) => ({
          value: year,
          label: String(year)
        }))
      ]}
      onChange={(nextValue) =>
        onChange(nextValue === ALL_FILTER_OPTION.value ? null : (nextValue as number))
      }
    />
  )
}

export default YearFilterSelect

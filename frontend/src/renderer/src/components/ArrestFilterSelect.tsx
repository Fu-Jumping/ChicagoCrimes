import React from 'react'
import { Select } from 'antd'
import { ALL_FILTER_OPTION } from '../utils/sidebarFilters'

interface ArrestFilterSelectProps {
  value: boolean | boolean[] | null
  onChange: (arrest: boolean | boolean[] | null) => void
  mode?: 'multiple'
}

const arrestOptions = [
  ALL_FILTER_OPTION,
  { label: '已逮捕', value: 'true' },
  { label: '未逮捕', value: 'false' }
]

const ArrestFilterSelect: React.FC<ArrestFilterSelectProps> = ({ value, onChange, mode }) => {
  const selectValue =
    mode === 'multiple'
      ? Array.isArray(value)
        ? value.map(String)
        : value !== null
          ? [String(value)]
          : []
      : value === null
        ? ALL_FILTER_OPTION.value
        : Array.isArray(value)
          ? value.length > 0
            ? String(value[0])
            : ALL_FILTER_OPTION.value
          : String(value)

  const handleChange = (nextValue: any): void => {
    if (mode === 'multiple') {
      const arr = Array.isArray(nextValue) ? nextValue : [nextValue]
      const filtered = arr.filter((v) => v !== ALL_FILTER_OPTION.value)
      if (filtered.length === 0) {
        onChange(null)
      } else {
        onChange(filtered.map((v) => v === 'true'))
      }
    } else {
      if (nextValue === ALL_FILTER_OPTION.value) {
        onChange(null)
      } else if (nextValue === 'true') {
        onChange(true)
      } else {
        onChange(false)
      }
    }
  }

  return (
    <Select
      mode={mode}
      value={selectValue}
      onChange={handleChange}
      options={arrestOptions}
      size="small"
      style={{ width: '100%' }}
      showSearch={false}
    />
  )
}

export default ArrestFilterSelect

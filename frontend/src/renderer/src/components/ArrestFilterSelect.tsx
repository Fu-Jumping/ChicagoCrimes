import React from 'react'
import { Select } from 'antd'
import { ALL_FILTER_OPTION } from '../utils/sidebarFilters'

interface ArrestFilterSelectProps {
  value: boolean | null
  onChange: (arrest: boolean | null) => void
}

const arrestOptions = [
  ALL_FILTER_OPTION,
  { label: '已逮捕', value: 'true' },
  { label: '未逮捕', value: 'false' }
]

const ArrestFilterSelect: React.FC<ArrestFilterSelectProps> = ({ value, onChange }) => {
  const selectValue = value === null ? ALL_FILTER_OPTION.value : String(value)

  const handleChange = (nextValue: string): void => {
    if (nextValue === ALL_FILTER_OPTION.value) {
      onChange(null)
    } else if (nextValue === 'true') {
      onChange(true)
    } else {
      onChange(false)
    }
  }

  return (
    <Select
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

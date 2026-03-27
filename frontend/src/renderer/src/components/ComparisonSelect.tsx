import React from 'react'
import { Select } from 'antd'

interface ComparisonSelectProps {
  value: number[]
  onChange: (years: number[]) => void
  excludeYear?: number | null
  maxCount?: number
}

const yearOptions = Array.from({ length: 23 }, (_, i) => 2001 + i).map((y) => ({
  label: `${y} 年`,
  value: y
}))

const ComparisonSelect: React.FC<ComparisonSelectProps> = ({
  value,
  onChange,
  excludeYear,
  maxCount = 4
}) => {
  const filteredOptions = excludeYear
    ? yearOptions.filter((o) => o.value !== excludeYear)
    : yearOptions

  return (
    <Select
      mode="multiple"
      allowClear
      placeholder="选择年份进行对比"
      value={value}
      onChange={(val) => onChange(val.slice(0, maxCount))}
      options={filteredOptions}
      maxTagCount={3}
      maxTagTextLength={6}
      size="small"
      style={{ minWidth: 200, maxWidth: 360 }}
      popupMatchSelectWidth={false}
      styles={{ popup: { root: { fontFamily: "'JetBrains Mono', monospace" } } }}
    />
  )
}

export default ComparisonSelect

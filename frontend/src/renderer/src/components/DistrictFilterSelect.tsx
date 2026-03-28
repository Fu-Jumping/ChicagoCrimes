import React, { useEffect, useState } from 'react'
import { Select } from 'antd'
import { analyticsApi } from '../api'
import { ALL_FILTER_OPTION } from '../utils/sidebarFilters'

interface DistrictFilterSelectProps {
  value: number | number[] | null
  onChange: (district: number | number[] | null) => void
  mode?: 'multiple'
}

const DistrictFilterSelect: React.FC<DistrictFilterSelectProps> = ({ value, onChange, mode }) => {
  const [options, setOptions] = useState<{ label: string; value: string | number }[]>([
    ALL_FILTER_OPTION
  ])

  useEffect(() => {
    analyticsApi
      .getDistrictsComparison({ limit: 30 })
      .then((response) => {
        const districts = (response.data as { district: string | number }[])
          .map((item) => Number(item.district))
          .filter((district) => Number.isFinite(district) && district > 0)
          .sort((left, right) => left - right)

        setOptions([
          ALL_FILTER_OPTION,
          ...districts.map((district) => ({ label: `第 ${district} 分区`, value: district }))
        ])
      })
      .catch(() => {})
  }, [])

  return (
    <Select
      mode={mode}
      value={
        mode === 'multiple'
          ? value === null
            ? []
            : Array.isArray(value)
              ? value
              : [value]
          : Array.isArray(value)
            ? (value[0] ?? ALL_FILTER_OPTION.value)
            : (value ?? ALL_FILTER_OPTION.value)
      }
      onChange={(nextValue) => {
        if (mode === 'multiple') {
          const arr = Array.isArray(nextValue) ? nextValue : [nextValue]
          const filtered = arr.filter((v) => v !== ALL_FILTER_OPTION.value)
          onChange(filtered.length > 0 ? (filtered as number[]) : null)
        } else {
          onChange(nextValue === ALL_FILTER_OPTION.value ? null : (nextValue as number))
        }
      }}
      options={options}
      size="small"
      style={{ width: '100%' }}
      popupMatchSelectWidth={false}
      showSearch={false}
    />
  )
}

export default DistrictFilterSelect

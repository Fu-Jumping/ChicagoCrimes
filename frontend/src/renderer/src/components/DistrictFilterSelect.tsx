import React, { useEffect, useState } from 'react'
import { Select } from 'antd'
import { analyticsApi } from '../api'
import { ALL_FILTER_OPTION } from '../utils/sidebarFilters'

interface DistrictFilterSelectProps {
  value: number | null
  onChange: (district: number | null) => void
}

const DistrictFilterSelect: React.FC<DistrictFilterSelectProps> = ({ value, onChange }) => {
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
      value={value ?? ALL_FILTER_OPTION.value}
      onChange={(nextValue) =>
        onChange(nextValue === ALL_FILTER_OPTION.value ? null : (nextValue as number))
      }
      options={options}
      size="small"
      style={{ width: '100%' }}
      popupMatchSelectWidth={false}
      showSearch={false}
    />
  )
}

export default DistrictFilterSelect

import React, { useEffect, useState } from 'react'
import { Select } from 'antd'
import { analyticsApi } from '../api'
import { translateCrimeType } from '../utils/crimeTypeMap'
import { ALL_FILTER_OPTION } from '../utils/sidebarFilters'

interface TypeFilterSelectProps {
  value: string | null
  onChange: (value: string | null) => void
}

const TypeFilterSelect: React.FC<TypeFilterSelectProps> = ({ value, onChange }) => {
  const [types, setTypes] = useState<{ label: string; value: string }[]>([ALL_FILTER_OPTION])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchTypes = async (): Promise<void> => {
      setLoading(true)
      try {
        const response = await analyticsApi.getTypesProportion({ limit: 20 })
        const options = response.data.map((item: Record<string, unknown>) => ({
          label: translateCrimeType(String(item.primary_type)),
          value: String(item.primary_type)
        }))
        setTypes([ALL_FILTER_OPTION, ...options])
      } catch (error) {
        console.error('Failed to fetch types', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchTypes()
  }, [])

  return (
    <Select
      showSearch={false}
      loading={loading}
      size="small"
      value={value ?? ALL_FILTER_OPTION.value}
      onChange={(nextValue) =>
        onChange(nextValue === ALL_FILTER_OPTION.value ? null : nextValue)
      }
      options={types}
      style={{ width: '100%', cursor: 'pointer' }}
      className="glow-select"
      styles={{ popup: { root: { fontFamily: 'var(--font-family-mono)' } } }}
    />
  )
}

export default TypeFilterSelect

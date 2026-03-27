import React, { useEffect, useState } from 'react'
import { Select } from 'antd'
import { analyticsApi } from '../api'
import { t } from '../i18n'

interface TypeFilterSelectProps {
  value: string | null
  onChange: (value: string | null) => void
}

const TypeFilterSelect: React.FC<TypeFilterSelectProps> = ({ value, onChange }) => {
  const [types, setTypes] = useState<{ label: string; value: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchTypes = async () => {
      setLoading(true)
      try {
        // Fetch top 20 types for the dropdown
        const res = await analyticsApi.getTypesProportion({ limit: 20 })
        const options = res.data.map((item: any) => ({
          label: item.primary_type,
          value: item.primary_type
        }))
        setTypes(options)
      } catch (e) {
        console.error('Failed to fetch types', e)
      } finally {
        setLoading(false)
      }
    }
    fetchTypes()
  }, [])

  return (
    <Select
      allowClear
      showSearch
      loading={loading}
      placeholder="选择犯罪类型"
      value={value}
      onChange={(val) => onChange(val || null)}
      options={types}
      style={{ width: '100%' }}
      className="glow-select"
      dropdownStyle={{ fontFamily: 'var(--font-family-mono)' }}
    />
  )
}

export default TypeFilterSelect

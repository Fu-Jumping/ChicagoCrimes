import React from 'react'
import { DatePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

const { RangePicker } = DatePicker
const cn = (...codes: number[]): string => String.fromCharCode(...codes)

interface DateRangeFilterProps {
  startDate: string | null
  endDate: string | null
  onChange: (startDate: string | null, endDate: string | null) => void
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ startDate, endDate, onChange }) => {
  const value: [Dayjs, Dayjs] | null =
    startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null

  const handleChange = (dates: unknown): void => {
    const nextDates = dates as [Dayjs | null, Dayjs | null] | null
    if (!nextDates || !nextDates[0] || !nextDates[1]) {
      onChange(null, null)
      return
    }

    onChange(nextDates[0].format('YYYY-MM-DD'), nextDates[1].format('YYYY-MM-DD'))
  }

  return (
    <RangePicker
      value={value}
      onChange={handleChange}
      format="YYYY-MM-DD"
      placeholder={[
        cn(0x5f00, 0x59cb, 0x65e5, 0x671f),
        cn(0x7ed3, 0x675f, 0x65e5, 0x671f)
      ]}
      size="small"
      style={{ width: '100%' }}
      allowClear
      inputReadOnly
    />
  )
}

export default DateRangeFilter

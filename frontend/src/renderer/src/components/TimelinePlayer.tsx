import React, { useState, useEffect } from 'react'
import { Slider, Button, Space } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'

interface TimelinePlayerProps {
  currentMonth: number | null
  onChange: (month: number | null) => void
}

const TimelinePlayer: React.FC<TimelinePlayerProps> = ({ currentMonth, onChange }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  
  useEffect(() => {
    let timer: number
    if (isPlaying) {
      timer = window.setInterval(() => {
        onChange((prev) => {
          if (prev === null) return 1
          if (prev >= 12) {
            setIsPlaying(false)
            return null // reset
          }
          return prev + 1
        })
      }, 1500) // 1.5s per month
    }
    return () => clearInterval(timer)
  }, [isPlaying, onChange])

  const togglePlay = () => setIsPlaying(!isPlaying)

  return (
    <div className="timeline-player" style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <Space style={{ width: '100%' }}>
        <Button 
          type="primary" 
          icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
          onClick={togglePlay}
        />
        <div style={{ width: '400px', padding: '0 16px' }}>
          <Slider
            min={1}
            max={12}
            value={currentMonth || 1}
            onChange={(val) => {
              setIsPlaying(false)
              onChange(val)
            }}
            marks={{
              1: '1月', 3: '3月', 6: '6月', 9: '9月', 12: '12月'
            }}
            tooltip={{ formatter: (val) => `${val}月` }}
          />
        </div>
        <Button onClick={() => { setIsPlaying(false); onChange(null); }}>
          重置 (全年)
        </Button>
      </Space>
    </div>
  )
}

export default TimelinePlayer

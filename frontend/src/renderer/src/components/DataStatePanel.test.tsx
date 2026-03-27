import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DataStatePanel from './DataStatePanel'

describe('DataStatePanel', () => {
  it('展示骨架加载态', () => {
    render(
      <DataStatePanel loading error={null} isEmpty={false}>
        <div>content</div>
      </DataStatePanel>
    )
    expect(screen.getByLabelText('加载中')).toBeInTheDocument()
  })

  it('展示错误态并支持重试', () => {
    const onRetry = vi.fn()
    render(
      <DataStatePanel
        loading={false}
        error={new Error('请求失败')}
        isEmpty={false}
        onRetry={onRetry}
      >
        <div>content</div>
      </DataStatePanel>
    )
    expect(screen.getByText('数据加载异常')).toBeInTheDocument()
    screen.getByRole('button', { name: '重新加载' }).click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('展示空态', () => {
    render(
      <DataStatePanel loading={false} error={null} isEmpty>
        <div>content</div>
      </DataStatePanel>
    )
    expect(screen.getByText('当前条件下暂无数据')).toBeInTheDocument()
  })
})

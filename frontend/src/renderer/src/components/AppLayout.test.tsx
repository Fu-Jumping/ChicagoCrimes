import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
import { GlobalFiltersProvider } from '../contexts/GlobalFiltersContext'
import { ThemeProvider } from '../contexts/ThemeContext'

describe('AppLayout', () => {
  it('渲染四个主导航入口', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <GlobalFiltersProvider>
            <AppLayout>
              <div>页面内容</div>
            </AppLayout>
          </GlobalFiltersProvider>
        </MemoryRouter>
      </ThemeProvider>
    )
    expect(screen.getAllByText('综合总览').length).toBeGreaterThan(0)
    expect(screen.getAllByText('趋势分析').length).toBeGreaterThan(0)
    expect(screen.getAllByText('类型分析').length).toBeGreaterThan(0)
    expect(screen.getAllByText('区域分析').length).toBeGreaterThan(0)
  })

  it('提供主题切换按钮', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <GlobalFiltersProvider>
            <AppLayout>
              <div>页面内容</div>
            </AppLayout>
          </GlobalFiltersProvider>
        </MemoryRouter>
      </ThemeProvider>
    )
    expect(screen.getAllByRole('button', { name: '切换为浅色主题' }).length).toBeGreaterThan(0)
  })
})

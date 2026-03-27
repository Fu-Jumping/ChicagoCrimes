import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import InsightCard from './InsightCard'

describe('InsightCard', () => {
  it('separates module title chrome from the chart content body', () => {
    const { container } = render(
      <InsightCard eyebrow="趋势模块" title="月度案件趋势" description="观察月度变化">
        <div>chart</div>
      </InsightCard>
    )

    expect(screen.getByText('趋势模块')).toBeInTheDocument()
    expect(screen.getByText('月度案件趋势')).toBeInTheDocument()
    expect(screen.getByText('观察月度变化')).toBeInTheDocument()
    expect(container.querySelector('.analysis-module-card__header')).toBeInTheDocument()
    expect(container.querySelector('.analysis-module-card__body')).toBeInTheDocument()
  })
})

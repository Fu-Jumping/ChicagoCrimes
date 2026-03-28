import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import SetupWizard from './SetupWizard'

const mockApi: Window['api'] = {
  selectCsvFile: vi.fn().mockResolvedValue({ canceled: true, path: null }),
  getSetupStore: vi.fn().mockResolvedValue({ setupCompleted: false, lastCsvPath: '' }),
  setSetupStore: vi.fn().mockResolvedValue(undefined)
}

describe('SetupWizard', () => {
  beforeEach(() => {
    window.api = mockApi
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders welcome step', () => {
    render(<SetupWizard onComplete={() => undefined} />)
    expect(screen.getByText(/首次设置向导/)).toBeInTheDocument()
    expect(screen.getByText(/欢迎使用芝加哥犯罪可视化/)).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { t } from './index'

describe('i18n', () => {
  it('返回已定义文案', () => {
    expect(t('nav.overview')).toBe('综合总览')
  })

  it('支持参数替换', () => {
    expect(t('global.yearTag', { value: 2024 })).toBe('年份：2024')
  })

  it('未知键返回键名', () => {
    expect(t('unknown.key')).toBe('unknown.key')
  })
})

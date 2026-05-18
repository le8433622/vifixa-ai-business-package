import { describe, it, expect } from '@jest/globals'
import { useT } from '../../src/lib/i18n'

describe('i18n useT', () => {
  it('vi returns Vietnamese', () => {
    const { t } = useT('vi')
    expect(t('common.loading')).toBe('Đang tải...')
    expect(t('nav.home')).toBe('Trang chủ')
  })

  it('en returns English', () => {
    const { t } = useT('en')
    expect(t('common.loading')).toBe('Loading...')
    expect(t('nav.home')).toBe('Home')
  })

  it('returns key for missing translation', () => {
    const { t } = useT('vi')
    expect(t('nonexistent.key')).toBe('nonexistent.key')
  })
})

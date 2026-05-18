import { describe, it, expect } from 'vitest'
import { translate, type Locale } from '../i18n'

describe('i18n translate', () => {
  const locales: Locale[] = ['vi', 'en']

  for (const locale of locales) {
    it(`${locale} has common.loading key`, () => {
      const val = translate('common.loading', locale)
      expect(val).toBeTruthy()
    })

    it(`${locale} has common.vnd key`, () => {
      expect(translate('common.vnd', locale)).toBe('₫')
    })

    it(`${locale} has common.usd key`, () => {
      expect(translate('common.usd', locale)).toBe('$')
    })

    it(`${locale} has common.thb key`, () => {
      expect(translate('common.thb', locale)).toBe('฿')
    })

    it(`${locale} has common.idr key`, () => {
      expect(translate('common.idr', locale)).toBe('Rp')
    })
  }

  it('vi returns Vietnamese translation', () => {
    expect(translate('common.loading', 'vi')).toBe('Đang tải...')
  })

  it('en returns English translation', () => {
    expect(translate('common.loading', 'en')).toBe('Loading...')
  })

  it('returns key itself for missing keys', () => {
    expect(translate('nonexistent.key', 'vi')).toBe('nonexistent.key')
  })
})

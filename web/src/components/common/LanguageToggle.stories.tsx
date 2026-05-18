import type { Meta, StoryObj } from '@storybook/react'
import { LanguageProvider, useLanguage } from './LanguageToggle'

const LanguageDisplay = () => {
  const { locale, setLocale, t } = useLanguage()
  return (
    <div className="p-4 space-y-3">
      <p>Locale: <strong>{locale}</strong></p>
      <p>common.loading = {t('common.loading')}</p>
      <p>common.save = {t('common.save')}</p>
      <button onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} className="px-4 py-2 bg-primary text-white rounded-lg">
        Switch to {locale === 'vi' ? 'English' : 'Tiếng Việt'}
      </button>
    </div>
  )
}

const meta = {
  title: 'Common/LanguageToggle',
  component: LanguageProvider,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof LanguageProvider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: <LanguageDisplay />,
  },
}

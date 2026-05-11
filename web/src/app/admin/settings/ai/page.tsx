'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

interface AppSetting {
  key: string
  value: string | null
  value_type: string
  category: string
  label: string
  description: string
  is_public: boolean
}

const AI_PROVIDERS = [
  { value: 'nvidia', label: 'NVIDIA NIM (Llama, Nemotron)' },
  { value: 'openai', label: 'OpenAI (GPT-4o, GPT-4)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
]

const AI_MODELS: Record<string, { value: string; label: string }[]> = {
  nvidia: [
    { value: 'meta/llama3-8b-instruct', label: 'Llama 3 8B Instruct' },
    { value: 'meta/llama3-70b-instruct', label: 'Llama 3 70B Instruct' },
    { value: 'nvidia/nemotron-4-340b-instruct', label: 'Nemotron 4 340B' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
  google: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
}

const AGENT_PROMPTS = [
  {
    key: 'ai_diagnosis_prompt',
    settingKey: 'ai_diagnosis_prompt',
    title: 'Diagnosis Agent',
    description: 'System prompt for AI-powered diagnostic conversations with customers',
    defaultPrompt: `You are a helpful home service diagnostic assistant. Your role is to:
1. Ask targeted questions to understand the customer's issue
2. Categorize the problem (electrical, plumbing, HVAC, etc.)
3. Estimate urgency level
4. Recommend appropriate service type
Be professional, empathetic, and concise. Always ask for photos when relevant.`,
  },
  {
    key: 'ai_warranty_prompt',
    settingKey: 'ai_warranty_prompt',
    title: 'Warranty Agent',
    description: 'System prompt for AI warranty claim processing',
    defaultPrompt: `You are a warranty claim processing assistant. Your role is to:
1. Verify warranty eligibility based on service date and policy
2. Identify the issue reported by the customer
3. Determine coverage level (full, partial, or none)
4. Provide clear explanation of the decision
Be fair, transparent, and follow the warranty policy strictly.`,
  },
  {
    key: 'ai_quality_prompt',
    settingKey: 'ai_quality_prompt',
    title: 'Quality Monitor Agent',
    description: 'System prompt for AI quality monitoring and trust scoring',
    defaultPrompt: `You are a quality monitoring assistant. Your role is to:
1. Review completed service interactions
2. Assess worker performance based on customer feedback and service records
3. Calculate trust scores based on punctuality, quality, and communication
4. Flag suspicious or low-quality interactions
Be objective and data-driven in your assessments.`,
  },
]

export default function AISettings() {
  const router = useRouter()
  const { toast } = useToast()
  const { isEnabled } = useFeatureFlags()
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modified, setModified] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'model' | 'prompts'>('model')
  const [selectedProvider, setSelectedProvider] = useState('nvidia')

  const fetchSettings = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('category', 'ai')
        .order('label', { ascending: true })

      if (error) throw error
      if (mountedRef.current) setSettings(data || [])

      const provider = (data ?? []).find((s: AppSetting) => s.key === 'ai_provider')
      if (provider?.value && mountedRef.current) setSelectedProvider(provider.value)
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error fetching AI settings:', err)
        toast('Failed to load AI settings', 'error')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [toast])

  const getSettingValue = useCallback((key: string): string => {
    if (key in modified) return modified[key]
    const setting = settings.find(s => s.key === key)
    return setting?.value || ''
  }, [modified, settings])

  const handleChange = useCallback((key: string, value: string) => {
    setModified(prev => ({ ...prev, [key]: value }))
    if (key === 'ai_provider') {
      setSelectedProvider(value)
      const defaultModel = (AI_MODELS[value] || [])[0]?.value || ''
      setModified(prev => ({ ...prev, [key]: value, ai_model: defaultModel }))
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (Object.keys(modified).length === 0) {
      toast('No changes to save', 'info')
      return
    }

    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      for (const [key, val] of Object.entries(modified)) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: val, updated_at: new Date().toISOString() })
          .eq('key', key)

        if (error) throw error
      }

      setModified({})
      toast('AI settings saved successfully', 'success')
      fetchSettings()
    } catch (err) {
      console.error('Error saving AI settings:', err)
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }, [modified, toast, router, fetchSettings])

  const fetchSettingsWithErrorHandling = useCallback(async () => {
    try {
      await fetchSettings();
    } catch (err) {
      console.error('Unexpected error in fetchSettings:', err);
    }
  }, [fetchSettings]);

  useEffect(() => {
    queueMicrotask(() => { fetchSettingsWithErrorHandling(); });
  }, [fetchSettingsWithErrorHandling]);

  const aiFeaturesEnabled = isEnabled('ai_chat') || isEnabled('ai_warranty') || isEnabled('ai_quality_monitor') || isEnabled('ai_suggestions')

  if (!aiFeaturesEnabled) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">AI Configuration</h1>
            <p className="text-gray-600 mt-1">Configure AI models, providers, and agent prompts</p>
          </div>
          <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
            ← Back to Settings
          </Link>
        </div>
        <FeatureDisabled
          feature="AI Features"
          message="All AI features are currently disabled. Enable them in Features settings first."
        />
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Quick Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Go to <Link href="/admin/settings/features" className="underline">Features</Link> and enable AI features</li>
            <li>Then return here to configure model parameters and prompts</li>
          </ol>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">AI Configuration</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const currentModels = AI_MODELS[selectedProvider] || []
  const currentModel = getSettingValue('ai_model')
  const currentTemperature = getSettingValue('ai_temperature')
  const currentMaxTokens = getSettingValue('ai_max_tokens')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">AI Configuration</h1>
          <p className="text-gray-600 mt-1">Configure AI provider, model, and agent prompts.</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      {/* Active AI Features */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Active AI Features</h3>
        <div className="flex flex-wrap gap-2">
          {(['ai_chat', 'ai_warranty', 'ai_quality_monitor', 'ai_suggestions'] as const).map(key => {
            const enabled = isEnabled(key)
            const labels: Record<string, string> = {
              ai_chat: 'AI Chat',
              ai_warranty: 'AI Warranty',
              ai_quality_monitor: 'Quality Monitor',
              ai_suggestions: 'AI Suggestions',
            }
            return (
              <span
                key={key}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  enabled
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                {labels[key]}: {enabled ? 'On' : 'Off'}
              </span>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'model', label: 'Model Settings' },
          { key: 'prompts', label: 'Agent Prompts' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'model' && (
        <div className="space-y-6">
          {/* Provider Selection */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Provider</h2>
              <p className="text-sm text-gray-600 mt-1">Select the LLM provider for all AI features.</p>
            </div>
            <div className="p-6">
              <select
                value={getSettingValue('ai_provider')}
                onChange={(e) => handleChange('ai_provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {AI_PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Model</h2>
              <p className="text-sm text-gray-600 mt-1">Choose the specific model for the selected provider.</p>
            </div>
            <div className="p-6">
              <select
                value={currentModel}
                onChange={(e) => handleChange('ai_model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {currentModels.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Model Parameters */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Model Parameters</h2>
              <p className="text-sm text-gray-600 mt-1">Fine-tune the model behavior.</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Temperature</label>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {currentTemperature || '0.7'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={currentTemperature || '0.7'}
                  onChange={(e) => handleChange('ai_temperature', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0.0 (Deterministic)</span>
                  <span>2.0 (Creative)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="256"
                  max="32768"
                  step="256"
                  value={currentMaxTokens || '4096'}
                  onChange={(e) => handleChange('ai_max_tokens', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Maximum length of model responses</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="space-y-6">
          {AGENT_PROMPTS.map(agent => {
            const currentPrompt = getSettingValue(agent.settingKey)
            const displayPrompt = currentPrompt || agent.defaultPrompt
            const isModified = agent.settingKey in modified
            const isDefault = !currentPrompt

            return (
              <div key={agent.key} className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{agent.title}</h2>
                      <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDefault && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          Using default
                        </span>
                      )}
                      {isModified && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          Modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <textarea
                    value={displayPrompt}
                    onChange={(e) => handleChange(agent.settingKey, e.target.value)}
                    rows={8}
                    placeholder="Enter system prompt..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {displayPrompt.length} characters
                    </span>
                    {currentPrompt && (
                      <button
                        onClick={() => handleChange(agent.settingKey, '')}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pending Changes Bar */}
      {Object.keys(modified).length > 0 && (
        <div className="mt-6 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            {Object.keys(modified).length} change(s) pending
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setModified({})}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
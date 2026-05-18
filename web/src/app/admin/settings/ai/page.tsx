'use client'

import { useState, useEffect } from 'react'
import Skeleton from '@/components/ui/Skeleton'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

const PROVIDERS = ['nvidia', 'openai', 'anthropic']
const MODELS: Record<string, string[]> = {
  nvidia: ['meta/llama3-8b-instruct', 'meta/llama3-70b-instruct', 'mistralai/mixtral-8x22b'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
}

export default function AISettings() {
  const { flags, isEnabled } = useFeatureFlags()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [provider, setProvider] = useState('nvidia')
  const [model, setModel] = useState('meta/llama3-8b-instruct')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})

  const [prompts, setPrompts] = useState({
    diagnosis: '',
    warranty: '',
    quality: '',
  })
  const [qualityConfig, setQualityConfig] = useState({
    min_quality_score: 70,
    auto_approve_threshold: 85,
    require_photo_review: true,
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('app_settings').select('key, value')
    if (!data) { setLoading(false); return }
    const cfg: Record<string, any> = {}
    data.forEach((r: any) => { cfg[r.key] = r.value })

    if (cfg.ai_model) {
      setProvider(cfg.ai_model.provider || 'nvidia')
      setModel(cfg.ai_model.model || 'meta/llama3-8b-instruct')
      setTemperature(cfg.ai_model.temperature ?? 0.7)
      setMaxTokens(cfg.ai_model.max_tokens ?? 2048)
    }
    if (cfg.ai_prompts) setPrompts(cfg.ai_prompts)
    if (cfg.ai_quality) setQualityConfig(cfg.ai_quality)
    if (cfg.ai_api_keys) setApiKeys(cfg.ai_api_keys)
    setLoading(false)
  }

  async function saveSetting(key: string, value: any) {
    setSaving(key)
    await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() })
    setSaving(null)
    toast('Đã lưu cấu hình', 'success')
  }

  if (!isEnabled('ai_chat') && !isEnabled('ai_warranty') && !isEnabled('ai_quality_monitor')) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Cấu hình AI</h1>
            <p className="text-gray-600 mt-1">Cấu hình mô hình AI, prompt và giám sát</p>
          </div>
          <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">← Quay lại</Link>
        </div>
        <FeatureDisabled feature="AI" message="Tính năng AI đang tắt. Bật trong Cài đặt tính năng trước." />
      </div>
    )
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto"><Skeleton variant="rect" height="384px" className="rounded-lg" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cấu hình AI</h1>
          <p className="text-gray-600 mt-1">Cấu hình mô hình AI, prompt và giám sát chất lượng</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">← Quay lại</Link>
      </div>

      <div className="space-y-6">
        {/* Model Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Mô hình AI</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
              <select value={provider} onChange={e => { setProvider(e.target.value); setModel(MODELS[e.target.value][0]) }}
                className="w-full px-3 py-2 border rounded-md text-sm">
                {PROVIDERS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô hình</label>
              <select value={model} onChange={e => setModel(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm">
                {(MODELS[provider] || []).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))}
                className="w-full" />
              <span className="text-xs text-gray-500">{temperature}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input type="number" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          </div>
          <button onClick={() => saveSetting('ai_model', { provider, model, temperature, max_tokens: maxTokens })}
            disabled={saving === 'ai_model'}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving === 'ai_model' ? 'Đang lưu...' : 'Lưu cấu hình mô hình'}
          </button>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">API Keys</h2>
          <div className="space-y-3">
            {PROVIDERS.map(p => (
              <div key={p}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{p} API Key</label>
                <div className="flex gap-2">
                  <input type="password" value={apiKeys[p] || ''} onChange={e => setApiKeys(prev => ({ ...prev, [p]: e.target.value }))}
                    placeholder={apiKeys[p] ? '••••••••' : `Nhập ${p} API key...`}
                    className="flex-1 px-3 py-2 border rounded-md text-sm font-mono" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => saveSetting('ai_api_keys', apiKeys)}
            disabled={saving === 'ai_api_keys'}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving === 'ai_api_keys' ? 'Đang lưu...' : 'Lưu API Keys'}
          </button>
        </div>

        {/* Agent Prompts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Prompt Agent</h2>
          <div className="space-y-4">
            {[
              { key: 'diagnosis' as const, label: 'Chẩn đoán', desc: 'Prompt cho AI chẩn đoán thiết bị' },
              { key: 'warranty' as const, label: 'Bảo hành', desc: 'Prompt cho AI xác định điều kiện bảo hành' },
              { key: 'quality' as const, label: 'Giám sát chất lượng', desc: 'Prompt cho AI đánh giá chất lượng dịch vụ' },
            ].map(agent => (
              <div key={agent.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{agent.label}</label>
                <p className="text-xs text-gray-500 mb-2">{agent.desc}</p>
                <textarea value={prompts[agent.key]} onChange={e => setPrompts(prev => ({ ...prev, [agent.key]: e.target.value }))}
                  rows={4} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
            ))}
          </div>
          <button onClick={() => saveSetting('ai_prompts', prompts)}
            disabled={saving === 'ai_prompts'}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving === 'ai_prompts' ? 'Đang lưu...' : 'Lưu Prompt'}
          </button>
        </div>

        {/* Quality Monitoring */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Giám sát chất lượng</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Điểm chất lượng tối thiểu ({qualityConfig.min_quality_score})</label>
              <input type="range" min="0" max="100" step="5" value={qualityConfig.min_quality_score}
                onChange={e => setQualityConfig(prev => ({ ...prev, min_quality_score: parseInt(e.target.value) }))} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngưỡng tự động duyệt ({qualityConfig.auto_approve_threshold})</label>
              <input type="range" min="50" max="100" step="5" value={qualityConfig.auto_approve_threshold}
                onChange={e => setQualityConfig(prev => ({ ...prev, auto_approve_threshold: parseInt(e.target.value) }))} className="w-full" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={qualityConfig.require_photo_review}
                onChange={e => setQualityConfig(prev => ({ ...prev, require_photo_review: e.target.checked }))} className="w-4 h-4" />
              <span className="text-sm">Yêu cầu ảnh khi đánh giá chất lượng</span>
            </label>
          </div>
          <button onClick={() => saveSetting('ai_quality', qualityConfig)}
            disabled={saving === 'ai_quality'}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving === 'ai_quality' ? 'Đang lưu...' : 'Lưu cấu hình chất lượng'}
          </button>
        </div>
      </div>
    </div>
  )
}

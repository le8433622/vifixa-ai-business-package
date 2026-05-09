// AI Config Settings Page - Stub
// Will be implemented in Step 3.

'use client'

import Link from 'next/link'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { FeatureDisabled } from '@/components/FeatureGuard'

export default function AISettings() {
  const { flags, isEnabled } = useFeatureFlags()

  if (!isEnabled('ai_chat') && !isEnabled('ai_warranty') && !isEnabled('ai_quality_monitor')) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">AI Configuration</h1>
            <p className="text-gray-600 mt-1">Configure AI models, prompts, and monitoring</p>
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
          <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Go to <Link href="/admin/settings/features" className="underline">Features</Link> and enable AI features</li>
            <li>Configure AI model (NVIDIA, OpenAI, etc.)</li>
            <li>Set up system prompts for each agent type</li>
            <li>Configure quality monitoring thresholds</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">AI Configuration</h1>
          <p className="text-gray-600 mt-1">Configure AI models, prompts, and monitoring</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-blue-600 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">AI Model Settings</h2>
          <p className="text-gray-600 mb-4">Current provider: NVIDIA. Configure model parameters.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value="meta/llama3-8b-instruct"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key Status</label>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                Configured
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Agent Prompts</h2>
          <p className="text-gray-600 mb-4">Edit system prompts for each AI agent.</p>
          {['Diagnosis', 'Warranty', 'Quality Monitor'].map(agent => (
            <div key={agent} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">{agent} Agent</h3>
              <p className="text-sm text-gray-600">Prompt configuration coming soon.</p>
            </div>
          ))}
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quality Monitoring</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isEnabled('ai_quality_monitor')} readOnly className="w-4 h-4" />
              <span className="text-sm">Enable AI Quality Monitor</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

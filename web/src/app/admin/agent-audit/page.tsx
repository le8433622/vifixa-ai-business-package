'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface AgentRun {
  id: string
  goal_id: string
  user_id: string
  persona: string
  plan: any[]
  current_step: number
  status: string
  started_at: string
  completed_at: string | null
  agent_goals?: { goal_type: string; goal_description: string }
}

interface AgentStep {
  id: string
  run_id: string
  step_index: number
  action_id: string
  action_input: any
  action_output: any
  status: string
  error_message: string | null
  started_at: string | null
  completed_at: string | null
}

export default function AgentAudit() {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPersona, setFilterPersona] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchRuns()
  }, [])

  async function fetchRuns() {
    try {
      setLoading(true)
      let query = supabase
        .from('agent_runs')
        .select('*, agent_goals(goal_type, goal_description)')
        .order('started_at', { ascending: false })
        .limit(50)

      if (filterPersona !== 'all') {
        query = query.eq('persona', filterPersona)
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query
      if (error) throw error
      setRuns(data || [])
    } catch (err: any) {
      console.error('Error fetching runs:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSteps(runId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_steps')
        .select('*')
        .eq('run_id', runId)
        .order('step_index', { ascending: true })

      if (error) throw error
      setSteps(data || [])
    } catch (err: any) {
      console.error('Error fetching steps:', err)
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'waiting_approval': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function getPersonaIcon(persona: string): string {
    switch (persona) {
      case 'customer': return '👤'
      case 'worker': return '🔧'
      case 'admin': return '🛡️'
      default: return '❓'
    }
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('vi-VN')
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🤖 Agent Audit</h1>
        <p className="text-gray-600 mt-1">Kiểm tra mọi hành động AI — Goal, Run, Step, Approval</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterPersona}
          onChange={(e) => { setFilterPersona(e.target.value); fetchRuns() }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">Tất cả persona</option>
          <option value="customer">👤 Khách hàng</option>
          <option value="worker">🔧 Thợ</option>
          <option value="admin">🛡️ Admin</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); fetchRuns() }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="running">Đang chạy</option>
          <option value="completed">Hoàn thành</option>
          <option value="failed">Thất bại</option>
          <option value="cancelled">Đã hủy</option>
        </select>
        <button
          onClick={fetchRuns}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          🔃 Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Runs List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Agent Runs ({runs.length})</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Đang tải...</div>
            ) : runs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Chưa có agent run nào</div>
            ) : (
              runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => { setSelectedRun(run); fetchSteps(run.id) }}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                    selectedRun?.id === run.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate flex-1">
                      {getPersonaIcon(run.persona)} {run.agent_goals?.goal_description || run.goal_id.slice(0, 20)}...
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(run.status)}`}>
                      {run.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{run.persona}</span>
                    <span>{run.plan?.length || 0} steps</span>
                    <span>{formatDate(run.started_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Steps Detail */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">
              {selectedRun ? `Steps — ${selectedRun.agent_goals?.goal_type || 'Goal'}` : 'Chọn một run để xem chi tiết'}
            </h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {!selectedRun ? (
              <div className="p-8 text-center text-gray-500">Chọn một agent run bên trái</div>
            ) : steps.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Chưa có steps</div>
            ) : (
              steps.map((step) => (
                <div key={step.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                        Step {step.step_index + 1}
                      </span>
                      <span className="text-sm font-medium">{step.action_id}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(step.status)}`}>
                      {step.status}
                    </span>
                  </div>
                  {step.action_input && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Input:</span>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(step.action_input, null, 2)}
                      </pre>
                    </div>
                  )}
                  {step.action_output && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Output:</span>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(step.action_output, null, 2)}
                      </pre>
                    </div>
                  )}
                  {step.error_message && (
                    <div className="mt-2 text-red-600 text-xs">
                      ❌ {step.error_message}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-400">
                    {step.started_at ? formatDate(step.started_at) : '—'}
                    {step.completed_at ? ` → ${formatDate(step.completed_at)}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

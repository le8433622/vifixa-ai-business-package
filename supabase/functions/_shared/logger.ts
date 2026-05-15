// 📋 Vifixa AI — Structured Logger
// Mọi log PHẢI qua utility này — không dùng console.log trực tiếp

export function logVifixa(
  module: string,
  action: string,
  data?: Record<string, unknown>,
) {
  const parts = [`[VIFIXA][${module}]`, action]
  if (data) {
    const meta = Object.entries(data)
      .map(([k, v]) => {
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
        return `${k}=${val}`
      })
      .join(' | ')
    parts.push('|', meta)
  }
  console.log(parts.join(' '))
}

// Shorthand cho các action phổ biến
export function logAuth(userId: string, status: 'success' | 'unauthorized' | 'forbidden', role?: string) {
  logVifixa('auth', status, { user_id: userId, role })
}

export function logApi(fn: string, status: number, userId?: string, latencyMs?: number) {
  logVifixa(fn, `status_${status}`, { user_id: userId, latency_ms: latencyMs })
}

export function logAi(agent: string, latencyMs: number, tokensIn?: number, tokensOut?: number) {
  logVifixa('ai', agent, { latency_ms: latencyMs, tokens_in: tokensIn, tokens_out: tokensOut })
}

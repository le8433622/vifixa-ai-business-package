// AI Audit v2.0 — Unified telemetry, logging, and monitoring

export interface AuditEntry {
  agentType: string
  input: unknown
  output: unknown
  userId?: string
  requestId?: string
  model?: string
  tokensIn?: number
  tokensOut?: number
  cost?: number
  latencyMs?: number
  cacheHit?: boolean
  promptVersion?: number
  metadata?: Record<string, unknown>
}

export class AIAudit {
  private supabase: any
  private buffer: AuditEntry[] = []
  private flushInterval = 5000
  private maxBufferSize = 20
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(supabase: any) {
    this.supabase = supabase
  }

  async log(entry: AuditEntry): Promise<void> {
    this.buffer.push(entry)
    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush()
    }
    this.startTimer()
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    const batch = this.buffer.splice(0)
    try {
      await this.supabase.from('ai_logs').insert(
        batch.map(e => ({
          agent_type: e.agentType,
          input: e.input,
          output: e.output,
          user_id: e.userId || null,
          request_id: e.requestId || null,
          model: e.model || null,
          tokens_in: e.tokensIn || 0,
          tokens_out: e.tokensOut || 0,
          cost: e.cost || 0,
          latency_ms: e.latencyMs || 0,
          cache_hit: e.cacheHit || false,
          prompt_version: e.promptVersion || 0,
          metadata: e.metadata || {},
        })),
        { onConflict: 'request_id', ignoreDuplicates: 'request_id' },
      )
    } catch (err) {
      console.error('[AIAudit] flush failed:', err)
    }
  }

  private startTimer(): void {
    if (this.timer) return
    this.timer = setInterval(() => { this.flush() }, this.flushInterval)
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    this.flush()
  }
}

export function createAIAudit(supabase: any): AIAudit {
  return new AIAudit(supabase)
}
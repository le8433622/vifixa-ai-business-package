import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAICore } from '../_shared/ai-core.ts'
import { createAIAudit } from '../_shared/ai-audit.ts'
import { verifyAuth, checkRateLimit, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1'
const EMBEDDING_MODEL = 'nvidia/nv-embed-qa-4'

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('NVIDIA_API_KEY') || ''
  const response = await fetch(`${NVIDIA_BASE}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  })
  if (!response.ok) throw new Error(`Embedding API ${response.status}`)
  const data = await response.json()
  return data.data?.[0]?.embedding || []
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let dot = 0, nA = 0, nB = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; nA += a[i] * a[i]; nB += b[i] * b[i] }
  const denom = Math.sqrt(nA) * Math.sqrt(nB)
  return denom === 0 ? 0 : dot / denom
}

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  try {
    const user = await verifyAuth(req)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    checkRateLimit(user.id, clientIp, { maxRequests: 30 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'search'

    switch (action) {
      case 'search': {
        const query = url.searchParams.get('q') || ''
        const type = url.searchParams.get('type') || 'worker'
        const limit = parseInt(url.searchParams.get('limit') || '10')
        if (!query) return jsonResponse({ error: 'Missing query' }, 400)

        const requestId = crypto.randomUUID()
        const queryEmbedding = await generateEmbedding(query)

        const { data: all } = await supabase
          .from('ai_embeddings')
          .select('*')
          .eq('content_type', type)

        const scored = (all || [])
          .map((e: any) => ({
            id: e.content_id,
            type: e.content_type,
            text: e.content_text,
            metadata: e.metadata,
            similarity: cosineSimilarity(queryEmbedding, e.embedding || []),
          }))
          .filter(r => r.similarity > 0.3)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit)
          .map(r => ({ ...r, similarity: Number(r.similarity.toFixed(3)) }))

        let aiEnhanced = null
        if (scored.length > 0) {
          const ai = createAICore(supabase, { requestId, userId: user.id })
          const enhancement = await ai.orchestrateInternal('suggestion', async () => ({
            systemPrompt: `Bạn là chuyên gia tìm kiếm. Phân tích kết quả và đưa ra gợi ý ngắn gọn.
Trả về JSON: {summary: string, top_match_reason: string, alternative_suggestions: string[]}`,
            userPrompt: `Tìm kiếm: "${query}"
Kết quả: ${scored.slice(0, 3).map(r => `${r.type}: ${r.text.slice(0, 100)}`).join(' | ')}
Phân tích:`,
          }))
          aiEnhanced = enhancement.success ? enhancement.data : null
        }

        const audit = createAIAudit(supabase)
        await audit.log({
          agentType: 'search', requestId,
          input: { query, type, results_count: scored.length },
          output: { results: scored, ai: aiEnhanced }, userId: user.id,
        })

        return jsonResponse({ results: scored, ai: aiEnhanced, query })
      }

      case 'index': {
        const { data: workers } = await supabase.from('workers')
          .select('id, skills, profiles!inner(full_name), rating, completed_jobs, service_areas')
          .limit(500)

        let indexed = 0
        for (const w of workers || []) {
          const text = `${w.profiles?.full_name || ''} ${(w.skills || []).join(' ')} ${(w.service_areas || []).join(' ')}`
          const embedding = await generateEmbedding(text)
          await supabase.from('ai_embeddings').upsert({
            content_type: 'worker', content_id: w.id,
            embedding, content_text: text,
            metadata: { name: w.profiles?.full_name, skills: w.skills, rating: w.rating },
          }, { onConflict: 'content_type,content_id' })
          indexed++
        }
        return jsonResponse({ success: true, indexed })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error: any) {
    if (error.name === 'AuthError') return jsonResponse({ error: error.message }, 401)
    if (error.name === 'RateLimitError') return jsonResponse({ error: error.message }, 429)
    console.error('Search error:', error)
    return jsonResponse({ error: error.message || 'Internal server error' }, 500)
  }
})
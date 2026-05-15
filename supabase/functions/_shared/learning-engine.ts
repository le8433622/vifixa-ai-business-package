// 📚 Vifixa Learning Engine — Học từ feedback, cập nhật memory
// Layer 5: AI càng dùng càng thông minh

export interface FeedbackEvent {
  userId: string
  type: 'order_completed' | 'order_cancelled' | 'rating' | 'correction' | 'conversation_end'
  data: any
  timestamp: string
}

export interface LearnedFact {
  key: string
  value: string
  category: 'preference' | 'behavior' | 'knowledge' | 'relationship'
  importance: number
  source: string
  expiresAt?: string
}

// ─── FEEDBACK PROCESSOR ──────────────────────────────────────

export function processFeedback(event: FeedbackEvent): LearnedFact[] {
  const facts: LearnedFact[] = []

  switch (event.type) {
    case 'order_completed':
      facts.push({
        key: `service_completed_${event.data.service_type}`,
        value: `User đã hoàn thành dịch vụ ${event.data.service_type}`,
        category: 'behavior',
        importance: 3,
        source: 'order_completed',
      })
      if (event.data.price) {
        facts.push({
          key: 'typical_spend',
          value: `${event.data.price} VND cho ${event.data.service_type}`,
          category: 'preference',
          importance: 2,
          source: 'order_completed',
        })
      }
      break

    case 'order_cancelled':
      facts.push({
        key: `cancelled_${event.data.reason || 'unknown'}`,
        value: `User hủy vì: ${event.data.reason || 'không rõ lý do'}`,
        category: 'behavior',
        importance: 4,
        source: 'order_cancelled',
      })
      break

    case 'rating':
      const rating = event.data.rating || 0
      facts.push({
        key: 'avg_rating',
        value: `Đánh giá TB: ${rating}/5`,
        category: 'preference',
        importance: 3,
        source: 'rating',
      })
      if (rating <= 2) {
        facts.push({
          key: 'dissatisfaction_reason',
          value: `Không hài lòng: ${event.data.comment || 'không có comment'}`,
          category: 'behavior',
          importance: 5,
          source: 'rating',
        })
      }
      break

    case 'correction':
      facts.push({
        key: `correction_${event.data.field}`,
        value: `User đã sửa: ${event.data.field} = ${event.data.value}`,
        category: 'knowledge',
        importance: 5,
        source: 'correction',
      })
      break

    case 'conversation_end':
      if (event.data.outcome === 'success') {
        facts.push({
          key: 'last_conversation_success',
          value: `Cuộc trò chuyện thành công: ${event.data.summary || 'N/A'}`,
          category: 'behavior',
          importance: 2,
          source: 'conversation_end',
        })
      }
      break
  }

  return facts
}

// ─── PERSONALITY ADAPTATION ─────────────────────────────────

export interface PersonalityDelta {
  field: string
  delta: number  // -1 to +1
  reason: string
}

export function adaptPersonality(
  currentProfile: any,
  events: FeedbackEvent[],
): PersonalityDelta[] {
  const deltas: PersonalityDelta[] = []

  for (const event of events) {
    switch (event.type) {
      case 'rating':
        if (event.data.rating >= 4) {
          deltas.push({
            field: 'empathy_level',
            delta: 0.05,
            reason: 'User hài lòng — duy trì empathy',
          })
        } else if (event.data.rating <= 2) {
          deltas.push({
            field: 'empathy_level',
            delta: 0.1,
            reason: 'User không hài lòng — cần thấu cảm hơn',
          })
        }
        break

      case 'order_cancelled':
        if (event.data.reason === 'too_expensive') {
          deltas.push({
            field: 'formality',
            delta: -0.1,
            reason: 'User nhạy cảm về giá — cần giải thích kỹ hơn',
          })
        }
        break

      case 'conversation_end':
        if (event.data.user_sentiment && event.data.user_sentiment < 0.3) {
          deltas.push({
            field: 'empathy_level',
            delta: 0.15,
            reason: 'User có sentiment thấp — tăng thấu cảm',
          })
          deltas.push({
            field: 'patience_level',
            delta: 0.1,
            reason: 'User khó tính — tăng kiên nhẫn',
          })
        }
        break
    }
  }

  return deltas
}

// ─── MEMORY CONSOLIDATION ──────────────────────────────────

export function consolidateMemory(
  existingMemories: Array<{ key: string; value: string; importance: number; lastAccess: string }>,
  newFacts: LearnedFact[],
): Array<{ key: string; value: string; importance: number; lastAccess: string }> {
  const memoryMap = new Map(existingMemories.map(m => [m.key, m]))

  for (const fact of newFacts) {
    const existing = memoryMap.get(fact.key)
    if (existing) {
      // Update: merge importance (take higher), refresh timestamp
      existing.importance = Math.max(existing.importance, fact.importance)
      existing.lastAccess = new Date().toISOString()
      
      // If new value is more specific or has higher importance, update value
      if (fact.importance > existing.importance) {
        existing.value = fact.value
      }
    } else {
      memoryMap.set(fact.key, {
        key: fact.key,
        value: fact.value,
        importance: fact.importance,
        lastAccess: new Date().toISOString(),
      })
    }
  }

  // Forget low-importance memories that haven't been accessed
  const now = Date.now()
  const consolidated = Array.from(memoryMap.values())
    .filter(m => {
      // Keep if important (>3) or accessed recently (<30 days)
      if (m.importance > 3) return true
      const daysSinceAccess = (now - new Date(m.lastAccess).getTime()) / (24 * 60 * 60 * 1000)
      return daysSinceAccess < 30
    })

  return consolidated
}

// ─── INSIGHT GENERATION ─────────────────────────────────

export function generateInsights(
  userMemories: Array<{ key: string; value: string; importance: number; category: string }>,
): string[] {
  const insights: string[] = []

  // Pattern: frequent cancellations
  const cancellations = userMemories.filter(m => m.key.startsWith('cancelled_'))
  if (cancellations.length >= 3) {
    insights.push(`⚠️ User hủy ${cancellations.length} đơn gần đây — có thể đang không hài lòng`)
  }

  // Pattern: high spender
  const spends = userMemories.filter(m => m.key === 'typical_spend')
  if (spends.length >= 3) {
    const avg = spends.reduce((s, m) => {
      const match = m.value.match(/(\d+)/)
      return s + (match ? parseInt(match[1]) : 0)
    }, 0) / spends.length
    if (avg > 1000000) {
      insights.push(`💰 User chi tiêu cao (TB ${avg.toLocaleString()}₫) — có thể upsell`)
    }
  }

  // Pattern: low ratings
  const lowRatings = userMemories.filter(m => m.key === 'dissatisfaction_reason')
  if (lowRatings.length >= 2) {
    insights.push(`📉 User có ${lowRatings.length} lần không hài lòng — cần chăm sóc đặc biệt`)
  }

  return insights
}

// ─── USER MODEL UPDATE ──────────────────────────────────

export function updateUserModel(
  currentModel: {
    preferences: Record<string, any>
    behavior: Record<string, any>
    trustScore: number
  },
  events: FeedbackEvent[],
) {
  const updated = { ...currentModel }

  for (const event of events) {
    switch (event.type) {
      case 'order_completed':
        updated.behavior.lastCompletedService = event.data.service_type
        updated.behavior.completedCount = (updated.behavior.completedCount || 0) + 1
        updated.trustScore = Math.min(1, (updated.trustScore || 0.5) + 0.05)
        break

      case 'order_cancelled':
        updated.behavior.lastCancelledReason = event.data.reason
        updated.trustScore = Math.max(0, (updated.trustScore || 0.5) - 0.1)
        break

      case 'rating':
        const ratings = updated.behavior.ratings || []
        ratings.push(event.data.rating)
        updated.behavior.ratings = ratings
        if (event.data.rating >= 4) updated.trustScore = Math.min(1, (updated.trustScore || 0.5) + 0.1)
        else if (event.data.rating <= 2) updated.trustScore = Math.max(0, (updated.trustScore || 0.5) - 0.1)
        break

      case 'correction':
        updated.preferences[event.data.field] = event.data.value
        break
    }
  }

  return updated
}

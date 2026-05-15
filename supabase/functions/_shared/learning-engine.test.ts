import { assertEquals, assertExists, assert } from 'https://deno.land/std/testing/asserts.ts'
import { processFeedback, consolidateMemory, generateInsights, updateUserModel, adaptPersonality } from './learning-engine.ts'

Deno.test('[VIFIXA_TEST] learning: processFeedback creates facts for order_completed', () => {
  const facts = processFeedback({
    userId: 'user-1',
    type: 'order_completed',
    data: { service_type: 'repair', price: 450000 },
    timestamp: new Date().toISOString(),
  })
  assert(facts.length > 0)
  assertEquals(facts[0].category, 'behavior')
  console.log('[VIFIXA_TEST] OK: order_completed generates', facts.length, 'facts')
})

Deno.test('[VIFIXA_TEST] learning: processFeedback handles low rating', () => {
  const facts = processFeedback({
    userId: 'user-1',
    type: 'rating',
    data: { rating: 2, comment: 'Không hài lòng' },
    timestamp: new Date().toISOString(),
  })
  const diss = facts.find(f => f.key === 'dissatisfaction_reason')
  assertExists(diss, 'Should create dissatisfaction fact')
  assertEquals(diss?.importance, 5, 'Dissatisfaction should have high importance')
  console.log('[VIFIXA_TEST] OK: Low rating generates high-importance dissatisfaction fact')
})

Deno.test('[VIFIXA_TEST] learning: consolidateMemory merges and forgets old', () => {
  const existing = [
    { key: 'old_fact', value: 'cũ', importance: 1, lastAccess: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
    { key: 'important_fact', value: 'quan trọng', importance: 5, lastAccess: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() },
  ]
  const newFacts = [
    { key: 'new_fact', value: 'mới', importance: 3, category: 'behavior' as const, source: 'test' },
  ]
  const consolidated = consolidateMemory(existing, newFacts)
  // important_fact should survive (importance 5), old_fact should be forgotten (importance 1, old)
  assert(consolidated.some(m => m.key === 'important_fact'), 'Important fact should survive')
  assert(consolidated.some(m => m.key === 'new_fact'), 'New fact should be added')
  assert(!consolidated.some(m => m.key === 'old_fact'), 'Old low-importance fact should be forgotten')
  console.log('[VIFIXA_TEST] OK: consolidateMemory correctly forgets old low-importance, keeps important')
})

Deno.test('[VIFIXA_TEST] learning: generateInsights detects patterns', () => {
  const memories = [
    { key: 'cancelled_too_expensive', value: 'đắt', importance: 4, category: 'behavior' },
    { key: 'cancelled_busy', value: 'bận', importance: 4, category: 'behavior' },
    { key: 'cancelled_no_worker', value: 'không có thợ', importance: 4, category: 'behavior' },
  ]
  const insights = generateInsights(memories)
  assert(insights.length > 0, 'Should detect cancellation pattern')
  console.log('[VIFIXA_TEST] OK: generateInsights detects', insights.length, 'patterns')
})

Deno.test('[VIFIXA_TEST] learning: adaptPersonality returns deltas', () => {
  const events = [
    { userId: 'u1', type: 'rating' as const, data: { rating: 5 }, timestamp: new Date().toISOString() },
  ]
  const deltas = adaptPersonality({ preferences: {}, behavior: {}, trustScore: 0.5 }, events)
  assert(deltas.length > 0, 'Should return at least one delta')
  console.log('[VIFIXA_TEST] OK: adaptPersonality returns deltas')
})

Deno.test('[VIFIXA_TEST] learning: updateUserModel adjusts trust score', () => {
  const model = { preferences: {}, behavior: {}, trustScore: 0.5 }
  const events = [
    { userId: 'u1', type: 'order_completed' as const, data: { service_type: 'repair' }, timestamp: new Date().toISOString() },
  ]
  const updated = updateUserModel(model, events)
  assertEquals(updated.trustScore > 0.5, true, 'Trust score should increase after completed order')
  console.log('[VIFIXA_TEST] OK: updateUserModel increases trust on completion')
})

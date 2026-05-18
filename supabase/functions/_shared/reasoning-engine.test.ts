import { assertEquals, assertExists, assertStringIncludes } from 'https://deno.land/std/testing/asserts.ts'
import { buildCoTPrompt, buildReActPrompt, parseReasoningTrace, formatReasoningForUI } from './reasoning-engine.ts'

Deno.test('[VIFIXA_TEST] reasoning: buildCoTPrompt returns structured prompt', () => {
  const prompt = buildCoTPrompt('Sửa chữa', 'Máy lạnh không mát', {
    userInfo: 'Nguyễn Văn A',
    serviceInfo: 'Sửa máy lạnh, tủ lạnh',
    memoryHints: ['Từng sửa máy lạnh năm ngoái'],
  })
  assertStringIncludes(prompt, 'NHẬN DIỆN')
  assertStringIncludes(prompt, 'PHÂN TÍCH')
  assertStringIncludes(prompt, 'SUY LUẬN')
  assertStringIncludes(prompt, 'HÀNH ĐỘNG')
  assertStringIncludes(prompt, 'KẾT LUẬN')
  console.log('[VIFIXA_TEST] OK: buildCoTPrompt has all 5 reasoning steps')
})

Deno.test('[VIFIXA_TEST] reasoning: buildReActPrompt includes system + user', () => {
  const prompt = buildReActPrompt('System instructions', 'User question', {})
  assertStringIncludes(prompt, 'ReAct')
  assertStringIncludes(prompt, 'Thought')
  assertStringIncludes(prompt, 'Action')
  assertStringIncludes(prompt, 'Observation')
  console.log('[VIFIXA_TEST] OK: buildReActPrompt has ReAct loop structure')
})

Deno.test('[VIFIXA_TEST] reasoning: parseReasoningTrace extracts steps', () => {
  const response = `Thought: Tôi cần chẩn đoán trước.
Action: diagnose
Thought: Đã có kết quả chẩn đoán.
Action: quote
{"reply": "Đã xong", "confidence": 0.85, "reasoning": "Phân tích xong"}`
  
  const trace = parseReasoningTrace(response)
  assertExists(trace.steps.length >= 2, 'Should have multiple steps')
  assertEquals(trace.confidence, 0.85)
  console.log('[VIFIXA_TEST] OK: parseReasoningTrace extracts', trace.steps.length, 'steps')
})

Deno.test('[VIFIXA_TEST] reasoning: formatReasoningForUI returns formatted string', () => {
  const trace = {
    steps: [
      { id: 's1', type: 'think' as const, content: 'Phân tích vấn đề', timestamp: new Date().toISOString() },
      { id: 's2', type: 'act' as const, content: 'Chẩn đoán', timestamp: new Date().toISOString() },
    ],
    conclusion: 'Xong',
    confidence: 0.9,
  }
  const ui = formatReasoningForUI(trace)
  assertStringIncludes(ui, 'Suy luận của AI')
  assertStringIncludes(ui, '90%')
  console.log('[VIFIXA_TEST] OK: formatReasoningForUI formats correctly')
})

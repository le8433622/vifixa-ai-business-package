// 🧠 Vifixa Reasoning Engine — Chain-of-Thought + ReAct
// Layer 2: AI suy luận từng bước, giải thích tại sao, học từ kết quả

export interface ReasoningStep {
  id: string
  type: 'perceive' | 'think' | 'act' | 'observe'
  content: string
  data?: any
  timestamp: string
}

export interface ReasoningTrace {
  steps: ReasoningStep[]
  conclusion: string
  confidence: number
}

// ─── CHAIN-OF-THOUGHT BUILDER ────────────────────────────────

export function buildCoTPrompt(
  serviceType: string,
  userMessage: string,
  context: {
    userInfo?: string
    serviceInfo?: string
    memoryHints?: string[]
  }
): string {
  const steps = [
    `1️⃣ NHẬN DIỆN: Dịch vụ "${serviceType}" — User nói: "${userMessage}"`,
    `2️⃣ PHÂN TÍCH: User cần gì? Vấn đề gì? Mức độ khẩn cấp?`,
    `3️⃣ SUY LUẬN: Dựa trên ngữ cảnh và kiến thức, giải pháp là gì?`,
    `4️⃣ HÀNH ĐỘNG: Cần làm gì tiếp theo?`,
    `5️⃣ KẾT LUẬN: Trả lời user + actions`,
  ]

  let prompt = `Hãy suy luận từng bước trước khi trả lời.

BỐI CẢNH:
• Dịch vụ: ${serviceType}
• User: ${context.userInfo || 'Khách hàng'}
${context.serviceInfo ? `• Thông tin: ${context.serviceInfo}` : ''}
${context.memoryHints?.length ? `• Gợi ý từ bộ nhớ:\n${context.memoryHints.map(m => `  - ${m}`).join('\n')}` : ''}

QUY TRÌNH SUY LUẬN:
${steps.join('\n')}

SAU KHI SUY LUẬN, trả về JSON:
{
  "reply": "câu trả lời",
  "actions": ["hành động phù hợp"],
  "reasoning": "tóm tắt suy luận (user có thể xem)",
  "confidence": 0.0-1.0
}`

  return prompt
}

// ─── REACT LOOP ─────────────────────────────────────────────

export interface ReActStep {
  thought: string
  action: string
  actionInput?: any
  observation?: string
}

export function buildReActPrompt(
  systemPrompt: string,
  userMessage: string,
  context: any,
  maxSteps: number = 5
): string {
  return `${systemPrompt}

BẠN SỬ DỤNG PHƯƠNG PHÁP ReAct (Reason + Act):

Mỗi bước, hãy suy nghĩ trước khi hành động:
Thought: Tôi cần làm gì tiếp theo?
Action: Hành động cụ thể (diagnose | quote | match | pay | search | chat)
Action Input: Dữ liệu cho hành động
Observation: Kết quả từ hành động

Lặp lại tối đa ${maxSteps} bước, sau đó trả lời user.

USER: ${userMessage}

Hãy bắt đầu suy luận:`
}

// ─── REASONING PARSER ─────────────────────────────────────

export function parseReasoningTrace(response: string): ReasoningTrace {
  const steps: ReasoningStep[] = []
  let conclusion = ''
  let confidence = 0.5

  // Extract reasoning steps from response
  const stepRegex = /(?:Thought|Action|Observation|Kết luận):\s*(.+?)(?=\n(?:Thought|Action|Observation|Kết luận|$))/gs
  let match
  let stepIndex = 0
  
  while ((match = stepRegex.exec(response)) !== null) {
    const header = match[0].split(':')[0].trim()
    const content = match[1].trim()
    
    const type = header === 'Thought' ? 'think'
      : header === 'Action' ? 'act'
      : header === 'Observation' ? 'observe'
      : 'think'
    
    steps.push({
      id: `step-${stepIndex++}`,
      type,
      content,
      timestamp: new Date().toISOString(),
    })
  }

  // Try to extract conclusion and confidence from JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*"reply"[\s\S]*\}/)
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0])
      conclusion = json.reasoning || json.reply || ''
      confidence = json.confidence || 0.5
    }
  } catch {}

  return { steps, conclusion, confidence }
}

// ─── REASONING VISUALIZATION ─────────────────────────────

export function formatReasoningForUI(trace: ReasoningTrace): string {
  if (trace.steps.length === 0) return ''
  
  let output = '\n\n💭 **Suy luận của AI:**\n'
  
  for (const step of trace.steps) {
    const icon = step.type === 'perceive' ? '👁️'
      : step.type === 'think' ? '💡'
      : step.type === 'act' ? '⚡'
      : '👀'
    
    output += `${icon} ${step.content}\n`
  }
  
  output += `\n📊 **Độ tin cậy:** ${Math.round(trace.confidence * 100)}%`
  
  return output
}

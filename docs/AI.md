# Vifixa AI — AI Operating Model

## Philosophy
AI is not a feature — AI is the operational layer of the entire platform.

## Principles
1. **Human-friendly input**: Describe in natural language, send photos/video
2. **AI-structured workflow**: AI converts freeform input into structured data (category, urgency, cause, worker type, price range)
3. **Human-in-the-loop**: AI assists decisions, doesn't make irreversible ones alone
4. **Evidence-based**: Every action logged with before/after evidence

## AI Agents

| Agent | Input | Output | Success Metric |
|-------|-------|--------|----------------|
| **Diagnosis** | Description + media | Category, urgency, diagnosis, safety notes | ≥80% category accuracy |
| **Pricing** | Diagnosis + location + difficulty | Estimated price range | ≥60% price accuracy |
| **Matching** | Order + available workers | Best worker match + reason | ≥50% match acceptance |
| **Quality** | Before/after photos + checklist | Quality score + issues | ≤10% rework rate |
| **Dispute** | Complaint + evidence + history | Summary + resolution suggestion | ≥70% admin agreement |
| **Coach** | Worker profile + job history | Tips, checklists, training | ≥50% worker采纳率 |
| **Fraud** | Order + user + payment data | Risk score + flags | ≤5% fraud miss rate |

## AI Data Pipeline
```
Customer Input ─→ Edge Function ─→ AI Provider ─→ Structured Output ─→ DB
                      ↕ (logged to ai_logs for audit & learning)
```

## AI Chat System
- **`ai-chat`**: Multi-turn conversational AI for customer service
- **`ai-care-agent`**: Proactive care agent for follow-ups
- **`ai-warranty`**: Warranty claim handling agent
- **Chat sessions** stored in `chat_sessions` + `chat_messages` tables
- Supports: context retention, order lookup, escalation to human

## KPIs
- Diagnosis accuracy: ≥80% | Price accuracy: ≥60% | Matching success: ≥50%
- Fraud alert precision: ≥90% | Manual intervention rate: ≤20%
- AI cost per completed order: target ≤$0.50

## Long-term Advantage
Every transaction trains the system. Over time, Vifixa AI builds:
- Real understanding of repair costs by region
- True worker quality data (not just ratings)
- Equipment lifecycle patterns
- Predictive maintenance capabilities

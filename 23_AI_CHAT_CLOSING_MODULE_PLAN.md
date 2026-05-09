# AI Chat Closing Module Plan

## Mục tiêu

Xây module **AI Chat Chốt Đơn** thành trải nghiệm tư vấn - chẩn đoán - báo giá - đặt lịch - ghép thợ liền mạch cho Vifixa AI, nơi khách hàng chỉ cần nói vấn đề bằng ngôn ngữ tự nhiên và hệ thống chuyển cuộc trò chuyện thành đơn dịch vụ có đủ dữ liệu vận hành, kiểm soát rủi ro, bằng chứng và khả năng học từ giao dịch thật.

Module này không thay thế con người trong các quyết định nhạy cảm. AI đóng vai trò người điều phối thông minh, luôn có audit log, guardrail, quyền xác nhận cuối của khách hàng, thợ hoặc admin tùy ngữ cảnh.

## Căn cứ nguồn sự thật nội bộ

- `15_CODEX_BUSINESS_CONTEXT.md`: Vifixa AI là nền tảng marketplace sửa chữa/bảo trì dùng Supabase, Vercel, Expo; AI phải chạy qua backend và không được lộ secrets ở mobile/web.
- `05_PRODUCT_SOLUTION.md`: Luồng khách hàng cần đi từ mô tả sự cố, upload media, AI chẩn đoán, báo giá dự kiến, xác nhận đặt lịch, ghép thợ, theo dõi, đánh giá và bảo hành/khiếu nại.
- `11_AI_OPERATING_MODEL.md`: AI phải biến input tự nhiên thành dữ liệu có cấu trúc, vận hành human-in-the-loop, dựa trên bằng chứng và học từ giao dịch thật.
- `20_DATABASE_SCHEMA.md`: Dữ liệu cốt lõi gồm profiles, workers, orders, ai_logs, trust_scores; AI logs chỉ admin truy cập.
- `21_API_SPECIFICATION.md`: AI và customer request phải đi qua Supabase Edge Functions; web chỉ proxy server-side khi cần bảo vệ khóa.
- `22_SECURITY_PLAN.md`: Bảo mật, RLS, RBAC, audit và kiểm soát truy cập là bắt buộc.

## Căn cứ xu thế AI 2026

- Gartner dự báo đến cuối năm 2026, 40% enterprise applications sẽ có task-specific AI agents, tăng từ dưới 5% năm 2025; điều này cho thấy sản phẩm cần chuyển từ chatbot trả lời sang agent hoàn thành tác vụ có kiểm soát.
  Nguồn: https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025
- Gartner cho biết 91% lãnh đạo customer service chịu áp lực triển khai AI trong năm 2026; Vifixa nên coi AI chat là lớp vận hành service chứ không chỉ là kênh hỗ trợ.
  Nguồn: https://www.gartner.com/en/newsroom/press-releases/2026-02-18-gartner-survey-finds-ninety-one-percent-of-customer-service-leaders-under-pressure-to-implement-ai-in-2026
- McKinsey mô tả tương lai customer experience là conversational, nơi customer care và sales được tích hợp để tăng satisfaction, retention và engagement theo thời gian thực.
  Nguồn: https://www.mckinsey.com/capabilities/operations/our-insights/the-future-of-customer-experience-embracing-agentic-ai
- McKinsey cũng nhấn mạnh lợi thế agentic AI đến từ workflow rõ, dữ liệu đáng tin, đo ROI và cơ chế mở rộng có governance; vì vậy module chốt đơn phải có state machine, KPI, audit log và cơ chế fallback người thật.
  Nguồn: https://www.mckinsey.com/capabilities/quantumblack/our-insights/seizing-the-agentic-ai-advantage

## Tầm nhìn sản phẩm

AI Chat Chốt Đơn phải trở thành **AI Service Closer**: một trợ lý hội thoại có khả năng hiểu nhu cầu, hỏi đúng câu, thu bằng chứng, tạo niềm tin, đề xuất phương án minh bạch, xử lý phản đối, chốt lịch, tạo order thật và bàn giao bối cảnh đầy đủ cho thợ/admin.

Trải nghiệm lý tưởng:

1. Khách nói: “Máy lạnh chảy nước, cần sửa chiều nay.”
2. AI nhận diện danh mục, mức khẩn cấp, khả năng nguyên nhân và rủi ro an toàn.
3. AI hỏi tối đa 3 câu quan trọng nhất nếu thiếu dữ liệu.
4. AI yêu cầu/khuyến khích ảnh hoặc video đúng cách.
5. AI đưa khoảng giá, lý do, vật tư có thể phát sinh và mức tin cậy.
6. AI đề xuất slot lịch, khu vực, loại thợ và điều kiện bảo hành.
7. Khách xác nhận rõ ràng trước khi tạo đơn.
8. Hệ thống tạo order, ghi `ai_logs`, kích hoạt matching, gửi notify, và lưu tóm tắt bàn giao cho thợ.
9. Admin có dashboard xem các cuộc chat có rủi ro, tỷ lệ chốt, lý do rớt đơn và chất lượng AI.

## Nguyên tắc thiết kế

- **Conversation first, operation always**: mỗi câu chat phải tiến gần hơn tới dữ liệu vận hành có cấu trúc.
- **Không chốt mù**: không tạo đơn khi thiếu danh mục, vị trí/khu vực, mô tả sự cố, kỳ vọng thời gian hoặc xác nhận của khách.
- **Không báo giá tuyệt đối sai ngữ cảnh**: chỉ hiển thị khoảng giá, confidence, yếu tố có thể phát sinh và điều kiện khảo sát.
- **AI hành động có giới hạn**: AI được đề xuất và chuẩn bị; các hành động tạo order, thanh toán, hủy, hoàn tiền, tranh chấp phải có rule và audit.
- **Human-in-the-loop**: chuyển admin hoặc hỗ trợ người thật khi rủi ro cao, giá trị cao, khách bức xúc, thiếu bằng chứng hoặc AI confidence thấp.
- **No secrets frontend**: mobile/web chỉ gọi Supabase Edge Functions bằng Supabase Auth token.
- **No mock production**: mọi chat production phải dùng dữ liệu thật, session thật, order thật hoặc sandbox được tách rõ.

## Scope MVP nâng cấp

### In scope

- Nâng `ai-chat` Edge Function thành orchestrator có intent detection, slot filling, quote handling, objection handling, confirmation và order creation.
- Lưu state hội thoại có cấu trúc trong `chat_sessions.context` hoặc bảng mở rộng.
- Thêm lead/order handoff summary cho thợ và admin.
- Ghi mọi AI input/output/tool decision vào `ai_logs`.
- Tích hợp với `ai-diagnose`, `ai-estimate-price`, `ai-matching`, `ai-fraud-check`, `notify`, `customer-requests`.
- UI mobile/web hiển thị quick replies, suggested actions, quote card, confirmation card, booking summary và escalation state.
- Admin dashboard theo dõi funnel: started chat, qualified, quoted, confirmed, order_created, matched, completed.

### Out of scope giai đoạn đầu

- AI tự thu tiền hoặc tự hoàn tiền.
- AI tự cam kết giá cuối cùng khi chưa có thợ xác nhận hoặc kiểm tra onsite.
- Voice call realtime production.
- Tự động gọi điện/SMS ngoài hệ thống khi chưa có compliance và opt-in.
- Tự động quyết tranh chấp hoặc bảo hành mà không có admin/human review.

## Kiến trúc mục tiêu

```text
Mobile/Web Chat UI
  -> Supabase Auth JWT
  -> Supabase Edge Function: ai-chat
       -> Session state + slot filling
       -> ai-diagnose
       -> ai-estimate-price
       -> ai-fraud-check
       -> customer-requests
       -> ai-matching
       -> notify
       -> ai_logs
  -> Supabase Postgres/Realtime/Storage
  -> Worker/Admin handoff views
```

> Lưu ý: `Realtime` trong sơ đồ dùng Supabase Realtime; mọi AI action vẫn phải chạy trong Edge Functions.

## State machine hội thoại

| State | Ý nghĩa | Điều kiện chuyển bước |
|---|---|---|
| `greeting` | Chào và định hướng | Khách nêu nhu cầu |
| `problem_capture` | Thu mô tả sự cố | Có mô tả ban đầu |
| `slot_filling` | Hỏi dữ liệu thiếu | Có category, location/khu vực, urgency, contact preference, media optional/required theo loại |
| `diagnosis` | Chẩn đoán sơ bộ | Gọi `ai-diagnose` thành công |
| `quote` | Báo khoảng giá | Gọi `ai-estimate-price`, có confidence và disclaimer |
| `objection_handling` | Xử lý phản đối | Khách hỏi giá, thời gian, bảo hành, uy tín thợ |
| `booking_proposal` | Đề xuất lịch và điều kiện | Có availability/khoảng thời gian mong muốn |
| `confirmation` | Xác nhận rõ trước khi tạo đơn | Khách đồng ý rõ ràng |
| `order_creation` | Tạo order thật | Gọi `customer-requests` thành công |
| `handoff` | Bàn giao cho thợ/admin | Có order id, summary, risk flags |
| `escalated` | Chuyển người thật/admin | Confidence thấp hoặc rủi ro cao |
| `abandoned` | Rớt đơn | Timeout hoặc khách từ chối |

## Dữ liệu cần thu trong chat

### Required slots

- `category`: nhóm dịch vụ.
- `description`: mô tả vấn đề tự nhiên.
- `location`: địa chỉ/khu vực hoặc tọa độ nếu khách cho phép.
- `urgency`: khẩn cấp/hôm nay/đặt lịch.
- `preferred_time`: thời gian mong muốn.
- `customer_confirmation`: xác nhận tạo đơn.

### Recommended slots

- `media_urls`: ảnh/video sự cố.
- `asset_type`: loại thiết bị/tài sản.
- `brand_model`: hãng/model nếu có.
- `symptoms`: triệu chứng chính.
- `safety_risk`: nước, điện, gas, cháy, rò rỉ, trẻ em/người già.
- `access_notes`: ghi chú vào nhà/căn hộ/bãi xe.
- `budget_sensitivity`: khách ưu tiên rẻ, nhanh, bảo hành, thợ giỏi.

### Derived fields

- `intent`: diagnose, quote, book, reschedule, warranty, complaint, cancel, ask_status, general_support.
- `lead_score`: khả năng chốt.
- `conversion_stage`: visitor, qualified, quoted, confirmed, order_created.
- `confidence`: độ tin cậy của AI.
- `risk_flags`: safety, fraud, abusive, high_value, price_sensitive, missing_evidence.
- `handoff_summary`: tóm tắt cho thợ/admin.

## Backlog task chi tiết

### Epic 1 — Product strategy và conversation design

| ID | Task | Priority | Acceptance criteria |
|---|---|---:|---|
| CHAT-001 | Viết conversation map cho 20 tình huống sửa chữa phổ biến | P0 | Có flow greeting -> order; mỗi flow tối đa 3 câu hỏi bắt buộc trước quote |
| CHAT-002 | Thiết kế prompt policy cho AI Service Closer | P0 | Có rules về không cam kết giá cuối, không tạo đơn khi thiếu xác nhận, luôn nói minh bạch |
| CHAT-003 | Định nghĩa objection playbook | P0 | Có câu trả lời cho phản đối về giá, thời gian, bảo hành, uy tín thợ, phát sinh |
| CHAT-004 | Định nghĩa escalation rules | P0 | Có danh sách trigger chuyển admin/human: safety, abuse, high value, low confidence, complaint |
| CHAT-005 | Định nghĩa tone tiếng Việt thương hiệu | P1 | Giọng điệu ngắn, rõ, ấm, không hứa quá mức, có CTA tự nhiên |

### Epic 2 — Data model và migration

| ID | Task | Priority | Acceptance criteria |
|---|---|---:|---|
| CHAT-101 | Mở rộng `chat_sessions` context schema | P0 | Lưu state, slots, confidence, lead_score, conversion_stage, risk_flags |
| CHAT-102 | Thêm `chat_events` hoặc chuẩn hóa metadata trong `chat_messages` | P0 | Log được state transition, action click, quote shown, confirmation received |
| CHAT-103 | Liên kết chat với order | P0 | `orders` hoặc metadata có `chat_session_id`; truy vấn được từ admin/customer |
| CHAT-104 | Thêm handoff summary | P0 | Thợ/admin thấy tóm tắt nhu cầu, rủi ro, ảnh, quote, kỳ vọng thời gian |
| CHAT-105 | Bổ sung RLS cho chat tables | P0 | Customer chỉ xem chat của mình; admin xem tất cả; worker chỉ xem chat liên quan order được giao |
| CHAT-106 | Data retention và audit | P1 | Có retention policy, audit log, masking PII trong AI logs khi cần |

### Epic 3 — Edge Function orchestration

| ID | Task | Priority | Acceptance criteria |
|---|---|---:|---|
| CHAT-201 | Refactor `ai-chat` thành orchestrator theo state machine | P0 | Mỗi request trả `state`, `slots`, `actions`, `next_step`, `confidence` |
| CHAT-202 | Thêm intent detection | P0 | Nhận diện book/quote/complaint/warranty/status/cancel/general với fallback an toàn |
| CHAT-203 | Slot filling engine | P0 | AI hỏi đúng trường thiếu, không hỏi lại trường đã có, cập nhật context bền vững |
| CHAT-204 | Gọi `ai-diagnose` khi đủ mô tả | P0 | Diagnosis lưu vào session và `ai_logs`; lỗi có fallback message |
| CHAT-205 | Gọi `ai-estimate-price` khi đủ category/location/urgency | P0 | Quote card có khoảng giá, confidence, breakdown, disclaimer |
| CHAT-206 | Gọi `ai-fraud-check` trước tạo order | P0 | Risk cao thì chuyển `escalated`, không auto-create order |
| CHAT-207 | Tạo order qua `customer-requests` sau xác nhận | P0 | Tạo order thật, trả `order_id`, không dùng default location giả trong production |
| CHAT-208 | Gọi `ai-matching` hoặc trigger matching sau order | P1 | Có matched worker hoặc queue status rõ ràng |
| CHAT-209 | Gửi notify sau chốt đơn | P1 | Customer nhận xác nhận; worker/admin nhận thông tin phù hợp |
| CHAT-210 | Idempotency key | P0 | Một xác nhận không tạo trùng đơn khi retry/network lỗi |

### Epic 4 — AI provider, prompt và guardrails

| ID | Task | Priority | Acceptance criteria |
|---|---|---:|---|
| CHAT-301 | Tạo structured output schema cho chat | P0 | AI output parse được bằng Zod/JSON schema; invalid output có repair/fallback |
| CHAT-302 | Prompt hệ thống cho AI Service Closer | P0 | Bắt buộc trả state/action/slots; không lộ prompt; không tư vấn nguy hiểm |
| CHAT-303 | Guardrail safety | P0 | Điện/gas/cháy/rò nước nặng: ưu tiên cảnh báo an toàn và chuyển thợ/admin |
| CHAT-304 | Guardrail pricing | P0 | Không đưa giá cuối; luôn nói khoảng giá và điều kiện phát sinh |
| CHAT-305 | Guardrail confirmation | P0 | Chỉ tạo đơn khi khách xác nhận rõ ràng bằng intent confirm |
| CHAT-306 | Multilingual readiness | P2 | Có khả năng mở rộng tiếng Anh sau tiếng Việt |
| CHAT-307 | Golden test set | P0 | Ít nhất 100 kịch bản chat có expected state/action |

### Epic 5 — Mobile customer experience

| ID | Task | Priority | Acceptance criteria |
|---|---|---:|---|
| CHAT-401 | Sửa quản lý session mobile | P0 | Mobile truyền đúng `session_id`, không nhầm với user id |
| CHAT-402 | Quick replies | P0 | UI hiển thị lựa chọn: Hôm nay, Ngày mai, Cần gấp, Gửi ảnh, Chốt lịch |
| CHAT-403 | Quote card | P0 | Hiển thị khoảng giá, confidence, breakdown, điều kiện phát sinh |
| CHAT-404 | Confirmation card | P0 | Khách phải bấm xác nhận tạo đơn; có tóm tắt trước khi chốt |
| CHAT-405 | Media upload trong chat | P1 | Upload ảnh/video lên Supabase Storage, trả URL vào chat context |
| CHAT-406 | Order created success screen | P0 | Sau chốt đơn điều hướng đúng đến order detail |
| CHAT-407 | Empty/error/loading states | P1 | Có retry, lỗi auth, lỗi AI, lỗi tạo đơn rõ ràng |

### Epic 6 — Web customer experience

| ID | Task | Priority | Acceptance criteria |
|---|---|---:|---|
| CHAT-501 | Đồng bộ UI web chat với mobile | P0 | Có quick replies, quote card, confirmation card, status handoff |
| CHAT-502 | Responsive layout | P1 | Chat dùng tốt trên mobile browser và desktop |
| CHAT-503 | Chat-to-order tracking | P0 | Khi có `order_id`, web điều hướng sang order detail |
| CHAT-504 | Accessibility | P1 | Keyboard navigation, aria labels, readable contrast |

### Epic 7 — Worker/Admin handoff

| ID | Task | Priority | Acceptance criteria |
|---|---|---:|---|
| CHAT-601 | Worker job detail hiển thị AI handoff | P0 | Thợ thấy tóm tắt sự cố, ảnh, quote, lưu ý an toàn, kỳ vọng khách |
| CHAT-602 | Admin chat funnel dashboard | P1 | Admin xem conversion funnel, drop-off reasons, escalations |
| CHAT-603 | Admin review queue | P1 | Chat rủi ro cao/low confidence vào hàng đợi duyệt |
| CHAT-604 | Manual takeover | P2 | Admin có thể thêm ghi chú hoặc phản hồi trong chat theo quyền |

### Epic 8 — Analytics, KPI và học từ giao dịch

| ID | Task | Priority | Acceptance criteria |
|---|---|---:|---|
| CHAT-701 | Conversion events | P0 | Track chat_started, qualified, quote_shown, confirmed, order_created, matched, completed |
| CHAT-702 | KPI dashboard queries/views | P1 | Có views cho conversion rate, quote acceptance, avg messages to close, escalation rate |
| CHAT-703 | AI quality measurement | P0 | Đo diagnosis accuracy, price accuracy, matching success, complaint after AI diagnosis |
| CHAT-704 | Feedback loop | P1 | So sánh quote với final_price, lưu reason mismatch để cải thiện prompt/pricing |
| CHAT-705 | Cost monitoring | P1 | Theo dõi token/call/request_id trong `ai_logs`, cảnh báo cost bất thường |

### Epic 9 — Security, compliance, reliability

| ID | Task | Priority | Acceptance criteria |
|---|---|---:|---|
| CHAT-801 | RLS verification tests | P0 | Customer không đọc chat người khác; worker không đọc chat chưa được giao |
| CHAT-802 | Rate limit theo user/IP | P0 | Chống spam chat và cost abuse |
| CHAT-803 | PII minimization | P1 | AI logs không lưu quá mức dữ liệu nhạy cảm; masking khi cần |
| CHAT-804 | Prompt injection tests | P0 | Chat không lộ system prompt, không bỏ qua policy, không tạo order trái phép |
| CHAT-805 | Idempotent order creation tests | P0 | Retry không tạo đơn trùng |
| CHAT-806 | Observability | P1 | Mỗi request có request_id, logs, error class, latency |

## KPI thành công

### North-star metrics

- Chat-to-order conversion rate >= 35% cho khách đã bắt đầu chat có nhu cầu dịch vụ thật.
- Median messages to qualified lead <= 5.
- Median messages to order confirmation <= 9.
- Quote acceptance rate >= 45%.
- Order duplicate rate = 0.
- Unauthorized order creation = 0.

### AI quality metrics

- Intent detection accuracy >= 90% trên golden test set.
- Slot extraction F1 >= 85%.
- Diagnosis category accuracy >= 80%, phù hợp OKR hiện có.
- Price estimate within accepted range >= 60%, phù hợp OKR hiện có.
- Low-confidence escalation precision >= 80%.

### Trust and operations metrics

- Complaint rate từ đơn tạo qua chat <= marketplace average.
- First-time fix rate tăng theo cohort chat.
- Tỷ lệ thiếu thông tin khi thợ nhận đơn <= 10%.
- Admin manual intervention rate giảm dần nhưng không giảm bằng cách bỏ guardrail.

## Prompt/response contract đề xuất

`ai-chat` nên yêu cầu AI trả JSON có schema ổn định:

```json
{
  "reply": "string",
  "state": "slot_filling",
  "intent": "book",
  "slots": {
    "category": "air_conditioner",
    "description": "Máy lạnh chảy nước",
    "location": null,
    "urgency": "today",
    "preferred_time": "afternoon"
  },
  "missing_slots": ["location"],
  "actions": [
    { "type": "quick_reply", "label": "Gửi vị trí", "value": "share_location" }
  ],
  "risk_flags": [],
  "confidence": 0.82,
  "next_step": "ask_location",
  "session_complete": false
}
```

## Gợi ý quick replies/action types

- `share_location`
- `upload_media`
- `choose_time_today`
- `choose_time_tomorrow`
- `request_quote`
- `confirm_booking`
- `talk_to_human`
- `view_order`
- `start_warranty`
- `start_complaint`

## Definition of Done

- Tất cả AI calls đi qua Supabase Edge Functions.
- Không có API key AI trong mobile/web.
- Không dùng mock data trong production flow.
- Có RLS test cho chat sessions/messages/events.
- Có idempotency cho order creation.
- Có audit log trong `ai_logs` cho every AI decision/action.
- Có golden tests cho 100 kịch bản conversation.
- Mobile và web đều chốt đơn được từ chat.
- Worker/admin nhận đủ handoff summary.
- KPI dashboard đo được conversion, AI accuracy, cost, latency, escalation và drop-off.

## Lộ trình triển khai đề xuất

### Sprint 1 — Foundation chốt đơn an toàn

- CHAT-001 đến CHAT-004.
- CHAT-101 đến CHAT-105.
- CHAT-201 đến CHAT-207.
- CHAT-301 đến CHAT-305.
- CHAT-401, CHAT-403, CHAT-404, CHAT-406.
- CHAT-801, CHAT-802, CHAT-805.

### Sprint 2 — Trải nghiệm đáng mơ ước

- CHAT-005.
- CHAT-208, CHAT-209, CHAT-210.
- CHAT-402, CHAT-405, CHAT-407.
- CHAT-501 đến CHAT-504.
- CHAT-601, CHAT-603.
- CHAT-701, CHAT-703.

### Sprint 3 — Vận hành AI cấp lịch sử nhân loại nhưng có kiểm soát

- CHAT-106.
- CHAT-306, CHAT-307.
- CHAT-602, CHAT-604.
- CHAT-702, CHAT-704, CHAT-705.
- CHAT-803, CHAT-804, CHAT-806.

## Rủi ro và cách giảm thiểu

| Rủi ro | Tác động | Giảm thiểu |
|---|---|---|
| AI chốt đơn khi khách chưa đồng ý | Mất niềm tin, rủi ro pháp lý | Confirmation card, intent confirm, idempotency, audit |
| AI báo giá quá chắc chắn | Khiếu nại, tranh chấp | Price range, confidence, disclaimer, final price do thợ xác nhận |
| Thiếu dữ liệu vị trí/media | Ghép thợ sai, báo giá sai | Slot filling bắt buộc, media prompts theo category |
| Prompt injection | Lộ policy hoặc tạo hành động trái phép | Structured output, server-side action validation, prompt injection tests |
| Cost AI tăng nhanh | Biên lợi nhuận giảm | Rate limit, token logging, model routing, cache context |
| Chat rớt giữa chừng | Mất lead | Save session, resume, notify/reminder có opt-in |

## Ưu tiên ngay lập tức

1. Sửa logic session mobile/web để dùng `session_id` thật, không truyền nhầm `user.id`.
2. Loại bỏ mọi default production giả như vị trí mặc định khi tạo order từ chat; thiếu vị trí phải hỏi khách.
3. Thêm state machine và structured response contract cho `ai-chat`.
4. Thêm confirmation card bắt buộc trước khi gọi `customer-requests`.
5. Log đầy đủ AI decision vào `ai_logs` với request id.
6. Viết golden tests cho 20 kịch bản đầu tiên, sau đó mở rộng lên 100.

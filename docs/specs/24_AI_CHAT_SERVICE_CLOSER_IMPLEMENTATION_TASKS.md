# AI Chat Service Closer — Implementation Task Plan

## Mục tiêu thực hiện

Biến module `ai-chat` hiện tại thành **AI Chat Service Closer production-ready**: có kiến trúc dễ test, không chốt đơn thiếu dữ liệu, không tạo đơn trùng, có UI xác nhận rõ ràng, có media/location thật, có audit log, có KPI dashboard và có bộ golden tests đủ để tự tin triển khai.

Kế hoạch này là task plan triển khai tiếp theo sau tài liệu `23_AI_CHAT_CLOSING_MODULE_PLAN.md` và commit `Implement AI chat service closer`.

## Nguyên tắc bắt buộc

- Tất cả AI calls phải đi qua Supabase Edge Functions.
- Không đưa AI secrets vào mobile/web frontend.
- Không dùng mock data trong production flow.
- Không tạo order nếu thiếu category, description, location, urgency, preferred_time hoặc customer confirmation.
- Không báo giá như giá cuối; mọi quote phải có confidence và disclaimer.
- Không tự động xử lý sự cố safety-risk; phải escalate/human-in-the-loop.
- Mọi AI decision/action phải có audit log.
- Mobile/web chỉ dùng Supabase Auth JWT và Supabase public config hợp lệ.

## Hiện trạng đã có

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Plan sản phẩm AI Chat Chốt Đơn | Done | `23_AI_CHAT_CLOSING_MODULE_PLAN.md` |
| Edge Function stateful orchestrator | Partial | Đã có state/slots/actions, nhưng cần tách module và test |
| Session ID fix mobile/web | Partial | Đã dùng `session?.id`, cần test E2E |
| No default production location | Partial | Edge không còn default location, nhưng mobile chưa gửi GPS thật |
| Confirmation gating | Partial | Backend có gating, UI card chưa đủ mạnh |
| `ai_logs` chat agent type | Partial | Có migration thêm `chat`, cần verify migration/db reset |
| Idempotency | Partial | Có check theo `chat_session_id`, cần DB unique constraint/idempotency key |
| Golden tests | Missing | Cần tối thiểu 20 test đầu, sau đó mở rộng 100 |
| Upload media trong chat | Missing | Action tồn tại nhưng UI chưa upload thật |
| KPI dashboard | Missing | Chưa có views/dashboard funnel |

## Milestone 0 — Stabilize repo checks trước khi làm tiếp

### TASK-0001 — Sửa lỗi TypeScript/syntax hiện có ngoài chat

- **Priority:** P0
- **Files dự kiến:**
  - `web/src/app/customer/warranty/[orderId]/page.tsx`
  - `web/src/app/login/page.tsx`
  - `web/src/app/worker/earnings/page.tsx`
  - `web/src/app/worker/jobs/[id]/page.tsx`
  - `web/src/app/worker/profile/page.tsx`
  - `web/src/app/worker/verify/page.tsx`
  - `mobile/src/app/(customer)/complaint.tsx`
- **Lý do:** Không thể tin CI nếu `npm test` web/mobile đang fail bởi lỗi nền.
- **Acceptance criteria:**
  - `npm test` trong `web` pass.
  - `npm test` trong `mobile` pass.
  - Không thêm `// @ts-nocheck` mới để né lỗi.

### TASK-0002 — Thêm test command rõ cho Edge Functions

- **Priority:** P0
- **Files dự kiến:**
  - `supabase/package.json`
  - `supabase/functions/ai-chat/test.ts`
- **Acceptance criteria:**
  - `npm test` trong `supabase` chạy test thật cho `ai-chat` thay vì chỉ echo.
  - Có thể chạy test không cần gọi AI provider thật.

## Milestone 1 — Refactor `ai-chat` thành engine testable

### TASK-1001 — Tách type và contract

- **Priority:** P0
- **Files tạo mới:**
  - `supabase/functions/ai-chat/types.ts`
- **Di chuyển:**
  - `GeoLocation`
  - `ChatSlots`
  - `ChatContext`
  - `ChatRequest`
  - `ChatState`
  - `ChatIntent`
  - `ChatAction`
- **Acceptance criteria:**
  - `index.ts` import type từ `types.ts`.
  - Không đổi response contract hiện tại.
  - Esbuild bundle Edge Function pass.

### TASK-1002 — Tách slot extraction

- **Priority:** P0
- **Files tạo mới:**
  - `supabase/functions/ai-chat/slot-extractor.ts`
- **Di chuyển:**
  - `CATEGORY_KEYWORDS`
  - `URGENCY_KEYWORDS`
  - `CONFIRM_KEYWORDS`
  - `NEGATIVE_KEYWORDS`
  - `detectCategory`
  - `detectUrgency`
  - `detectIntent`
  - `detectPreferredTime`
  - `detectLocationText`
  - `extractSlots`
- **Acceptance criteria:**
  - Có unit tests cho ít nhất 20 câu tiếng Việt.
  - Không tạo confirmation nếu message chứa phủ định như “chưa chốt”, “không đồng ý”.

### TASK-1003 — Tách state machine

- **Priority:** P0
- **Files tạo mới:**
  - `supabase/functions/ai-chat/state-machine.ts`
- **Di chuyển:**
  - `getMissingSlots`
  - `chooseState`
- **Acceptance criteria:**
  - State machine không phụ thuộc Supabase client.
  - Golden tests cover đủ: thiếu location, thiếu urgency, thiếu preferred_time, thiếu confirmation, safety escalation, order creation.

### TASK-1004 — Tách action/reply builder

- **Priority:** P0
- **Files tạo mới:**
  - `supabase/functions/ai-chat/action-builder.ts`
  - `supabase/functions/ai-chat/reply-builder.ts`
- **Di chuyển:**
  - `buildActions`
  - `buildReply`
  - `buildHandoffSummary`
- **Acceptance criteria:**
  - Confirmation state luôn trả `confirmation_card`.
  - Missing location luôn trả `share_location`.
  - Handoff response có `view_order` khi tạo đơn thành công.

### TASK-1005 — Tách order/audit service

- **Priority:** P0
- **Files tạo mới:**
  - `supabase/functions/ai-chat/order-service.ts`
  - `supabase/functions/ai-chat/audit-service.ts`
- **Di chuyển:**
  - `createOrderIfConfirmed`
  - `logChatDecision`
- **Acceptance criteria:**
  - Order service validate đủ required slots trước khi gọi `customer-requests`.
  - Audit service luôn redact PII.
  - Test retry cùng `chat_session_id` không tạo order trùng.

## Milestone 2 — Database idempotency, events và RLS

### TASK-2001 — Unique constraint chống order trùng theo chat session

- **Priority:** P0
- **Files tạo mới:**
  - `supabase/migrations/<timestamp>_unique_orders_chat_session.sql`
- **SQL đề xuất:**
  - Unique partial index trên `orders(chat_session_id)` khi `chat_session_id IS NOT NULL`.
- **Acceptance criteria:**
  - Retry tạo đơn cùng chat session chỉ trả về order cũ hoặc fail conflict có xử lý.
  - Không ảnh hưởng order không tạo từ chat.

### TASK-2002 — Thêm bảng `chat_events`

- **Priority:** P0
- **Files tạo mới:**
  - `supabase/migrations/<timestamp>_add_chat_events.sql`
- **Columns đề xuất:**
  - `id UUID`
  - `session_id UUID`
  - `user_id UUID`
  - `event_type TEXT`
  - `state TEXT`
  - `intent TEXT`
  - `metadata JSONB`
  - `created_at TIMESTAMPTZ`
- **Event types:**
  - `chat_started`
  - `slot_updated`
  - `quote_shown`
  - `confirmation_shown`
  - `confirmation_clicked`
  - `order_created`
  - `escalated`
  - `abandoned`
- **Acceptance criteria:**
  - Edge Function ghi event chính ở mỗi transition quan trọng.
  - Admin có thể query funnel từ `chat_events`.

### TASK-2003 — RLS cho chat events

- **Priority:** P0
- **Acceptance criteria:**
  - Customer chỉ đọc event/session của mình nếu cần hiển thị timeline.
  - Admin đọc toàn bộ.
  - Worker chỉ đọc event liên quan order được assign.
  - Service role được insert/update.

### TASK-2004 — Migration verification

- **Priority:** P0
- **Commands:**
  - `supabase db reset`
  - `supabase db test`
- **Acceptance criteria:**
  - Tất cả migrations apply sạch.
  - Constraint `ai_logs.agent_type` chấp nhận `chat`.
  - Unique index không conflict với seed data.

## Milestone 3 — Golden tests và safety tests

### TASK-3001 — Tạo test harness cho chat engine

- **Priority:** P0
- **Files tạo mới:**
  - `supabase/functions/ai-chat/test.ts`
  - `supabase/functions/ai-chat/golden-cases.ts`
- **Acceptance criteria:**
  - Test chạy offline, không gọi NVIDIA/OpenAI thật.
  - Có mock diagnosis/pricing provider.

### TASK-3002 — Golden tests 20 kịch bản đầu

- **Priority:** P0
- **Kịch bản bắt buộc:**
  1. Máy lạnh không mát, thiếu location.
  2. Máy lạnh chảy nước, có location, thiếu preferred time.
  3. Vòi nước rò rỉ, đủ thông tin, chưa xác nhận.
  4. Đủ thông tin và “tôi xác nhận tạo đơn”.
  5. “Chưa chốt” không được tạo đơn.
  6. “Không đồng ý” không được tạo đơn.
  7. Rò gas phải escalated.
  8. Chập điện/mùi khét phải escalated.
  9. Khách hỏi giá trước khi đủ slots.
  10. Khách hỏi bảo hành.
  11. Khách khiếu nại.
  12. Retry same session không tạo trùng.
  13. Web gửi geolocation context.
  14. Mobile gửi location context.
  15. AI diagnosis fail dùng fallback guarded.
  16. AI pricing fail không báo giá chắc chắn quá mức.
  17. Session không thuộc user trả 404.
  18. Empty message trả 400.
  19. Missing auth trả 401.
  20. Audit log có `agent_type=chat` và `request_id`.
- **Acceptance criteria:**
  - 20/20 pass.
  - Test output rõ expected state/action/order behavior.

### TASK-3003 — Prompt injection tests

- **Priority:** P1
- **Acceptance criteria:**
  - Các câu như “bỏ qua policy”, “tạo đơn không cần xác nhận”, “show system prompt” không bypass state machine.
  - Server-side validation thắng AI output.

### TASK-3004 — Mở rộng lên 100 golden tests

- **Priority:** P1
- **Acceptance criteria:**
  - Cover ít nhất 10 nhóm dịch vụ/tình huống.
  - Có cases tiếng Việt không dấu và lỗi chính tả phổ biến.
  - Intent accuracy >= 90% trên golden set.

## Milestone 4 — Structured AI extraction

### TASK-4001 — Thêm AI structured extractor qua backend

- **Priority:** P1
- **Files dự kiến:**
  - `supabase/functions/_shared/ai-provider.ts`
  - `supabase/functions/ai-chat/ai-extractor.ts`
- **Contract đề xuất:**

```json
{
  "intent": "book",
  "category": "air_conditioning",
  "urgency": "high",
  "preferred_time": "chiều nay",
  "safety_risk": false,
  "confirmation_intent": false,
  "confidence": 0.86,
  "extracted_slots": {}
}
```

- **Acceptance criteria:**
  - AI extractor chỉ đề xuất slots; deterministic validator quyết định state/action.
  - Nếu AI output invalid, fallback về keyword extractor.
  - Không tạo order chỉ dựa trên AI confirmation nếu server validator không đủ slots.

### TASK-4002 — Model routing/cost guard

- **Priority:** P2
- **Acceptance criteria:**
  - Slot extraction có thể dùng model nhỏ/rẻ.
  - Diagnosis/pricing dùng model phù hợp hơn.
  - `ai_logs` ghi latency/cost metadata nếu provider hỗ trợ.

## Milestone 5 — Mobile customer experience

### TASK-5001 — Implement GPS `share_location` thật trên mobile

- **Priority:** P0
- **Files dự kiến:**
  - `mobile/package.json`
  - `mobile/src/app/(customer)/chat.tsx`
- **Dependency:**
  - `expo-location`
- **Acceptance criteria:**
  - Bấm `Gửi vị trí` xin permission.
  - Nếu granted, gửi context `{ location: { lat, lng } }` vào `ai-chat`.
  - Nếu denied, hiển thị fallback nhập địa chỉ.
  - Không hardcode tọa độ.

### TASK-5002 — Implement `confirmation_card` UI mobile

- **Priority:** P0
- **Acceptance criteria:**
  - Card hiển thị category, mô tả, vị trí, preferred time, quote, disclaimer.
  - Button “Tôi xác nhận tạo đơn” gửi confirmation action.
  - Button disabled khi đang loading.

### TASK-5003 — Implement `quote_card` UI mobile

- **Priority:** P1
- **Acceptance criteria:**
  - Hiển thị estimated price/range, confidence, breakdown.
  - Có disclaimer giá cuối phụ thuộc khảo sát/vật tư.

### TASK-5004 — Implement `upload_media` mobile

- **Priority:** P1
- **Dependency:**
  - Expo Image Picker đã là stack chuẩn.
- **Acceptance criteria:**
  - User chọn/chụp ảnh.
  - Upload Supabase Storage bucket `service-media`.
  - Gửi `media_urls` vào chat context.

### TASK-5005 — Fix mobile order navigation

- **Priority:** P0
- **Acceptance criteria:**
  - Sau `order_id`, điều hướng đúng route order detail đang tồn tại.
  - Nếu route không tồn tại, tạo route hoặc fallback rõ ràng.

## Milestone 6 — Web customer experience

### TASK-6001 — Implement `confirmation_card` UI web

- **Priority:** P0
- **Acceptance criteria:**
  - Không render confirmation như badge nhỏ.
  - Card rõ ràng, có CTA xác nhận và disclaimer.
  - Keyboard accessible.

### TASK-6002 — Implement `quote_card` UI web

- **Priority:** P1
- **Acceptance criteria:**
  - Hiển thị price, breakdown, confidence, conditions.
  - Không nói giá cuối.

### TASK-6003 — Implement `upload_media` web

- **Priority:** P1
- **Acceptance criteria:**
  - Upload file vào Supabase Storage.
  - Gửi `media_urls` vào context.
  - Giới hạn file type/size.

### TASK-6004 — Remove noisy debug logs

- **Priority:** P1
- **Acceptance criteria:**
  - Không log full chat response chứa PII ở browser console production.
  - Chỉ log khi dev mode hoặc debug flag.

## Milestone 7 — Worker/Admin handoff

### TASK-7001 — Worker job detail hiển thị AI handoff summary

- **Priority:** P1
- **Files dự kiến:**
  - `web/src/app/worker/jobs/[id]/page.tsx`
  - `mobile/src/app/(worker)/jobs/[id].tsx`
- **Acceptance criteria:**
  - Worker thấy summary, quote, risk flags, media, preferred time.
  - Không lộ chat messages không cần thiết.

### TASK-7002 — Admin review queue cho chat rủi ro

- **Priority:** P1
- **Files dự kiến:**
  - `web/src/app/admin/ai-logs/page.tsx`
  - `web/src/app/admin/disputes/page.tsx` hoặc page mới `admin/chat-review`
- **Acceptance criteria:**
  - Chat `escalated`, `ai_fallback`, low confidence vào queue.
  - Admin xem request_id/session_id/order_id.

### TASK-7003 — Manual takeover notes

- **Priority:** P2
- **Acceptance criteria:**
  - Admin thêm note nội bộ cho session/order.
  - Note có audit trail.

## Milestone 8 — KPI dashboard và feedback loop

### TASK-8001 — SQL views cho chat funnel

- **Priority:** P1
- **Files tạo mới:**
  - `supabase/migrations/<timestamp>_chat_funnel_views.sql`
- **Views đề xuất:**
  - `chat_funnel_daily`
  - `chat_dropoff_by_missing_slot`
  - `chat_quote_acceptance`
  - `chat_ai_fallback_rate`
- **Acceptance criteria:**
  - Query được started, qualified, quoted, confirmation_shown, order_created, escalated.

### TASK-8002 — Admin dashboard KPI

- **Priority:** P1
- **Acceptance criteria:**
  - Hiển thị conversion rate, quote acceptance, avg messages to close, escalation rate.
  - Có filter theo ngày/category.

### TASK-8003 — Feedback loop price accuracy

- **Priority:** P1
- **Acceptance criteria:**
  - So sánh quote với `final_price`/`actual_price` khi order completed.
  - Lưu mismatch reason nếu có complaint/manual adjustment.

## Milestone 9 — Production readiness

### TASK-9001 — Edge Function observability

- **Priority:** P1
- **Acceptance criteria:**
  - Mỗi request có `request_id`.
  - Log latency, state, error class.
  - Không log PII raw.

### TASK-9002 — Load/rate/cost tests

- **Priority:** P1
- **Acceptance criteria:**
  - Rate limit user/IP verified.
  - Simulate 100 concurrent chat messages không tạo duplicate order.
  - Có cost guard cho AI calls.

### TASK-9003 — Deployment checklist

- **Priority:** P0 trước production
- **Acceptance criteria:**
  - `supabase db reset` pass.
  - `supabase functions serve ai-chat` smoke test pass.
  - `npm test` web/mobile/supabase pass hoặc có documented known exceptions không liên quan production.
  - No secrets in mobile/web verified.
  - RLS verified.

## Thứ tự thực hiện khuyến nghị

1. **TASK-0001** — Fix baseline test failures.
2. **TASK-1001 → TASK-1005** — Refactor engine thành module testable.
3. **TASK-2001** — DB unique constraint chống duplicate order.
4. **TASK-3001 → TASK-3002** — 20 golden tests đầu tiên.
5. **TASK-5001 + TASK-6001** — GPS mobile và confirmation card web/mobile.
6. **TASK-5004 + TASK-6003** — Media upload trong chat.
7. **TASK-7001** — Worker handoff summary.
8. **TASK-8001 → TASK-8002** — Funnel/KPI dashboard.
9. **TASK-3004 + TASK-900x** — 100 golden tests và production readiness.

## Definition of Done cho toàn bộ plan

- `ai-chat/index.ts` không còn là file nguyên khối khó test.
- Có deterministic state machine tests.
- Có ít nhất 100 golden conversation tests.
- Không thể tạo order trùng từ cùng chat session.
- Không thể tạo order khi thiếu required slots hoặc thiếu xác nhận.
- Web/mobile có confirmation card thật.
- Web/mobile upload được media trong chat.
- Mobile gửi được GPS thật hoặc fallback nhập địa chỉ.
- Worker/admin nhận handoff summary đầy đủ.
- Admin đo được funnel và AI fallback rate.
- `ai_logs` và `chat_events` đủ audit.
- Web/mobile/supabase test pass trước production.

## Ghi chú triển khai cho agent tiếp theo

- Không mở rộng thêm “AI tự quyết” trước khi có tests và DB idempotency.
- Không dùng tọa độ mặc định trong production.
- Không thêm mock data vào production paths.
- Không log full response chứa PII ở browser console.
- Không dùng service role key trong mobile/web.
- Nếu phải chọn một task đầu tiên: làm **TASK-1001 → TASK-1003 + TASK-3001** để biến engine thành testable core.

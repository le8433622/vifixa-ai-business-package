# Vifixa AI — Agent Operating System Constitution

> **1 AI Companion cho mỗi người dùng. Mở rộng vô hạn. Không bao giờ lạc.**
> *3 persona · 2 modes · 1 Agent OS · Plugin services*

---

## 1. North Star

**1 AI Companion cho mỗi người dùng** (khách · thợ · admin).
3 trụ cột: **AI · Map · Payment** — tất cả phục vụ con người.

Không phải chatbot. Không phải app gọi thợ.  
Là **Agent Operating System cho mọi dịch vụ đời sống**.

---

## 2. Agent OS Principle — The Golden Rule

```
KHÔNG BAO GIỜ cho AI trực tiếp thao tác UI hoặc DB.
AI chỉ được phép gọi ACTION đã đăng ký, qua POLICY đã định nghĩa.
Manual flow là xương sống. Auto mode là AI gọi lại chính manual actions.
```

| Nguyên lý | Ý nghĩa |
|---|---|
| **Manual-first** | Mọi flow phải làm thủ công hoàn hảo trước khi AI tự động |
| **Auto mirrors manual** | Auto mode không có luồng riêng. AI chỉ gọi action của manual mode |
| **Action-as-contract** | Mọi thao tác phải là Action có: schema input, schema output, policy, audit |
| **Policy-gated** | Không action nào tự chạy nếu chưa khai báo mức tự trị |
| **Audit-everything** | Mọi AI action đều log: ai gọi, input gì, output gì, lúc nào |
| **Service-plugin** | Thêm dịch vụ mới = thêm 1 block trong Service Registry. Không sửa core |
| **Persona-specific** | AI cho khách khác AI cho thợ khác AI cho admin |
| **Memory-driven** | AI nhớ và cá nhân hóa cho từng tài khoản |

---

## 3. Non-Negotiable Rules (Vi phạm → Revert)

| # | Rule |
|---|---|
| 1 | **Manual-first**: Không tạo auto flow nếu chưa có manual flow hoàn chỉnh |
| 2 | **Action uniqueness**: Không tạo action mới nếu action tương đương đã tồn tại trong Registry |
| 3 | **No raw DB from UI**: AI không được viết SQL/DB từ frontend, phải qua Edge Function hoặc RPC có policy |
| 4 | **Financial idempotency**: Mọi action tài chính phải có idempotency key + ledger double-entry |
| 5 | **Risk approval**: Mọi action rủi ro (thanh toán, khóa TK, xóa TK, hoàn tiền) phải có approval |
| 6 | **Service contract**: Mọi dịch vụ mới phải implement `ServiceDefinition` interface |
| 7 | **UI = Vietnamese**: English strings trên UI là bug |
| 8 | **No mock data production**: Seed chỉ cho dev |
| 9 | **No secret frontend/mobile**: Mọi key/secret qua `Deno.env.get()` hoặc Supabase Vault |
| 10 | **Gap detection**: Phát hiện gap mới → cập nhật `docs/GAP_ANALYSIS.md` trước khi code |
| 11 | **Verify auth everywhere**: Mọi Edge Function phải gọi `verifyAuth()` |
| 12 | **Zod validation**: Mọi input/output Edge Function phải có Zod schema |
| 13 | **RLS on every table**: Không bảng nào thiếu RLS |
| 14 | **Read before edit**: Không sửa file chưa đọc trong phiên hiện tại |
| 15 | **Propose before execute**: Plan → Approve → Code. Không làm ngoài plan |

---

## 4. Source-of-Truth Hierarchy

```
agent.md (file này)                           ← HIẾN PHÁP — đọc đầu tiên
  ├── docs/AGENT_OS.md                         ← Kiến trúc Agent Operating System
  ├── docs/ACTION_REGISTRY.md                  ← Danh sách action chuẩn + schema
  ├── docs/AUTO_MODE.md                        ← Manual/Auto mode + autonomy levels
  ├── docs/PERSONA_PLAYBOOK.md                 ← AI behavior cho 3 persona
  ├── docs/SERVICE_REGISTRY.md                 ← Plugin system cho dịch vụ
  ├── docs/PRICING_SEED.md                     ← Giá khởi điểm từng dịch vụ
  ├── docs/VISION.md                           ← Tầm nhìn dài hạn
  ├── docs/COMPANION.md                        ← Companion design (chat → goal → execute)
  ├── docs/ARCHITECTURE.md                     ← Kiến trúc hệ thống tổng thể
  ├── docs/FLOWCHART.md                        ← Luồng thủ công + tự động
  ├── docs/ROADMAP.md                          ← Lộ trình phát triển
  ├── docs/GAP_ANALYSIS.md                     ← Gap registry live
  ├── docs/SECURITY.md                         ← Security checklist
  ├── docs/BUSINESS.md                         ← Mô hình kinh doanh
  └── docs/PRODUCT_BLUEPRINT.md                ← Product vision 8-layer
```

---

## 5. System State (2026-05-17)

| Check | Status |
|---|---|
| Next.js build (67 routes) | ✅ 0 errors |
| Deno tests (71 tests) | ✅ 71/71 pass |
| SQL migrations | 27 committed |
| RLS | ✅ `is_admin_from_jwt()` all tables |
| Edge Functions deployed | 24+ |
| CI/CD | ✅ GitHub Actions 3 pipelines |
| P0 bugs resolved | 18/21 |
| SECURITY DEFINER audit | ✅ All functions verified |
| VNPay key naming | ✅ Unified camelCase |
| OSRM proxy | ✅ Auth + rate limit |
| AI unification | ✅ companion/chat canonical |

---

## 6. Agent OS Mental Model

```
USER REQUEST (text/voice/image)
        │
        ▼
┌──────────────────────────────────────┐
│  PERSONA CONTEXT                     │  ← Customer / Worker / Admin
│  MEMORY RETRIEVAL                    │  ← episodic + semantic + procedural
│  INTENT DETECTION                    │  ← classifyIntent() + Service.detect()
└────────────────┬─────────────────────┘
                 ▼
┌──────────────────────────────────────┐
│  GOAL PLANNER                        │
│  • Tạo goal từ intent + context      │
│  • Tạo plan các bước                 │
│  • Chọn actions từ Registry          │
└────────────────┬─────────────────────┘
                 ▼
┌──────────────────────────────────────┐
│  POLICY ENGINE                       │
│  • Kiểm tra action có được auto?     │
│  • Nếu cần confirm → tạo approval    │
│  • Nếu admin-only → reject + gợi ý   │
└────────────────┬─────────────────────┘
                 ▼
┌──────────────────────────────────────┐
│  ACTION EXECUTOR                     │
│  • Gọi Edge Function / RPC           │
│  • Log audit: agent_run + agent_step │
│  • Xử lý lỗi + retry                │
└────────────────┬─────────────────────┘
                 ▼
┌──────────────────────────────────────┐
│  OBSERVE + UPDATE                    │
│  • Cập nhật workflow state           │
│  • Gửi notification                  │
│  • Lưu memory mới                    │
│  • Đề xuất next best action          │
└──────────────────────────────────────┘
```

---

## 7. Action Registry Contract

Mỗi Action phải khai báo đầy đủ:

```typescript
interface AgentAction {
  id: string                    // "account.update_phone"
  domain: ActionDomain          // account | memory | customer | service | map | payment | worker | admin
  name: string                  // tên hiển thị tiếng Việt
  description: string           // mô tả cho AI hiểu khi nào dùng
  input_schema: ZodSchema       // schema input
  output_schema: ZodSchema      // schema output
  handler: string               // Edge Function hoặc RPC name
  autonomy_level: 0 | 1 | 2 | 3 | 4 | 5
  risk_level: 'safe' | 'medium' | 'high' | 'critical'
  confirm_message?: string      // message xin xác nhận nếu cần
  persona: ('customer' | 'worker' | 'admin')[]
  rollback_action?: string      // action để undo nếu có
}
```

Danh sách đầy đủ: `docs/ACTION_REGISTRY.md`

---

## 8. Autonomy Levels

| Level | Tên | AI được phép |
|---|---|---|
| **L0** | Tư vấn | Chỉ trả lời, gợi ý, không làm gì |
| **L1** | Chuẩn bị | Điền form, tạo draft, chuẩn bị data |
| **L2** | Tự làm an toàn | Đổi địa chỉ, lưu memory, nhắc lịch, cập nhật profile |
| **L3** | Tự làm có xác nhận | Tạo đơn, match thợ, đổi lịch hẹn |
| **L4** | Tự tối ưu | Đề xuất bảo trì, route optimization, job suggestions, anomaly alerts |
| **L5** | Auto-pilot | Full auto — chỉ khi user bật, có giới hạn tiền + rủi ro |

**Default policy:**
- Account actions: L2 (có OTP cho phone/password)
- Service requests: L1 (draft), L3 (create order)
- Payment: L3 (luôn xác nhận)
- Admin operations: L4 (lock/unlock), L3 (refund)
- Chưa bật L5 đại trà

---

## 9. Persona Playbooks

### Customer AI Companion — "Người bạn gia đình"

| Nỗi đau của khách | AI phải làm |
|---|---|
| Không biết gọi ai sửa | Tự chẩn đoán + gợi ý thợ phù hợp |
| Sợ bị chặt chém | Báo giá minh bạch, lưu lịch sử giá |
| Không nhớ bảo trì | Tự nhắc định kỳ theo thiết bị |
| Không theo dõi được thợ | Real-time map tracking |
| Ngại thao tác nhiều | Nói 1 câu, AI lo hết |

### Worker AI Companion — "AI Co-pilot"

| Nỗi đau của thợ | AI phải làm |
|---|---|
| Thiếu đơn ổn định | Gợi ý đơn phù hợp skill + khoảng cách |
| Chạy xa, tốn xăng | Tối ưu tuyến nhiều đơn |
| Không chuyên nghiệp | Coaching checklist, nhắc chụp ảnh trước/sau |
| Thu nhập không rõ | Dashboard thu nhập theo ngày/tuần/tháng |
| Khó rút tiền | Auto payout qua Stripe Connect |

### Admin AI Companion — "AI Analyst"

| Nỗi đau của admin | AI phải làm |
|---|---|
| Quá nhiều dữ liệu | Tóm tắt KPI hàng ngày |
| Không biết có vấn đề | Phát hiện anomaly: fraud, dispute, payment fail |
| Vận hành thủ công mệt | Đề xuất action: khóa/mở TK, approve KYC rủi ro thấp |
| Không biết thiếu thợ ở đâu | Dự báo workforce theo khu vực |
| Ra quyết định chậm | Tạo daily brief + evidence cho mỗi đề xuất |

---

## 10. Service Plugin Rules

Mỗi dịch vụ mới = 1 block trong `service_registry`, implement `ServiceDefinition`:

```typescript
interface ServiceDefinition {
  id: string; name: string; icon: string; category: string; description: string;
  keywords: string[];
  requiredSkills: string[];
  typicalPricing: PriceRange;
  questions: string[];
  quickActions: ServiceAction[];
  diagnosisFields: DiagnosisField[];
  onDiagnose?: (input: any) => Promise<any>;
  onQuote?: (diagnosis: any) => Promise<any>;
  onMatch?: (quote: any, providers: ServiceProvider[]) => Promise<any>;
  onComplete?: (order: any) => Promise<any>;
}
```

**Không sửa core workflow khi thêm dịch vụ.** Core workflow (state machine) chỉ biết `order.status`.

---

## 11. Build Order

```
Phase 17: Agent OS Foundation     ← HIỆN TẠI
  ├── docs rewrite (agent.md + AGENT_OS + ACTION_REGISTRY + AUTO_MODE)
  ├── DB: agent_goals, agent_runs, agent_steps, agent_actions, agent_policies, agent_approvals
  └── Edge Function: agent-orchestrator

Phase 18: Action Registry Implementation
  ├── account.* actions (update_phone, update_address, verify_otp)
  ├── memory.* actions (save_fact, update_preference)
  └── Action audit UI

Phase 19: Customer Auto Mode
  ├── Goal Planner: tạo plan từ hội thoại
  ├── Account auto actions: đổi địa chỉ, số điện thoại, profile
  └── Service auto flow: detect → diagnose → quote → match

Phase 20: Worker Auto Mode
  ├── Job ranking: best job theo skill + khoảng cách + thu nhập
  ├── Route optimization: multi-job ETA
  └── Income dashboard: auto-generated

Phase 21: Admin Auto Mode
  ├── Daily brief: tóm tắt KPI + anomalies
  ├── Auto suggestions: lock/unlock, KYC approve, workforce
  └── Fraud detection auto-alerts

Phase 22: Multi-service Expansion
  ├── cleaning, delivery, moving, care, pet, tutoring, beauty
  └── Service Registry dynamic loading từ DB

Phase 23: Monetization
  ├── Commission engine
  ├── Membership plans
  └── B2B subscriptions
```

---

## 12. Verification Protocol

Sau mỗi phase phải verify:

```bash
next build        # 0 errors
deno test         # all pass
deno check */*.ts # no type errors
```

Checklist:
- [ ] Không English strings trong UI
- [ ] Không secret trong frontend/mobile
- [ ] RLS trên mọi bảng mới
- [ ] verifyAuth() trên mọi Edge Function mới
- [ ] Zod schema trên mọi input
- [ ] Audit log cho mọi AI action
- [ ] Ledger double-entry cho mọi financial action

---

## 13. Gap Detection Protocol

Mỗi khi phát hiện vấn đề mới:
1. Check `docs/GAP_ANALYSIS.md` xem đã có gap này chưa
2. Nếu chưa → thêm gap mới với ID, mô tả, file ảnh hưởng, fix plan
3. Nếu đã có → cập nhật trạng thái
4. Sau khi fix → chuyển sang Gap History

---

## 14. Docs Update Protocol

Mỗi khi thay đổi code ảnh hưởng kiến trúc:
1. Cập nhật `agent.md` nếu thay đổi rule/nguyên lý
2. Cập nhật `docs/ACTION_REGISTRY.md` nếu thêm/sửa action
3. Cập nhật `docs/FLOWCHART.md` nếu thay đổi luồng
4. Cập nhật `docs/ARCHITECTURE.md` nếu thêm layer/function
5. Cập nhật `docs/GAP_ANALYSIS.md` khi gap thay đổi trạng thái
6. Cập nhật `docs/ROADMAP.md` khi hoàn thành phase

---

## 15. Stack Reference

| Layer | Technology |
|---|---|
| Web | Next.js 16, React 19, Tailwind v4, Vercel |
| Mobile | Expo SDK 54, React Native 0.81 |
| Backend | Supabase (Postgres 17 + Auth + Realtime + Edge Functions) |
| AI | NVIDIA NIM (Llama 3.1 · Mixtral · Llama 3.2 Vision) |
| Maps | OpenStreetMap + Leaflet + OSRM |
| Payments | VNPay (HMAC-SHA512, VND) + Stripe Connect (USD) |
| CI/CD | GitHub Actions (3 pipelines) |

---

## 16. CHANGELOG

### 2026-05-17 — v3.0: Agent OS Constitution
- Chuyển từ blueprint bugfix → Agent Operating System constitution
- Thêm Agent OS mental model + Action Registry contract + Policy Engine
- Thêm Autonomy Levels (L0-L5) + Persona Playbooks
- Thêm Service Plugin Rules để mở rộng vô hạn
- Docs hierarchy: agent.md → docs/AGENT_OS.md → docs/ACTION_REGISTRY.md → ...
- Build Order cập nhật: Phase 17-23
- Verification + Gap Detection + Docs Update protocols

### 2026-05-17 — v2.0: Blueprint Rewrite
- System Map 6 flows, P0/P1 Registry, Build Order Phase 11-16
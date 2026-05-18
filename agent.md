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
  ├── docs/TASK_PLAN.md                        ← Production-perfect task checklist
  ├── docs/GAP_ANALYSIS.md                     ← Gap registry live
  ├── docs/PROMPT_PROTOCOL.md                  ← Prompt chuẩn cho AI/Product/QA/Release
  ├── docs/CHECKPOINT_SYSTEM_STATE.md          ← Checkpoint trạng thái hệ thống
  ├── docs/SECURITY.md                         ← Security checklist
  ├── docs/BUSINESS.md                         ← Mô hình kinh doanh
  └── docs/PRODUCT_BLUEPRINT.md                ← Product vision 8-layer
```

---

## 5. System State (2026-05-18)

| Check | Status |
|---|---|
| Next.js build (72 routes) | ✅ 0 errors |
| Deno tests (71 tests) | ✅ 71/71 pass |
| Web unit tests | ✅ 33/33 pass |
| Mobile unit tests | ✅ 14/14 pass |
| SQL migrations | 37 committed |
| RLS | ✅ All production tables covered by RLS policies |
| Edge Functions | 50+ implemented |
| CI/CD | ✅ GitHub Actions 3 pipelines |
| P0 bugs resolved | ✅ 21/21 |
| SECURITY DEFINER audit | ✅ All functions verified |
| VNPay key naming | ✅ Unified camelCase |
| OSRM proxy | ✅ Auth + rate limit |
| AI unification | ✅ companion/chat canonical |
| Current product state | Production-ready candidate, not production-proven |
| Remaining launch gates | Staging/prod verification, payment sandbox, Sentry, device STT, full E2E business flow |

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

## 11. Product-Perfect Definition of Done

Không được gọi sản phẩm là "hoàn hảo" nếu thiếu evidence từ checklist bên dưới. Trạng thái đúng hiện tại là **production-ready candidate** cho đến khi tất cả launch gates có bằng chứng thật.

### P0 Launch Gate - bắt buộc trước production

| Gate | Evidence bắt buộc |
|---|---|
| Build web | `npm run build` pass trên CI hoặc staging |
| Unit tests web | `npx vitest run` pass |
| Unit tests mobile | `npx jest --no-coverage` pass |
| Edge Function tests | `deno test --allow-all` pass |
| SQL migrations | Chạy thành công trên staging/prod Supabase |
| RLS | Verify bằng query thật trên staging/prod, không chỉ đọc migration |
| Full E2E business flow | Login -> đặt đơn -> thợ nhận -> hoàn tất -> thanh toán |
| Payment sandbox | VNPay + Stripe chạy sandbox với key thật |
| Observability | Sentry nhận event thật từ deployment |
| Mobile device | STT test trên thiết bị iOS/Android thật |
| Security scan | Không secret trong frontend/mobile, không mock data production |
| Rollback | Có migration rollback hoặc recovery plan cho release |

### P1 Product Polish

| Gate | Evidence bắt buộc |
|---|---|
| UI language | Không English string trong UI tiếng Việt |
| Loading/empty/error | Critical pages có state đầy đủ |
| Page transitions | Navigation chính có page transition thật |
| Mode switch | Auto/manual mode có animation và feedback rõ |
| Voice-first | Người dùng có thể nói -> gửi -> AI xử lý mà không cần gõ |
| Accessibility | Form, button, dialog có label và keyboard path |

### P2 Operations

| Gate | Evidence bắt buộc |
|---|---|
| Load test | 1000 concurrent users hoặc target được Product duyệt |
| Backup/restore | Có drill restore staging |
| Payment reconciliation | Có runbook đối soát VNPay/Stripe/wallet |
| Incident response | Có owner, severity, rollback, communication template |
| Admin audit | AI action/admin action có timeline review được |

---

## 12. Strict Product Workflow

Mọi task mới phải đi theo quy trình này, kể cả task nhỏ nếu chạm kiến trúc, payment, AI action, DB, security hoặc launch readiness.

1. **Discover**: Đọc `agent.md`, `docs/GAP_ANALYSIS.md`, file liên quan.
2. **Gap Check**: Nếu phát hiện gap mới, cập nhật `docs/GAP_ANALYSIS.md` trước khi code.
3. **Plan**: Đưa task plan + checklist + file sẽ sửa.
4. **Approve**: Chờ user approve rõ ràng.
5. **Implement**: Sửa đúng phạm vi đã duyệt, không tự mở scope.
6. **Verify**: Chạy test/build/check phù hợp, ghi rõ lệnh và kết quả.
7. **Docs**: Update docs source-of-truth nếu thay đổi behavior, phase, action, DB, release status.
8. **Evidence**: Mọi claim "done", "ready", "perfect" phải có evidence.
9. **Commit**: Chỉ commit khi user yêu cầu rõ.
10. **Release Gate**: Không production deploy nếu P0 Launch Gate chưa đủ.

---

## 13. Prompt Contract

Mọi prompt cho AI agent trong repo phải dùng contract này. Prompt đầy đủ nằm ở `docs/PROMPT_PROTOCOL.md`.

```text
ROLE: Bạn là [AI Engineer / QA Reviewer / Release Manager / Product Owner / Security Auditor].
CONTEXT: Đọc agent.md trước, sau đó đọc docs/GAP_ANALYSIS.md và file liên quan.
MISSION: Hoàn thành task theo manual-first, action-gated, policy-audited Agent OS.
CONSTRAINTS: Không secret frontend/mobile. Không mock data production. UI tiếng Việt. Không AI direct DB/UI.
PROCESS: Discover -> Gap -> Plan -> Approve -> Implement -> Verify -> Docs -> Evidence.
DONE MEANS: Có test/build/check pass, docs cập nhật, risk còn lại được ghi rõ.
NEVER CLAIM PERFECT: Nếu chưa có production evidence thật.
```

---

## 14. Build Order

```
Phase 17-23: Completed foundation
  ├── Agent OS runtime, actions, policies, audit
  ├── Customer/Worker/Admin auto mode
  ├── Multi-service registry, monetization, B2B, MCP, dark mode
  └── Payment hardening, Sentry, E2E, mobile STT, service area polygon

Phase 24: Product Hardening     ← HIỆN TẠI
  ├── GAP-P1-10: page transitions + mode switch animations
  ├── GAP-P2-03: voice-first auto mode
  ├── Full business E2E: login -> book -> accept -> complete -> pay
  └── Production docs sync: task plan, roadmap, prompt protocol, checkpoint

Phase 25: Production Verification
  ├── Staging deployment smoke test
  ├── Supabase migrations/RLS verification on real DB
  ├── VNPay + Stripe sandbox/live-key audit
  ├── Sentry event verification
  └── Mobile iOS/Android device verification

Phase 26: Launch Operations
  ├── Load test + performance budget
  ├── Backup/restore drill
  ├── Incident runbook + rollback plan
  ├── Payment reconciliation runbook
  └── Launch sign-off by Product/Engineering/Ops
```

---

## 15. Verification Protocol

Sau mỗi phase phải verify theo phạm vi thay đổi. Không cần chạy mọi thứ cho docs-only, nhưng phải ghi rõ vì sao không chạy.

```bash
cd web && npm run build                  # 0 errors
cd web && npx vitest run                 # all pass
cd mobile && npx jest --no-coverage      # all pass
cd mobile && npx tsc --noEmit            # 0 TS errors
cd supabase && deno test --allow-all     # all pass
cd supabase && deno check functions/*/index.ts
```

Checklist:
- [ ] Không English strings trong UI
- [ ] Không secret trong frontend/mobile
- [ ] RLS trên mọi bảng mới
- [ ] verifyAuth() trên mọi Edge Function mới
- [ ] Zod schema trên mọi input
- [ ] Audit log cho mọi AI action
- [ ] Ledger double-entry cho mọi financial action
- [ ] Không gọi "hoàn hảo" nếu thiếu evidence P0 Launch Gate

---

## 16. Gap Detection Protocol

Mỗi khi phát hiện vấn đề mới:
1. Check `docs/GAP_ANALYSIS.md` xem đã có gap này chưa
2. Nếu chưa → thêm gap mới với ID, mô tả, file ảnh hưởng, fix plan
3. Nếu đã có → cập nhật trạng thái
4. Sau khi fix → chuyển sang Gap History

---

## 17. Docs Update Protocol

Mỗi khi thay đổi code ảnh hưởng kiến trúc:
1. Cập nhật `agent.md` nếu thay đổi rule/nguyên lý
2. Cập nhật `docs/ACTION_REGISTRY.md` nếu thêm/sửa action
3. Cập nhật `docs/FLOWCHART.md` nếu thay đổi luồng
4. Cập nhật `docs/ARCHITECTURE.md` nếu thêm layer/function
5. Cập nhật `docs/GAP_ANALYSIS.md` khi gap thay đổi trạng thái
6. Cập nhật `docs/ROADMAP.md` khi hoàn thành phase
7. Cập nhật `docs/TASK_PLAN.md` khi launch checklist thay đổi
8. Cập nhật `docs/CHECKPOINT_SYSTEM_STATE.md` khi state/build/test/commit thay đổi
9. Cập nhật `docs/PROMPT_PROTOCOL.md` khi đổi prompt hoặc agent workflow

---

## 18. Stack Reference

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

## 19. CHANGELOG

### 2026-05-18 — v3.1: Production-Perfect Protocol
- Cập nhật system state: 72 routes, 37 migrations, web/mobile/deno tests green
- Thêm Product-Perfect Definition of Done với P0/P1/P2 launch gates
- Thêm Strict Product Workflow: Discover -> Gap -> Plan -> Approve -> Implement -> Verify -> Docs -> Evidence
- Thêm Prompt Contract và link `docs/PROMPT_PROTOCOL.md`
- Cập nhật Build Order Phase 24-26: hardening, production verification, launch operations
- Quy định không được gọi "hoàn hảo" nếu chưa có production evidence thật

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

# 🧠 Vifixa AI — Product Blueprint

> **AI Service Operating System** — 8 layers
> Vision: 1 AI Companion cho mỗi người dùng

---

## Core Vision

```
                    ┌─────────────────────────────┐
                    │    AI Service Operating      │
                    │    System                    │
                    │                             │
                    │  "1 AI Companion per person" │
                    │                             │
                    │  3 pillars: AI · Map · Pay  │
                    └─────────────────────────────┘
```

Vifixa không phải là "app gọi thợ". Vifixa là **hệ điều hành cho dịch vụ**, nơi AI là trái tim, map là giác quan, payment là mạch máu.

---

## 8-Layer Architecture

```
Layer 8: GROWTH ──── Hệ sinh thái đa dịch vụ, multi-region
Layer 7: IMPROVE ──── Học từ feedback, tự động tối ưu
Layer 6: REMEMBER ─── Memory cá nhân cho mỗi user
Layer 5: SETTLE ───── Thanh toán + Ledger + Payout
Layer 4: NAVIGATE ──── Map + Route + Tracking
Layer 3: COORDINATE ── Workflow + Notify + Escrow
Layer 2: DECIDE ────── AI Diagnose + Match + Price
Layer 1: DIAGNOSE ──── Sense + Listen + Understand
```

---

## Layer 1: Sense (Nhận thức)

Khách hàng nói "Máy lạnh không mát" → AI hiểu được vấn đề.

### Components
- **Companion Chat**: Giao diện chat thân thiện, 3 persona
- **AI Diagnose**: Phân tích sự cố từ mô tả + ảnh
- **Camera Vision**: Chụp ảnh → AI nhận diện thiết bị + lỗi
- **Web Search**: Tra cứu thông tin real-time

### State: ✅ Operational
- Companion Chat deployed (3 persona)
- ai-diagnose active
- ⚠️ Camera Vision chưa tích hợp mobile

---

## Layer 2: Decide (Quyết định)

AI quyết định: thiết bị gì? lỗi gì? giá bao nhiêu? thợ nào?

### Components
- **AI Matching**: Match thợ phù hợp (skill + distance + rating)
- **AI Pricing**: Báo giá tự động dựa trên diagnosis
- **AI Fraud Check**: Kiểm tra gian lận trước khi match
- **AI KYC**: Xác thực danh tính worker bằng Vision AI

### State: ✅ Operational
- ai-matching + ai-fraud-check + ai-kyc deployed
- ⚠️ P0-06: KYC auto-approve bypass Vision AI

---

## Layer 3: Coordinate (Điều phối)

Mọi thứ tự động chạy: notify worker, escrow hold, tracking.

### Components
- **Workflow Engine**: 11-state machine
- **Notification Engine**: SMS/Push/In-app (13 types)
- **Wallet Escrow**: Hold → Release → Refund
- **Auto-executor**: Tự động chạy các bước

### State: ✅ Operational
- Workflow engine deployed + wired
- Notification engine active
- ⚠️ P0-05: Auth leak (service_role key)
- ⚠️ P0-04: AI quality/warranty payload mismatch

---

## Layer 4: Navigate (Dẫn đường)

Worker đến nhà khách → customer thấy real-time.

### Components
- **OSRM Route**: Đường đi tối ưu từ worker → customer
- **Worker GPS**: Background tracking
- **Customer Tracker**: Xem worker real-time trên map
- **Geo-fence Check-in**: Xác nhận worker đến nơi

### State: ✅ Operational
- OSRM route on mobile worker map
- Geo-fence check-in active
- ⚠️ P0-14: OSRM fetch thẳng client (CORS)
- ⚠️ P1-04: WorkerLocationTracker chưa wired mobile

---

## Layer 5: Settle (Thanh toán)

Tiền từ khách → escrow → worker + platform.

### Components
- **VNPay (VND)**: Thanh toán nội địa
- **Stripe (USD)**: Thanh toán quốc tế + Connect
- **Wallet Manager**: 4-wallet system
- **Multi-Ledger**: Double-entry bookkeeping
- **Staking**: 4 plans, VFC Points: 4 tiers

### State: ✅ Operational
- All payment methods deployed
- ⚠️ P0-01/02/03: Endpoint + worker_id + column sai
- ⚠️ P0-08: VNPay key naming mismatch
- ⚠️ P0-04: Stripe signature check fake

---

## Layer 6: Remember (Ghi nhớ)

AI nhớ: thiết bị của bạn, lịch sử sửa chữa, preferences.

### Components
- **Companion Memory**: Episodic + Semantic + Procedural
- **Learning Engine**: Feedback → cập nhật memory
- **Personalization**: Mỗi user 1 AI riêng
- **Device Profiles**: Lịch sử thiết bị + bảo trì

### State: ✅ Operational
- Memory + learning + personalization deployed
- Device profiles active
- ⚠️ AI scheduler cron chưa reminder booking

---

## Layer 7: Improve (Cải thiện)

Hệ thống tự học từ feedback, tự động tốt hơn theo thời gian.

### Components
- **AI Predict**: Dự báo doanh thu, workforce
- **AI Anomaly**: Phát hiện bất thường tự động
- **AI Coach**: Gợi ý cho worker
- **AI Care Agent**: Chăm sóc khách hàng chủ động

### State: ✅ Operational
- ai-predict + ai-anomaly + ai-coach + ai-care-agent deployed
- ai-anomaly cron mỗi 6h → admin notification
- ⚠️ Cần thêm auto-action dựa trên anomaly

---

## Layer 8: Grow (Mở rộng)

Từ sửa chữa → mọi dịch vụ trong cuộc sống.

### Components
- **Service Registry**: Plugin system
- **External Platforms**: Shopee, Lazada, VietnamWorks...
- **Multi-language**: VI → EN + regional
- **Multi-region**: VN → SEA → Global

### State: 📅 Future
- Service registry exists (12 agent types)
- Plugin architecture ready
- Chưa có external platform integration
- Multi-language scope defined

---

## 3 Trụ Cột Sản Phẩm

### 🧠 AI Companion
```
┌─────────────────────────────────────────────────────────┐
│  "Người bạn gia đình" (Khách)                           │
│  "AI Co-pilot" (Thợ)                                    │
│  "AI Analyst" (Admin)                                   │
│                                                         │
│  Always on · Always learning · Always personal          │
│                                                         │
│  Memory: "Anh có 2 máy lạnh, 1 tủ lạnh, 1 máy giặt"    │
│  Proactive: "Đã 6 tháng, đến lúc bảo trì máy lạnh"     │
│  Emotional: 8 đức tính (Mettā → Veritas)                │
└─────────────────────────────────────────────────────────┘
```

### 🗺️ Map Intelligence
```
┌─────────────────────────────────────────────────────────┐
│  "Thấy được tất cả"                                      │
│                                                         │
│  Khách: Xem thợ gần → Book → Track                      │
│  Thợ: Xem đơn gần → Route → Check-in                    │
│  Admin: Heatmap → Analytics → Workforce planning        │
│                                                         │
│  Real-time · Geo-fenced · Route-optimized               │
└─────────────────────────────────────────────────────────┘
```

### 💳 Payment Infrastructure
```
┌─────────────────────────────────────────────────────────┐
│  "Tiền chảy đúng chỗ"                                    │
│                                                         │
│  Khách: VNPay/Stripe/Wallet → 1 click pay               │
│  Thợ: Auto-payout → Ledger → Earnings dashboard         │
│  Admin: Fee split → Treasury → Analytics                │
│                                                         │
│  Escrow-secured · Double-entry · Auto-split             │
└─────────────────────────────────────────────────────────┘
```

---

## KPI Targets

| Metric | Current | Target (Q4 2026) |
|--------|---------|------------------|
| AI response time | <3s | <1.5s |
| Payment success rate | ~95% | >99.5% |
| Worker match time | ~2h | <5min |
| Customer retention | — | >60% MoM |
| Admin actions automated | 0% | >90% |
| Platform coverage | 1 service | 5+ services |
| Regions | 1 (VN) | 3+ (VN, TH, ID) |

---

## Design Principles

1. **Mobile-first** — Mọi tính năng phải hoạt động trên mobile trước
2. **Auto by default** — AI tự động làm, manual là fallback
3. **Offline resilience** — App vẫn hoạt động khi mất mạng (cached)
4. **Real-time first** — WebSocket > polling, push > pull
5. **Security by design** — Không thêm security sau, phải có ngay từ đầu
6. **Vietnamese first** — UI tiếng Việt, English là thứ yếu
7. **Plugin architecture** — Mọi service mới = 1 plugin, không sửa core
8. **Double-entry ledger** — Mọi giao dịch đều traceable
9. **AI memory** — AI nhớ user, không xử lý từ đầu mỗi lần
10. **Continuous learning** — Feedback loop tự động cải thiện

---

## Competitive Landscape

| Feature | Vifixa | Grab | Be | Timo |
|---------|--------|------|----|------|
| AI Companion | ✅ Deep | ❌ | ❌ | ❌ |
| AI Diagnose | ✅ | ❌ | ❌ | ❌ |
| Auto Mode | ✅ | ❌ | ❌ | ❌ |
| Escrow Payment | ✅ | ⚠️ | ❌ | ❌ |
| Real-time Tracking | ✅ | ✅ | ✅ | ❌ |
| Multi-service | 📅 | ✅ | ✅ | ❌ |
| Agentic AI | 🏗️ | ❌ | ❌ | ❌ |
| Ledger (double-entry) | ✅ | ❌ | ❌ | ❌ |

**Vifixa's moat**: AI Companion + Auto Mode + Escrow + Ledger — không đối thủ nào có combo này.

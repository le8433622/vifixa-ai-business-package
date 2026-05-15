# 🧠 Vifixa AI — Brain & Heart Architecture

> *Khởi đầu bằng thợ sửa chữa — Tầm nhìn: Tất cả sản phẩm & dịch vụ trong cuộc sống*
> *"1 AI Companion cho mỗi người dùng — Phục vụ mọi nhu cầu, mọi lúc, mọi nơi"*

---

## 🌌 TẦM NHÌN: Universal Service Platform

```
HÔM NAY                                        TƯƠNG LAI
┌────────────────────┐                        ┌────────────────────────────────────┐
│                    │                        │                                    │
│  🔧 Thợ sửa chữa   │                        │  🔧 Sửa chữa     🧹 Dọn dẹp        │
│  • Máy lạnh        │          MỞ RỘNG       │  👨‍🏫 Gia sư       👩‍⚕️ Y tá        │
│  • Điện nước       │       ──────────►     │  👨‍🍳 Đầu bếp     🚗 Tài xế        │
│  • Camera          │                        │  💆 Massage      🏋️ PT cá nhân    │
│  • Đồ gia dụng     │                        │  🎵 Nhạc công    📸 Nhiếp ảnh     │
│                    │                        │  ... VÔ HẠN                         │
└────────────────────┘                        └────────────────────────────────────┘
```

**Nguyên lý:** Không hardcode service type. Mọi service là 1 "plugin" với cùng interface:
```
[User Need] → [AI Understands] → [Match Provider] → [Fulfill] → [Pay] → [Review]
```

---

## 🧬 5-LAYER AI BRAIN ARCHITECTURE

Dựa trên nghiên cứu cognitive architecture (ACT-R) + agent architecture (ReAct, CoT) + multi-layered memory.

```
                         ┌─────────────────────────────────────┐
                         │         👤 NGƯỜI DÙNG              │
                         │   (Nói, gõ, chụp ảnh, gửi vị trí)  │
                         └────────────────┬────────────────────┘
                                          │
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: PERCEPTION (Nhận thức)                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ • Nhận diện ý định (intent classification)                          │  │
│  │ • Phân tích cảm xúc (sentiment analysis)                            │  │
│  │ • Nhận diện ngữ cảnh (thời gian, vị trí, thiết bị)                 │  │
│  │ • Đa phương thức (text, voice, image, location)                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: REASONING & PLANNING (Lý luận & Lập kế hoạch)                    │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ • Chain-of-Thought: phân tích từng bước                            │  │
│  │ • ReAct: vừa suy luận vừa hành động                                │  │
│  │ • Tree-of-Thoughts: cân nhắc nhiều phương án                        │  │
│  │ • Lập kế hoạch đa bước: diagnose → quote → match → track → pay    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: MEMORY (Bộ nhớ)                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ WORKING      │  │ EPISODIC     │  │ SEMANTIC     │  │ PROCEDURAL   │  │
│  │ (Ngắn hạn)   │  │ (Dài hạn)    │  │ (Kiến thức)  │  │ (Kỹ năng)    │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │• Conversation│  │• Lịch sử     │  │• Giá cả thị  │  │• Cách chẩn   │  │
│  │ hiện tại     │  │  tương tác   │  │  trường      │  │  đoán        │  │
│  │• Context     │  │• Sự kiện     │  │• Kiến thức   │  │• Cách báo    │  │
│  │  window      │  │  quan trọng  │  │  chuyên môn  │  │  giá         │  │
│  │• State hiện  │  │• Kết quả     │  │• Thông tin   │  │• Cách match  │  │
│  │  tại         │  │  trước đây   │  │  dịch vụ     │  │  thợ         │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                           │
│  Cơ chế ghi nhớ (ACT-R):                                                  │
│  Activation = BaseLevel + ContextSimilarity + Recency                     │
│  Quên: Decay theo thời gian, chỉ giữ important > threshold                │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: ACTION (Hành động)                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ • 🩺 Chẩn đoán (diagnose)                                          │  │
│  │ • 💰 Báo giá (quote)                                               │  │
│  │ • 🔧 Match người cung cấp (match)                                  │  │
│  │ • 📋 Tạo đơn (create order)                                        │  │
│  │ • 🗺️ Theo dõi (track)                                              │  │
│  │ • 💳 Thanh toán (pay)                                              │  │
│  │ • ⭐ Đánh giá (review)                                             │  │
│  │ • 🌐 Tra cứu internet (web search)                                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │
┌────────────────────────────────────────────────────────────────────────────┐
│  LAYER 5: FEEDBACK & LEARNING (Phản hồi & Học tập)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ • Học từ kết quả: thành công/thất bại                              │  │
│  │ • Cập nhật memory: facts mới, preferences mới                      │  │
│  │ • Điều chỉnh behavior: tone, speed, style theo phản hồi user      │  │
│  │ • Cá nhân hóa liên tục: AI càng dùng càng thông minh               │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │
                         ┌───────▼───────┐
                         │  3 CORES      │
                         │  ┌─────────┐  │
                         │  │ AI Core │  │
                         │  ├─────────┤  │
                         │  │Map Core │  │
                         │  ├─────────┤  │
                         │  │Pay Core │  │
                         │  └─────────┘  │
                         └───────────────┘
```

---

## 🎯 SERVICE-AGNOSTIC ABSTRACTION LAYER

Đây là cốt lõi để mở rộng ra mọi dịch vụ:

```typescript
// Mọi dịch vụ đều implement interface này:
interface Service {
  id: string
  name: string
  icon: string
  category: string
  
  // AI cần biết
  requiredSkills: string[]
  typicalPricing: PriceRange
  
  // Hành vi
  onDiagnose(input: UserInput): Promise<Diagnosis>
  onQuote(diagnosis: Diagnosis): Promise<Quote>
  onMatch(quote: Quote, providers: Provider[]): Promise<Match>
  onTrack(order: Order): Promise<TrackingInfo>
  onPay(order: Order): Promise<PaymentResult>
}

// Hiện tại chỉ có 1 service:
const SERVICES = {
  repair: {
    id: 'repair',
    name: 'Sửa chữa',
    // ...
  }
}

// Tương lai, thêm service mới chỉ cần:
const SERVICES = {
  repair: { /* ... */ },
  cleaning: { /* ... */ },
  tutoring: { /* ... */ },
  healthcare: { /* ... */ },
  // ... vô hạn
}
```

---

## 🗺️ MAP CORE — Spatial Intelligence

Map không chỉ là bản đồ — là **spatial intelligence**:

| Layer | Chức năng | Customer thấy |
|-------|-----------|---------------|
| **Proximity** | "Ai gần tôi nhất?" | Dấu chấm xanh = bạn, chấm đỏ = providers |
| **Matching** | "Route tối ưu nhất" | Provider ETA + đường đi |
| **Tracking** | "Đang ở đâu?" | Real-time location của provider |
| **Coverage** | "Khu vực nào có dịch vụ?" | Heatmap availability |
| **Territory** | "Giá theo khu vực" | Price zones |

### Customer Map Flow:
```
[User mở app] 
  → Map hiện providers gần nhất (nếu đang cần service)
  → [Chat với AI] → AI hỏi vị trí → Map cập nhật
  → [Quote] → Map show top 3 providers gần + ETA
  → [Confirm] → Map show route provider → user
  → [Tracking] → Map show real-time location
  → [Done] → Map tắt
```

---

## 💳 PAYMENT CORE — Financial Flow

Payment là **trust layer**:

| Phase | Payment Role | UX |
|-------|-------------|-----|
| **Quote** | Giá minh bạch, không phí ẩn | AI show breakdown |
| **Deposit** | Đặt cọc (optional) | VNPay QR / Stripe |
| **Milestone** | Giải ngân theo tiến độ | AI tự động |
| **Completion** | Thanh toán cuối | 1 click |
| **Review** | Giữ tiền cho đến khi review OK | Escrow |
| **Dispute** | Hoàn tiền nếu có tranh chấp | AI hòa giải |

### Customer Payment Flow:
```
[Service complete]
  → AI: "Dịch vụ đã hoàn thành. Tổng: 450,000₫"
  → [💳 VNPay] [💳 Stripe] [⏳ Sau]
  → User click → QR code / redirect
  → Done → AI: "Cảm ơn! Đánh giá dịch vụ?"
  → ⭐⭐⭐⭐⭐
```

---

## 🔄 STATE MACHINE (Updated với Universal Vision)

```
                    ┌──────────┐
                    │  🏠 IDLE │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ 💬 CHAT  │◄──── ALL services bắt đầu từ chat
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
       ┌──────────┐ ┌────────┐ ┌────────┐
       │🔍 DIAG-  │ │💰 QUOTE│ │👆 MENU │
       │  NOSE    │ │        │ │(manual)│
       │(AI phân  │ │(AI báo │ └────────┘
       │ tích)    │ │ giá)   │
       └──────────┘ └────────┘
              │          │
              └──────────┘
                         │
                    ┌────▼─────┐
                    │ ✅ CONFIRM│
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
       ┌──────────┐ ┌────────┐ ┌────────┐
       │🔧 MATCH  │ │🗺️ TRACK│ │📋 ORDER│
       │(tìm      │ │(theo   │ │(chi    │
       │ provider)│ │ dõi)   │ │ tiết)  │
       └──────────┘ └────────┘ └────────┘
                         │
                    ┌────▼─────┐
                    │ 💳 PAY   │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ ⭐ REVIEW │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ 🏁 DONE  │──► Warranty (30 days)
                    └──────────┘──► Re-order suggestion
                                  ► Memory cập nhật
```

---

## 📊 CUSTOMER SCREEN — Tối ưu qua 3 Cores (Assessment)

### 🤖 AI CORE: ✅ Gần tối ưu
Đã có:
- Personality Engine (8 virtues)
- Personalization Engine (mỗi user 1 AI)
- Web Search real-time
- Voice + Location + Image input
- Action cards (diagnose, quote, confirm, pay)

Cần thêm:
- [ ] Chain-of-Thought reasoning (hiển thị suy luận của AI)
- [ ] Memory consolidation (học từ kết quả cũ)
- [ ] Multi-service abstraction (service-agnostic)
- [ ] Feedback loop (học từ review/rating)

### 🗺️ MAP CORE: ✅ Tối ưu
Đã có:
- Contextual map (quoting, tracking)
- Location picker
- Worker proximity

### 💳 PAYMENT CORE: ✅ Tối ưu
Đã có:
- Inline payment card
- VNPay + Stripe
- Payment in order detail

---

## 🎯 ĐỀ XUẤT TIẾP THEO

Tôi đề xuất **HOÀN THIỆN AI BRAIN trước** (Layer 2: Reasoning + Layer 5: Learning) vì:

1. **Reasoning Layer** sẽ làm AI thông minh hơn — show chain-of-thought, giải thích tại sao
2. **Learning Layer** sẽ làm AI học từ kết quả — càng dùng càng thông minh
3. **Service Abstraction** sẽ làm platform sẵn sàng mở rộng — hôm nay thợ, mai mọi service
4. **Map + Payment** đã tối ưu rồi, chỉ cần tinh chỉnh

Sau đó, mới chuyển sang **Worker Screen** với cùng architecture này.

Bạn muốn tôi:
- **Option A**: Xây Reasoning + Learning Layer ngay (nâng cấp AI brain)
- **Option B**: Code service abstraction để chuẩn bị mở rộng (multi-service)
- **Option C**: Cả 2
- **Option D**: Chuyển sang Worker Screen luôn

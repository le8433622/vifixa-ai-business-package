# Vifixa Income Commerce OS

> Mục tiêu: chuyển Vifixa từ app dịch vụ đời sống sang lõi kiếm tiền tự học: người dân có tài sản/kỹ năng/thời gian, khách có nhu cầu thật, AI biến hai bên thành giao dịch minh bạch, hệ thống đo lời/lỗ và sửa sai liên tục.

## 1. North Star

```txt
AI không chỉ trả lời.
AI giúp con người tạo thu nhập thật.
```

Vifixa Income Commerce OS là hệ điều phối:

```txt
Income Source -> Offer -> Demand -> Match -> Order -> Payment -> Profit -> Correction -> Learning
```

## 2. Nguyên tắc cốt lõi

1. **Income-first**: mọi module phải trả lời người dùng kiếm tiền bằng gì.
2. **Trust-before-scale**: không scale nếu chưa đủ niềm tin, xác minh, bằng chứng.
3. **Positive expected cashflow**: không tối ưu doanh thu ảo; chỉ scale khi lợi nhuận kỳ vọng dương.
4. **Correction-over-perfection**: AI được phép sai nhỏ, nhưng phải đo được, sửa được, học được.
5. **Human-governed**: AI không tự xử lý tiền lớn, hoàn tiền, tranh chấp cuối cùng, khóa tài khoản.
6. **Manual-first, auto-mirrors-manual**: giữ nguyên hiến pháp Agent OS hiện tại.

## 3. Domain mới

| Domain | Mục đích |
|---|---|
| `income-engine` | Người dân kiếm tiền bằng tài sản/kỹ năng/thời gian nào |
| `offer-engine` | Biến income source thành offer có thể bán |
| `demand-engine` | Chuẩn hóa nhu cầu khách thành demand rõ ràng |
| `profit-engine` | Tính unit economics, net profit, cashflow |
| `experiment-engine` | Test nhỏ offer/content/price/channel |
| `correction-engine` | Tìm nguyên nhân âm và sinh phương án sửa |
| `learning-engine` | Lưu bài học có cấu trúc để tái sử dụng |
| `decision-engine` | Quyết định test/scale/pause/kill/revise |

## 4. Flow vận hành

```txt
Partner nói: Tôi có 2 phòng trống gần biển
-> Income Engine phân loại tài sản
-> Offer Engine tạo offer: phòng gia đình, phòng nhóm, cọc giữ phòng
-> Demand Engine nhận khách: cần phòng gần biển, 4 người, giá minh bạch
-> Matching Engine ghép offer phù hợp
-> Payment tạo cọc/order
-> Profit Engine tính lời/lỗ sau phí
-> Experiment Engine test offer/giá/content
-> Correction Engine sửa nếu âm
-> Learning Engine lưu bài học
```

## 5. Thuật toán sửa sai

```txt
Hypothesis -> Experiment -> Result -> Error Diagnosis -> Correction -> Retest -> Learning
```

Không có “luôn dương tuyệt đối”. Chỉ có hệ thống:

```txt
sai nhỏ
đo nhanh
cắt lỗ sớm
giữ biến thể dương
scale từng bậc
```

## 6. Quy tắc scale

Một offer/campaign chỉ được scale khi:

```txt
expected_net_profit > 0
confidence >= threshold
refund_risk <= threshold
cashflow_delay acceptable
sample_size đủ tối thiểu
```

Nếu âm:

```txt
chẩn đoán loss driver
sinh correction hypotheses
chạy experiment nhỏ
vẫn âm -> kill/pause/reposition
```

## 7. Không thay thế hệ cũ

File này không xóa Agent OS cũ. Nó mở rộng từ:

```txt
AI + Map + Payment + Service Registry
```

thành:

```txt
AI + Income + Offer + Demand + Profit + Correction + Payment + Trust
```

## 8. Definition of Done cho lõi mới

- Có schema income/offers/demands/experiments/profit/corrections/learnings.
- Có TypeScript engine độc lập không phụ thuộc UI.
- Có quyết định `test | scale | pause | kill | revise`.
- Có risk-adjusted profit score.
- Có learning record lưu bài học sau mỗi vòng sửa sai.
- Không action tài chính nào tự động vượt policy hiện tại.

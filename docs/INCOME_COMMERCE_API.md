# Income Commerce API

## POST `/functions/v1/income-commerce`

Chạy một vòng phân tích:

```txt
profit -> loss diagnosis -> correction hypotheses -> decision -> learning record
```

## Auth

Yêu cầu `Authorization: Bearer <user_access_token>`.

## Request

```json
{
  "offer_id": "optional uuid",
  "experiment_id": "optional uuid",
  "variant_id": "optional uuid",
  "hypothesis": "Nếu bán combo phòng + xe máy thì tỷ lệ cọc tăng",
  "context": {
    "market": "Cửa Lò hè",
    "audience": "gia đình 4 người",
    "channel": "TikTok"
  },
  "costs": {
    "revenue": 1200000,
    "cogs": 800000,
    "adSpend": 120000,
    "fulfillmentCost": 50000,
    "paymentFee": 12000,
    "refundCost": 0,
    "opsCost": 30000,
    "platformFee": 36000
  },
  "metrics": {
    "impressions": 10000,
    "clicks": 300,
    "inquiries": 30,
    "paidOrders": 2,
    "revenue": 2400000,
    "cost": 240000,
    "refunds": 0,
    "complaints": 0
  },
  "confidence": 0.72,
  "risk_score": 0.25,
  "currency": "VND",
  "persist": true
}
```

## Response

```json
{
  "success": true,
  "data": {
    "profit": {
      "revenue": 1200000,
      "totalCost": 1048000,
      "netProfit": 152000,
      "profitMargin": 0.1266,
      "isPositive": true,
      "currency": "VND"
    },
    "diagnosis": {
      "isLoss": false,
      "drivers": [],
      "explanation": "Profit is positive or there is not enough data to diagnose loss."
    },
    "corrections": [],
    "decision": {
      "decision": "test",
      "reason": "Positive signal but needs more data."
    },
    "learning": {
      "lesson": "..."
    },
    "persisted": {
      "profit_record_id": "uuid",
      "correction_cycle_id": null,
      "learning_record_id": "uuid",
      "commerce_decision_id": "uuid"
    }
  }
}
```

## Quy tắc an toàn

- Server không được dùng kết quả này để tự chi tiền lớn.
- `decision=scale` chỉ là đề xuất, không tự động tăng ngân sách nếu chưa có policy.
- Các hành động liên quan payment/refund/ads budget phải đi qua Agent OS approval.
- Giai đoạn đầu chỉ dùng để ghi nhận, phân tích, sửa sai và tạo đề xuất.

## Ý nghĩa với Vifixa

Endpoint này là viên gạch đầu tiên để chuyển hệ thống từ:

```txt
AI tìm thợ cho khách
```

sang:

```txt
AI giúp người dân tạo offer, đo profit, sửa sai và scale cái dương.
```

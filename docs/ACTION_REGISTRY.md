# Vifixa AI — Action Registry

> Mọi action mà AI hoặc User có thể gọi phải được đăng ký ở đây.
> Đây là "hợp đồng" duy nhất giữa UI Manual và AI Auto.

---

## 1. Action Schema

Mỗi action có:

```typescript
interface AgentAction {
  id: string                    // Unique, dạng "domain.action_name"
  domain: ActionDomain          // account | memory | customer | service | map | payment | worker | admin
  name: string                  // Tên hiển thị tiếng Việt
  description: string           // Mô tả để AI hiểu khi nào dùng
  input_schema: object          // Zod/JSON Schema input
  output_schema: object         // Zod/JSON Schema output
  handler: string               // Edge Function path hoặc RPC name
  autonomy_level: 0|1|2|3|4|5
  risk_level: 'safe'|'medium'|'high'|'critical'
  confirm_message?: string
  persona: ('customer'|'worker'|'admin')[]
  rollback_action?: string
}
```

---

## 2. Account Actions

### `account.read_profile`
| Field | Value |
|---|---|
| Domain | account |
| Name | Xem hồ sơ |
| Handler | `GET /functions/v1/account` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer, worker, admin |

### `account.update_profile`
| Field | Value |
|---|---|
| Domain | account |
| Name | Cập nhật hồ sơ |
| Input | `{ full_name?: string, avatar_url?: string, bio?: string }` |
| Handler | `POST /functions/v1/account/update-profile` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer, worker, admin |

### `account.update_phone`
| Field | Value |
|---|---|
| Domain | account |
| Name | Đổi số điện thoại |
| Input | `{ new_phone: string, otp_code: string }` |
| Handler | `POST /functions/v1/account/update-phone` |
| Autonomy | L2 |
| Risk | medium |
| Confirm | OTP required |
| Persona | customer, worker, admin |

### `account.update_address`
| Field | Value |
|---|---|
| Domain | account |
| Name | Đổi địa chỉ |
| Input | `{ address: string, lat?: number, lng?: number }` |
| Handler | `POST /functions/v1/account/update-address` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer |

### `account.update_password`
| Field | Value |
|---|---|
| Domain | account |
| Name | Đổi mật khẩu |
| Input | `{ current_password: string, new_password: string }` |
| Handler | `Supabase auth.updateUser()` |
| Autonomy | L2 |
| Risk | medium |
| Confirm | OTP required |
| Persona | customer, worker, admin |

### `account.verify_otp`
| Field | Value |
|---|---|
| Domain | account |
| Name | Xác minh OTP |
| Input | `{ phone: string, code: string, purpose: string }` |
| Handler | `POST /functions/v1/otp/verify` |
| Autonomy | L2 |
| Risk | medium |
| Persona | customer, worker, admin |

### `account.export_data`
| Field | Value |
|---|---|
| Domain | account |
| Name | Xuất dữ liệu cá nhân |
| Handler | `POST /functions/v1/account/export` |
| Autonomy | L1 |
| Risk | safe |
| Persona | customer, worker, admin |

### `account.delete_request`
| Field | Value |
|---|---|
| Domain | account |
| Name | Yêu cầu xóa tài khoản |
| Handler | `POST /functions/v1/account/delete-request` |
| Autonomy | L1 |
| Risk | critical |
| Confirm | "Bạn có chắc muốn xóa tài khoản vĩnh viễn?" |
| Persona | customer, worker, admin |

---

## 3. Memory Actions

### `memory.save_fact`
| Field | Value |
|---|---|
| Domain | memory |
| Name | Lưu thông tin |
| Input | `{ key: string, value: string, importance: 1-5 }` |
| Handler | `POST /functions/v1/companion/memory` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer, worker, admin |

### `memory.update_preference`
| Field | Value |
|---|---|
| Domain | memory |
| Name | Cập nhật sở thích |
| Input | `{ key: string, value: string }` |
| Handler | `POST /functions/v1/companion/memory` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer, worker, admin |

### `memory.forget_fact`
| Field | Value |
|---|---|
| Domain | memory |
| Name | Xóa thông tin đã nhớ |
| Input | `{ key: string }` |
| Handler | `DELETE /functions/v1/companion/memory` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer, worker, admin |

---

## 4. Customer Actions

### `customer.add_device`
| Field | Value |
|---|---|
| Domain | customer |
| Name | Thêm thiết bị |
| Input | `{ name: string, type: string, install_date?: string, brand?: string }` |
| Handler | `POST /functions/v1/customer/devices` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer |

### `customer.create_goal`
| Field | Value |
|---|---|
| Domain | customer |
| Name | Tạo mục tiêu dịch vụ |
| Input | `{ description: string, service_type?: string, urgency?: 'low'|'normal'|'urgent' }` |
| Handler | `POST /functions/v1/agent-orchestrator/create-goal` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer |

### `customer.schedule_maintenance`
| Field | Value |
|---|---|
| Domain | customer |
| Name | Đặt lịch bảo trì định kỳ |
| Input | `{ device_id: string, interval_days: number, start_date: string }` |
| Handler | `POST /functions/v1/customer/schedule-maintenance` |
| Autonomy | L4 |
| Risk | safe |
| Persona | customer |

### `customer.request_refund`
| Field | Value |
|---|---|
| Domain | customer |
| Name | Yêu cầu hoàn tiền |
| Input | `{ order_id: string, reason: string, evidence_urls?: string[] }` |
| Handler | `POST /functions/v1/payment-process/refund` |
| Autonomy | L1 |
| Risk | high |
| Confirm | "Bạn có chắc muốn yêu cầu hoàn tiền?" |
| Persona | customer |

---

## 5. Service Actions

### `service.detect`
| Field | Value |
|---|---|
| Domain | service |
| Name | Nhận diện dịch vụ |
| Input | `{ query: string }` |
| Output | `{ services: ServiceDefinition[] }` |
| Handler | `serviceRegistry.detect()` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer |

### `service.collect_slots`
| Field | Value |
|---|---|
| Domain | service |
| Name | Thu thập thông tin thiếu |
| Input | `{ service_id: string, current_slots: object }` |
| Output | `{ missing_fields: string[], questions: string[] }` |
| Handler | `serviceRegistry.collectSlots()` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer |

### `service.diagnose`
| Field | Value |
|---|---|
| Domain | service |
| Name | Chẩn đoán sự cố |
| Input | `{ service_id: string, description: string, images?: string[], device_info?: object }` |
| Output | `{ diagnosis: string, confidence: number, estimated_price: PriceRange }` |
| Handler | `POST /functions/v1/ai-diagnose` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer |

### `service.quote`
| Field | Value |
|---|---|
| Domain | service |
| Name | Báo giá |
| Input | `{ diagnosis_id: string, service_id: string }` |
| Output | `{ min_price: number, max_price: number, breakdown: object }` |
| Handler | `POST /functions/v1/ai-estimate-price` |
| Autonomy | L1 |
| Risk | safe |
| Persona | customer |

### `service.create_order`
| Field | Value |
|---|---|
| Domain | service |
| Name | Tạo đơn hàng |
| Input | `{ service_id: string, diagnosis_id: string, quote_id: string, location: {lat,lng}, address: string, customer_note?: string }` |
| Handler | `POST /functions/v1/payment-process/create` |
| Autonomy | L1 |
| Risk | high |
| Confirm | "Xác nhận tạo đơn? Giá dự kiến: XXXđ" |
| Persona | customer |

---

## 6. Map Actions

### `map.geocode`
| Field | Value |
|---|---|
| Domain | map |
| Name | Tìm tọa độ từ địa chỉ |
| Input | `{ address: string }` |
| Output | `{ lat: number, lng: number, formatted_address: string }` |
| Handler | `POST /functions/v1/osm-geocode` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer, worker, admin |

### `map.find_providers`
| Field | Value |
|---|---|
| Domain | map |
| Name | Tìm người cung cấp gần nhất |
| Input | `{ lat, lng, service_id?: string, max_distance_km?: number }` |
| Output | `{ providers: Provider[] }` |
| Handler | `find_nearest_worker RPC` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer |

### `map.route`
| Field | Value |
|---|---|
| Domain | map |
| Name | Tính đường đi |
| Input | `{ from: {lat,lng}, to: {lat,lng} }` |
| Output | `{ route: [{lat,lng}], distance_km, duration_min }` |
| Handler | `POST /functions/v1/osrm-route` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer, worker |

### `map.track_worker`
| Field | Value |
|---|---|
| Domain | map |
| Name | Theo dõi vị trí thợ |
| Input | `{ order_id: string }` |
| Output | `{ worker_location: {lat,lng}, eta_min: number }` |
| Handler | Supabase Realtime subscription |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer |

### `map.check_in`
| Field | Value |
|---|---|
| Domain | map |
| Name | Thợ check-in đến nơi |
| Input | `{ order_id: string, worker_lat: number, worker_lng: number }` |
| Handler | `validate_check_in RPC` |
| Autonomy | L2 |
| Risk | safe |
| Persona | worker |

---

## 7. Payment Actions

### `payment.create_intent`
| Field | Value |
|---|---|
| Domain | payment |
| Name | Tạo thanh toán |
| Input | `{ order_id: string, amount: number, gateway: 'vnpay'|'stripe', return_url: string }` |
| Handler | `POST /functions/v1/payment-process/create` |
| Autonomy | L1 |
| Risk | critical |
| Confirm | "Xác nhận thanh toán XXXđ qua YYY?" |
| Persona | customer |

### `payment.check_status`
| Field | Value |
|---|---|
| Domain | payment |
| Name | Kiểm tra trạng thái thanh toán |
| Input | `{ order_id: string }` |
| Handler | `GET /functions/v1/payment-process/status` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer, worker, admin |

### `payment.request_refund`
| Field | Value |
|---|---|
| Domain | payment |
| Name | Yêu cầu hoàn tiền |
| Input | `{ order_id: string, reason: string, amount?: number }` |
| Handler | `POST /functions/v1/payment-process/refund` |
| Autonomy | L1 |
| Risk | high |
| Confirm | "Yêu cầu hoàn XXXđ?" |
| Persona | customer |

### `payment.release_escrow`
| Field | Value |
|---|---|
| Domain | payment |
| Name | Giải ngân escrow cho thợ |
| Input | `{ order_id: string }` |
| Handler | `release_escrow RPC` |
| Autonomy | L4 |
| Risk | high |
| Persona | admin (auto trigger sau quality pass) |

### `wallet.show_balance`
| Field | Value |
|---|---|
| Domain | payment |
| Name | Xem số dư |
| Handler | `GET /functions/v1/wallet-manager/balance` |
| Autonomy | L2 |
| Risk | safe |
| Persona | customer, worker, admin |

---

## 8. Worker Actions

### `worker.accept_job`
| Field | Value |
|---|---|
| Domain | worker |
| Name | Nhận việc |
| Input | `{ order_id: string }` |
| Handler | `POST /functions/v1/worker/accept-job` |
| Autonomy | L1 |
| Risk | medium |
| Confirm | "Nhận đơn này?" |
| Persona | worker |

### `worker.decline_job`
| Field | Value |
|---|---|
| Domain | worker |
| Name | Từ chối việc |
| Input | `{ order_id: string, reason?: string }` |
| Handler | `POST /functions/v1/worker/decline-job` |
| Autonomy | L2 |
| Risk | safe |
| Persona | worker |

### `worker.check_in`
| Field | Value |
|---|---|
| Domain | worker |
| Name = map.check_in |
| Handler | `validate_check_in RPC` |
| Autonomy | L2 |
| Risk | safe |
| Persona | worker |

### `worker.start_job`
| Field | Value |
|---|---|
| Domain | worker |
| Name | Bắt đầu làm |
| Input | `{ order_id: string }` |
| Handler | `POST /functions/v1/workflow-engine` (event: worker_started) |
| Autonomy | L2 |
| Risk | safe |
| Persona | worker |

### `worker.complete_job`
| Field | Value |
|---|---|
| Domain | worker |
| Name | Hoàn thành |
| Input | `{ order_id: string, checklist: object, before_photos: string[], after_photos: string[], note?: string }` |
| Handler | `POST /functions/v1/workflow-engine` (event: job_completed) |
| Autonomy | L2 |
| Risk | safe |
| Persona | worker |

### `worker.request_payout`
| Field | Value |
|---|---|
| Domain | worker |
| Name | Rút tiền |
| Input | `{ amount: number, bank_info?: object }` |
| Handler | `POST /functions/v1/stripe-create-payout` |
| Autonomy | L1 |
| Risk | critical |
| Confirm | "Rút XXXđ về tài khoản?" |
| Persona | worker |

---

## 9. Admin Actions

### `admin.review_kyc`
| Field | Value |
|---|---|
| Domain | admin |
| Name | Duyệt/từ chối KYC |
| Input | `{ worker_id: string, decision: 'approved'|'rejected', reason?: string }` |
| Handler | `POST /functions/v1/admin/kyc-review` |
| Autonomy | L4 |
| Risk | medium |
| Confirm | "Duyệt KYC cho thợ này?" |
| Persona | admin |

### `admin.lock_user`
| Field | Value |
|---|---|
| Domain | admin |
| Name | Khóa tài khoản |
| Input | `{ user_id: string, level: 1|2|3, reason: string, duration_hours?: number }` |
| Handler | `POST /functions/v1/admin/lock-user` |
| Autonomy | L3 |
| Risk | high |
| Confirm | "Khóa tài khoản này? Lý do: ..." |
| Persona | admin |

### `admin.unlock_user`
| Field | Value |
|---|---|
| Domain | admin |
| Name | Mở khóa tài khoản |
| Input | `{ user_id: string, reason: string }` |
| Handler | `POST /functions/v1/admin/unlock-user` |
| Autonomy | L3 |
| Risk | medium |
| Confirm | "Mở khóa tài khoản này?" |
| Persona | admin |

### `admin.resolve_dispute`
| Field | Value |
|---|---|
| Domain | admin |
| Name | Giải quyết tranh chấp |
| Input | `{ dispute_id: string, decision: string, refund_amount?: number, note: string }` |
| Handler | `POST /functions/v1/admin/resolve-dispute` |
| Autonomy | L3 |
| Risk | high |
| Confirm | "Giải quyết tranh chấp: hoàn XXXđ?" |
| Persona | admin |

### `admin.approve_refund`
| Field | Value |
|---|---|
| Domain | admin |
| Name | Duyệt hoàn tiền |
| Input | `{ refund_request_id: string, decision: 'approved'|'rejected', reason?: string }` |
| Handler | `POST /functions/v1/admin/approve-refund` |
| Autonomy | L3 |
| Risk | critical |
| Confirm | "Duyệt hoàn XXXđ?" |
| Persona | admin |

### `admin.detect_anomaly`
| Field | Value |
|---|---|
| Domain | admin |
| Name | Phát hiện bất thường |
| Handler | `POST /functions/v1/ai-anomaly` |
| Autonomy | L4 |
| Risk | safe |
| Persona | admin |

### `admin.daily_brief`
| Field | Value |
|---|---|
| Domain | admin |
| Name | Tóm tắt ngày |
| Handler | `POST /functions/v1/admin/daily-brief` |
| Autonomy | L4 |
| Risk | safe |
| Persona | admin |
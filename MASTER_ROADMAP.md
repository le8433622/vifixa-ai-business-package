# Vifixa AI — Master Roadmap: Kỷ nguyên vươn mình

> **Tầm nhìn**: 34 tỉnh thành Việt Nam trong 12 tháng → 63 tỉnh thành trong 24 tháng.
> **4 trụ cột**: Worker Profile & Verification · OpenStreetMap · 34 Tỉnh thành · News & Notifications AI

---

## Mục lục

1. [Chiến lược 34 tỉnh thành](#1-chiến-lược-34-tỉnh-thành)
2. [Track A: Worker Profile & Verification](#track-a-worker-profile--verification)
3. [Track B: OpenStreetMap Integration](#track-b-openstreetmap-integration)
4. [Track C: 34 Tỉnh Thành — Vietnam Scale](#track-c-34-tỉnh-thành--vietnam-scale)
5. [Track D: News & Notifications AI](#track-d-news--notifications-ai)
6. [Thứ tự ưu tiên thực thi](#6-thứ-tự-ưu-tiên-thực-thi-priority-queue)
7. [Consolidated Timeline](#7-consolidated-timeline)
8. [File Impact Summary](#8-file-impact-summary)

---

## 1. Chiến lược 34 tỉnh thành

### Lộ trình mở rộng địa lý

```
Phase 1 (3 tháng) — 5 Tỉnh/Thành phố lớn
  🏙️ Hồ Chí Minh  |  🏙️ Hà Nội  |  🏙️ Đà Nẵng  |  🏙️ Cần Thơ  |  🏙️ Hải Phòng

Phase 2 (3 tháng) — +12 Tỉnh vùng kinh tế trọng điểm
  Miền Nam:  Bình Dương, Đồng Nai, Bà Rịa-Vũng Tàu, Long An, Tây Ninh
  Miền Bắc:  Bắc Ninh, Hưng Yên, Hải Dương, Vĩnh Phúc, Quảng Ninh
  Miền Trung: Quảng Nam, Khánh Hòa

Phase 3 (6 tháng) — +17 Tỉnh mở rộng
  ĐB Sông Cửu Long (7): An Giang, Kiên Giang, Tiền Giang, Bến Tre, Vĩnh Long, Đồng Tháp, Cà Mau
  Tây Nguyên (4): Lâm Đồng, Đắk Lắk, Gia Lai, Kon Tum
  Bắc Trung Bộ (3): Nghệ An, Thanh Hóa, Thừa Thiên Huế
  Đông Nam Bộ (2): Bình Phước, Bà Rịa-Vũng Tàu (đã tính ở P2)
  Duyên hải (1): Bình Thuận

Total: 5 + 12 + 17 = 34 tỉnh thành
```

### Nguyên tắc thiết kế cho scale

| Nguyên tắc | Áp dụng |
|------------|---------|
| **Địa chỉ → DB-driven** | Service areas, address select, pricing zones đều lấy từ DB, không hardcode |
| **Location → PostGIS** | Worker location, service area polygon, distance query đều qua PostGIS |
| **Locale → Vietnamese-first** | Tiền VND, ngày VN, số điện thoại VN, format địa chỉ VN |
| **Content → AI-assisted** | Tin tức, promotion, thông báo do AI sinh + admin review |
| **Notification → Multi-channel** | In-app, push, email, SMS — configurable per user |

---

## Track A: Worker Profile & Verification

### Mục tiêu
Xây dựng worker profile hoàn chỉnh với verification flow step-by-step, document management, admin review queue.

### Phase A1: Database & Backend

| # | Task | File | Mô tả |
|---|------|------|-------|
| A1.1 | Tạo `worker_documents` table | `supabase/migrations/...` | user_id, document_type (id_front, id_back, avatar, certificate, selfie), file_url, file_path, is_current, verified_at, verified_by |
| A1.2 | Tạo `verification_audit_log` table | `supabase/migrations/...` | user_id, action (submitted, approved, rejected, resubmitted), previous_status, new_status, reason, admin_id |
| A1.3 | Add columns: avatar_url, dob, gender, nationality | `supabase/migrations/...` | ALTER profiles |
| A1.4 | Add columns: bank_name, bank_account_number, bank_account_holder | `supabase/migrations/...` | ALTER profiles / worker_profiles |
| A1.5 | Tạo storage bucket `verification` | `supabase/migrations/...` | Private bucket, allowed MIME image/jpeg + image/png + application/pdf, 20MB |
| A1.6 | API: `PATCH /api/worker/profile` | `web/src/app/api/worker/profile/route.ts` | Update profile fields, upload document, insert worker_documents, create audit log |
| A1.7 | API: `GET /api/admin/verifications` | `web/src/app/api/admin/verifications/route.ts` | List pending/approved/rejected, include worker profile + documents + audit log, pagination |
| A1.8 | API: `POST /api/admin/verifications/action` | `web/src/app/api/admin/verifications/route.ts` | approve/reject/request_resubmit với reason, update worker status, audit log, notify |

### Phase A2: Worker Profile Web

| # | Task | File | Mô tả |
|---|------|------|-------|
| A2.1 | Profile layout redesign | `web/src/app/worker/profile/page.tsx` | Sidebar info + main content, avatar upload, personal info, verification timeline |
| A2.2 | Avatar upload + preview | `web/src/app/worker/profile/page.tsx` | Crop, camera, delete, progress bar |
| A2.3 | ID documents section | `web/src/app/worker/profile/page.tsx` | Upload front + back, preview thumbnails, drag & drop, delete |
| A2.4 | Bank account section | `web/src/app/worker/profile/page.tsx` | Bank name, account number, account holder |
| A2.5 | Trust score gauge | `web/src/components/worker/TrustScoreGauge.tsx` | Circular progress, breakdown by metrics |
| A2.6 | Verification timeline | `web/src/app/worker/profile/page.tsx` | Visual timeline: submitted → pending → approved/rejected |

### Phase A3: Worker Verification Flow Web

| # | Task | File | Mô tả |
|---|------|------|-------|
| A3.1 | Step wizard UI (4 steps) | `web/src/app/worker/verify/page.tsx` | Progress indicator, prev/next navigation |
| A3.2 | Step 1: Personal Info | `web/src/app/worker/verify/page.tsx` | Name, phone, address, id_number, dob, gender |
| A3.3 | Step 2: ID Documents | `web/src/app/worker/verify/page.tsx` | Upload front + back, live preview, file validation |
| A3.4 | Step 3: Bank Account | `web/src/app/worker/verify/page.tsx` | Bank name, account number, account holder (optional for verify) |
| A3.5 | Step 4: Review & Submit | `web/src/app/worker/verify/page.tsx` | Summary, documents preview, terms checkbox, submit |
| A3.6 | Validate phone (VN format) | `web/src/lib/validators.ts` | +84 / 0 + 9/8/7/5/3 + 7 digits |
| A3.7 | Validate CMND/CCCD | `web/src/lib/validators.ts` | 9 digits (cũ) / 12 digits (mới) |
| A3.8 | Validate file size + type | `web/src/lib/validators.ts` | < 20MB, image/jpeg, image/png, application/pdf |

### Phase A4: Admin Verification Management Web

| # | Task | File | Mô tả |
|---|------|------|-------|
| A4.1 | Verification queue page | `web/src/app/admin/verifications/page.tsx` | Table: worker name, email, phone, submitted_at, status, time since submission |
| A4.2 | Filters: status, date range, search | `web/src/app/admin/verifications/page.tsx` | Filter bar, sort options |
| A4.3 | Verification detail modal | `web/src/app/admin/verifications/page.tsx` | Left: worker info. Right: document viewer with zoom/rotate. Bottom: audit log |
| A4.4 | Approve/Reject with reason | `web/src/app/admin/verifications/page.tsx` | Confirm dialog, reason textarea (required for reject) |
| A4.5 | Resubmit request | `web/src/app/admin/verifications/page.tsx` | Gửi yêu cầu worker sửa lại documents |
| A4.6 | Verification history per worker | `web/src/app/admin/workers/[id]/verification/page.tsx` | Full audit log timeline |

### Phase A5: Mobile (Expo)

| # | Task | File | Mô tả |
|---|------|------|-------|
| A5.1 | Mobile profile rewrite | `mobile/src/app/(worker)/profile.tsx` | Align with web: avatar, ID docs preview, bank account |
| A5.2 | Mobile camera capture | `mobile/src/app/(worker)/profile.tsx` | expo-image-picker + expo-camera for ID docs |
| A5.3 | Mobile verify rewrite | `mobile/src/app/(worker)/verify.tsx` | Same 4-step wizard, camera capture built-in |
| A5.4 | Mobile admin verification | `mobile/src/app/(admin)/verifications.tsx` | Simple queue + detail, pinch-to-zoom |

---

## Track B: OpenStreetMap Integration

### Mục tiêu
Tích hợp bản đồ OSM toàn diện: customer chọn location, worker vẽ service area, admin xem heatmap, AI matching theo khoảng cách.

### Phase B1: Foundation

| # | Task | File | Mô tả |
|---|------|------|-------|
| B1.1 | Enable PostGIS | `supabase/migrations/...` | `CREATE EXTENSION postgis` |
| B1.2 | Nâng cấp `locations` table | `supabase/migrations/...` | Thêm geometry (POLYGON, 4326), coordinates (POINT, 4326), place_type, parent_id, osm_id, tags |
| B1.3 | Add location columns to `orders` | `supabase/migrations/...` | address, location_lat, location_lng, location_geo (POINT), location_accuracy |
| B1.4 | Add location columns to `workers` | `supabase/migrations/...` | home_lat, home_lng, home_address, service_area_polygon (POLYGON), max_service_radius_km |
| B1.5 | Add `home_lat`/`home_lng` to `profiles` | `supabase/migrations/...` | Customer home location |
| B1.6 | Tạo `location_cache` table | `supabase/migrations/...` | Cache Nominatim results, TTL 30 ngày |
| B1.7 | Install Leaflet | `web/package.json` | `leaflet`, `react-leaflet`, `@types/leaflet`, `leaflet-draw`, `leaflet.markercluster` |
| B1.8 | EF: `osm-geocode` | `supabase/functions/osm-geocode/index.ts` | Nominatim proxy: search + reverse, rate-limit 1 req/s, cache |
| B1.9 | EF: `osm-distance` | `supabase/functions/osm-distance/index.ts` | Calculate distances (PostGIS ST_Distance / Haversine) |
| B1.10 | API: `/api/locations/search` | `web/src/app/api/locations/search/route.ts` | Proxy → osm-geocode, caching |
| B1.11 | API: `/api/locations/reverse` | `web/src/app/api/locations/reverse/route.ts` | Reverse geocode |
| B1.12 | API: `/api/workers/nearby` | `web/src/app/api/workers/nearby/route.ts` | PostGIS: ST_DWithin query |

### Phase B2: Web Map Components

| # | Task | File | Mô tả |
|---|------|------|-------|
| B2.1 | `<MapView>` | `web/src/components/map/MapView.tsx` | OSM tiles, center, zoom, markers, onClick, fitBounds |
| B2.2 | `<LocationPicker>` | `web/src/components/map/LocationPicker.tsx` | Click → pin, search address (Nominatim), current location button |
| B2.3 | `<ServiceAreaDrawer>` | `web/src/components/map/ServiceAreaDrawer.tsx` | Polygon draw/edit/delete, Leaflet Draw, area calculation |
| B2.4 | `<DistanceBadge>` | `web/src/components/map/DistanceBadge.tsx` | "2.3 km · ~15 phút" |
| B2.5 | `<MapWithClustering>` | `web/src/components/map/MapWithClustering.tsx` | Leaflet.markercluster |
| B2.6 | `<StaticMapThumbnail>` | `web/src/components/map/StaticMapThumbnail.tsx` | OSM staticmap for email/thumbnails |
| B2.7 | `lib/haversine.ts` | `web/src/lib/haversine.ts` | Haversine distance formula utility |

### Phase B3: Customer Map

| # | Task | File | Mô tả |
|---|------|------|-------|
| B3.1 | Service request: location picker | `web/src/app/customer/service-request/page.tsx` | New step 1.5: LocationPicker + Nominatim autocomplete |
| B3.2 | Order detail: map view | `web/src/app/customer/orders/[id]/page.tsx` | Show order location, worker location (if in_progress) |
| B3.3 | Device location picker | `web/src/app/customer/devices/page.tsx` | LocationPicker for device position |
| B3.4 | Mobile service request map | `mobile/src/app/(customer)/service-request.tsx` | react-native-maps + OSM tiles |
| B3.5 | Mobile order map | `mobile/src/app/(customer)/orders/[id].tsx` | Order location on map |

### Phase B4: Worker Map

| # | Task | File | Mô tả |
|---|------|------|-------|
| B4.1 | Home location picker | `web/src/app/worker/profile/page.tsx` | LocationPicker → save to workers.home_lat/lng |
| B4.2 | Service area on map | `web/src/app/worker/profile/page.tsx` | Replace district list with ServiceAreaDrawer |
| B4.3 | Job distance display | `web/src/app/worker/jobs/page.tsx` | DistanceBadge, sort by distance |
| B4.4 | Mobile worker location | `mobile/src/app/(worker)/profile.tsx` | react-native-maps for home + service area |

### Phase B5: Admin Map

| # | Task | File | Mô tả |
|---|------|------|-------|
| B5.1 | Workers map view toggle | `web/src/app/admin/workers/page.tsx` | Table / Map toggle, MapWithClustering, marker popup |
| B5.2 | Worker detail: service area map | `web/src/app/admin/workers/page.tsx` | Show home marker + service area polygon + orders |
| B5.3 | Orders map view | `web/src/app/admin/orders/page.tsx` | Color-coded markers by status, cluster, filter |
| B5.4 | Dashboard heatmap | `web/src/app/admin/page.tsx` | Order density by location |
| B5.5 | Pricing zones map | `web/src/app/admin/settings/pricing/page.tsx` | Color-coded zone polygons |
| B5.6 | Verification detail map | `web/src/app/admin/verifications/page.tsx` | Worker home + service area when reviewing |

### Phase B6: AI + Location

| # | Task | File | Mô tả |
|---|------|------|-------|
| B6.1 | Distance-aware matching | `supabase/functions/ai-matching/index.ts` | Inject home_lat/lng, proximity priority |
| B6.2 | Location-based pricing | `supabase/functions/ai-estimate-price/index.ts` | Region-based pricing tiers |
| B6.3 | Demand prediction by location | `supabase/functions/ai-predict/index.ts` | Order density → predict hotspot |

---

## Track C: 34 Tỉnh Thành — Vietnam Scale

### Mục tiêu
Mở rộng từ HCMC-centric → 34 tỉnh thành với đầy đủ administrative divisions, cascade address selectors, VN-standard formatting.

### Phase C1: Administrative Divisions

| # | Task | File | Mô tả |
|---|------|------|-------|
| C1.1 | Tạo `vietnam_administrative_divisions` table | `supabase/migrations/...` | code (Tổng cục Thống kê), name, name_short, type (province/district/ward), parent_code, level, geometry, center_lat/lng, region |
| C1.2 | Seed 34 tỉnh thành | `supabase/migrations/...` | INSERT 34 provinces với code + name + center coordinates |
| C1.3 | Seed quận/huyện cho 34 tỉnh | `supabase/migrations/...` | Tất cả districts của 34 provinces |
| C1.4 | Seed phường/xã (Phase 1: 5 thành phố lớn) | `supabase/migrations/...` | Wards cho HCMC + HN + ĐN + CT + HP |
| C1.5 | API: `/api/locations/divisions` | `web/src/app/api/locations/divisions/route.ts` | GET?type=province / ?type=district&parent_code=VN-SG |

### Phase C2: Replace Hardcoded Locations

| # | Task | File | Mô tả |
|---|------|------|-------|
| C2.1 | Replace SERVICE_AREAS (web) | `web/src/app/worker/profile/page.tsx` | Xóa hardcoded `['District 1', ...]`, fetch from DB |
| C2.2 | Replace SERVICE_AREAS (mobile) | `mobile/src/app/(worker)/profile.tsx` | Same |
| C2.3 | Replace seed.sql HCMC districts | `supabase/seed.sql` | Workers với diverse provinces (HCMC, HN, ĐN) |
| C2.4 | Replace AI slot-extractor HCMC list | `supabase/functions/ai-chat/slot-extractor.ts` | Load districts from DB thay vì hardcode |
| C2.5 | Replace hardcode HCMC in service-request | `web/src/app/customer/service-request/page.tsx` | `const location = { lat: 10.8231, lng: 106.6297 }` → real location |

### Phase C3: Cascade Address Selector

| # | Task | File | Mô tả |
|---|------|------|-------|
| C3.1 | Component: `<LocationSelect>` | `web/src/components/ui/LocationSelect.tsx` | 3-level cascade: Tỉnh → Quận/Huyện → Phường/Xã |
| C3.2 | Integrate into verify page | `web/src/app/worker/verify/page.tsx` | Replace address free text with cascade |
| C3.3 | Integrate into profile page | `web/src/app/worker/profile/page.tsx` | Cascade select for address |
| C3.4 | Integrate into service request | `web/src/app/customer/service-request/page.tsx` | Cascade + map location picker |
| C3.5 | Mobile cascade select | `mobile/src/components/LocationSelect.tsx` | React Native picker version |

### Phase C4: Vietnamese Formatting

| # | Task | File | Mô tả |
|---|------|------|-------|
| C4.1 | Currency formatter (VND) | `web/src/lib/format-currency.ts` | `₫1,200,000` |
| C4.2 | Address formatter | `web/src/lib/format-address.ts` | `Số nhà, Đường, Phường, Quận, Tỉnh` |
| C4.3 | Phone validator (VN) | `web/src/lib/validators.ts` | Validate +84 / 0 + đầu số VN |
| C4.4 | Date formatter (VN) | `web/src/lib/format-date.ts` | "Thứ Hai, 13 tháng 5, 2026", relative: "2 ngày trước" |

---

## Track D: News & Notifications AI

### Mục tiêu
Admin soạn bản tin với AI hỗ trợ, AI tự động sinh tin (promotion, news, technology, tips), gửi multi-channel (in-app, push, email, SMS), notification center cho user.

### Phase D1: Database

| # | Task | File | Mô tả |
|---|------|------|-------|
| D1.1 | Tạo `broadcasts` table | `supabase/migrations/...` | title, slug, summary, body, body_html, category (promotion, news, technology, maintenance_tip, policy_update, etc.), priority, target_role, target_provinces, target_skills, status (draft/scheduled/published/archived), scheduled_at, is_ai_generated, ai_prompt, created_by, stats |
| D1.2 | Tạo `broadcast_attachments` table | `supabase/migrations/...` | broadcast_id, type (image/document/video/link), url, title, sort_order |
| D1.3 | Tạo `in_app_notifications` table | `supabase/migrations/...` | user_id, broadcast_id, title, body, category, priority, action_url, is_read, push_sent, email_sent, sms_sent |
| D1.4 | Tạo `notification_templates` table | `supabase/migrations/...` | name, category, title_template, body_template, push_body_template, variables |
| D1.5 | Tạo `user_notification_preferences` table | `supabase/migrations/...` | user_id, push_enabled, email_enabled, sms_enabled, subscribed_categories, quiet_hours, frequency |

### Phase D2: AI Content Generation

| # | Task | File | Mô tả |
|---|------|------|-------|
| D2.1 | EF: `ai-news-writer` | `supabase/functions/ai-news-writer/index.ts` | POST: mode (manual_assist | auto_generate), category, prompt, target_role, tone → return title, summary, body, suggested_targets |
| D2.2 | EF: `ai-news-scheduler` | `supabase/functions/ai-news-scheduler/index.ts` | CRON-triggered: weekly_promotion (Mon 9AM), monthly_newsletter (1st 10AM), tech_update (15th 10AM), worker_tip (Wed 8AM), maintenance_tip (Fri 9AM) |
| D2.3 | EF: `ai-news-personalize` | `supabase/functions/ai-news-personalize/index.ts` | POST: broadcast_id, user_id → personalized title/body/action_url based on user history, location, role |

### Phase D3: Admin Composer UI

| # | Task | File | Mô tả |
|---|------|------|-------|
| D3.1 | News list page | `web/src/app/admin/news/page.tsx` | Table + filter by status/category/priority, search, sort, stats badges |
| D3.2 | Compose page (AI-assisted) | `web/src/app/admin/news/compose/page.tsx` | Two-panel: form + preview, 3 modes (manual/AI-assist/AI-auto) |
| D3.3 | Component: `<AIPromptInput>` | `web/src/components/news/AIPromptInput.tsx` | Textarea với placeholder, "✨ Generate" button, streaming output, tone selector |
| D3.4 | Component: `<RichTextEditor>` | `web/src/components/news/RichTextEditor.tsx` | Tiptap-based: bold, italic, H1-H3, lists, link, image, variable insertion |
| D3.5 | Component: `<TargetSelector>` | `web/src/components/news/TargetSelector.tsx` | Target role + provinces + skills + specific users + exclude users |
| D3.6 | Component: `<SchedulePicker>` | `web/src/components/news/SchedulePicker.tsx` | Date/time picker, recurring, VN timezone |

### Phase D4: Delivery Engine

| # | Task | File | Mô tả |
|---|------|------|-------|
| D4.1 | Rewrite `notify` EF | `supabase/functions/notify/index.ts` | Full: fetch targets, check prefs, create in_app_notifications, send push/email/SMS, update stats |
| D4.2 | Push notification module | `supabase/functions/notify/push.ts` | Expo Push API, batch send (100 tokens/req), handle invalid tokens |
| D4.3 | Email module | `supabase/functions/notify/email.ts` | SMTP client (nodemailer via esm.sh), template rendering |
| D4.4 | SMS module | `supabase/functions/notify/sms.ts` | Twilio / Infobip integration |
| D4.5 | Mobile push registration | `mobile/src/lib/notifications.ts` | expo-notifications: request permission, get token, save to DB |
| D4.6 | Mobile push handler | `mobile/src/app/_layout.tsx` | Foreground banner, background tap → navigate |

### Phase D5: User Notification Center

| # | Task | File | Mô tả |
|---|------|------|-------|
| D5.1 | `<NotificationBell>` | `web/src/components/notifications/NotificationBell.tsx` | Bell icon with unread badge, dropdown last 5, Realtime subscription |
| D5.2 | Notification history page | `web/src/app/notifications/page.tsx` | Full list grouped by date, read/unread, filter by category |
| D5.3 | `<NotificationToast>` | `web/src/components/notifications/NotificationToast.tsx` | Real-time popup on new notification |
| D5.4 | Notification preferences UI | `web/src/app/settings/notifications/page.tsx` | Channel toggles, category subscriptions, quiet hours, frequency |
| D5.5 | Mobile notification center | `mobile/src/app/(customer)/notifications.tsx` | Same layout, pull-to-refresh, swipe actions |
| D5.6 | Mobile notification prefs | `mobile/src/app/(customer)/settings/notifications.tsx` | Same settings |

### Phase D6: Analytics

| # | Task | File | Mô tả |
|---|------|------|-------|
| D6.1 | View/click tracking | Broadcast detail page | Track open_rate, click_rate |
| D6.2 | Admin analytics dashboard | `web/src/app/admin/news/analytics/page.tsx` | Total broadcasts, sent count, open rate chart, top performers |
| D6.3 | A/B testing for news | Compose page | Create 2 versions, split send, compare rates |

---

## 6. Thứ tự ưu tiên thực thi (Priority Queue)

### Nguyên tắc xác định thứ tự
1. **Không có dependency từ track khác** → làm trước
2. **Track khác phụ thuộc vào** → làm ngay
3. **User-facing value cao** → ưu tiên
4. **Replaces hardcode / giảm nợ kỹ thuật** → ưu tiên

### Thứ tự chi tiết (Top → Bottom)

```
TUẦN 1-2: P0 — Foundation
  ┌────────────────────────────────────────────────────────────┐
  │ RUN ASAP (0 dependency, unblocks everything):              │
  │   1. Enable PostGIS                                        │
  │   2. Seed 34 tỉnh (vietnam_administrative_divisions)      │
  │   3. Nâng cấp locations table                              │
  │   4. Tạo worker_documents + verification_audit_log tables │
  │   5. Tạo broadcasts + in_app_notifications tables          │
  │   6. Tạo Edge Functions: osm-geocode, osm-distance         │
  │   7. Install Leaflet + dependencies                         │
  └────────────────────────────────────────────────────────────┘

TUẦN 3-4: P1A + P1C — Profile & Địa chỉ
  ┌────────────────────────────────────────────────────────────┐
  │ PRIORITY #1 (thay hardcode, unblock worker flow):         │
  │   1. Component <LocationSelect> (Tỉnh/Quận cascade)       │
  │   2. VN formatters (currency, address, phone, date)       │
  │   3. Rewrite Worker Profile (avatar, bank, cascade addr)  │
  │   4. Rewrite Worker Verify (4-step wizard)                 │
  │   5. Replace SERVICE_AREAS hardcode → DB-driven            │
  │   6. Replace seed.sql + AI slot-extractor hardcode         │
  └────────────────────────────────────────────────────────────┘

TUẦN 4-5: P1C + P2D — Map Components
  ┌────────────────────────────────────────────────────────────┐
  │ PRIORITY #2 (nền tảng cho tất cả map features):           │
  │   1. <MapView> component                                   │
  │   2. <LocationPicker> component                            │
  │   3. <DistanceBadge> component                             │
  │   4. <MapWithClustering> component                         │
  │   5. <ServiceAreaDrawer> component                         │
  │   6. Add location columns to orders + workers               │
  └────────────────────────────────────────────────────────────┘

TUẦN 5-6: P2A + P2B — Admin Verification + Customer Map
  ┌────────────────────────────────────────────────────────────┐
  │ PRIORITY #3 (admin workflow + customer experience):       │
  │   1. Admin verification queue page (A4.1 → A4.6)          │
  │   2. Service request: location picker (B3.1)              │
  │   3. Order detail: map view (B3.2)                        │
  │   4. Device location picker (B3.3)                         │
  │   5. API: /api/admin/verifications                        │
  │   6. API: /api/worker/profile                              │
  └────────────────────────────────────────────────────────────┘

TUẦN 7-8: P2C + P4A — Admin Map + Worker Map
  ┌────────────────────────────────────────────────────────────┐
  │ PRIORITY #4 (admin insights + worker tools):              │
  │   1. Workers map view toggle (B5.1)                        │
  │   2. Worker detail: service area map (B5.2)               │
  │   3. Orders map view (B5.3)                                │
  │   4. Dashboard heatmap (B5.4)                              │
  │   5. Worker home location on map (B4.1)                   │
  │   6. Worker service area drawer on map (B4.2)             │
  │   7. Jobs distance display (B4.3)                          │
  └────────────────────────────────────────────────────────────┘

TUẦN 8-10: P3C + P3D — News Composer + Notifications
  ┌────────────────────────────────────────────────────────────┐
  │ PRIORITY #5 (user engagement & communication):            │
  │   1. News list page (D3.1)                                 │
  │   2. AI-assisted compose page (D3.2)                       │
  │   3. AI Prompt Input component (D3.3)                      │
  │   4. Rich Text Editor (D3.4)                               │
  │   5. Target Selector + Schedule Picker (D3.5 → D3.6)      │
  │   6. Rewrite notify EF full impl (D4.1)                   │
  │   7. Push + Email + SMS modules (D4.2 → D4.4)             │
  │   8. NotificationBell component (D5.1)                     │
  │   9. Notification history page (D5.2)                     │
  │  10. Notification preferences UI (D5.4)                   │
  └────────────────────────────────────────────────────────────┘

TUẦN 10-11: P4B + P4C + P4D — AI + Analytics
  ┌────────────────────────────────────────────────────────────┐
  │ PRIORITY #6 (AI intelligence + measurement):              │
  │   1. AI news scheduler CRON (D2.2)                         │
  │   2. AI news personalize (D2.3)                            │
  │   3. Distance-aware matching (B6.1)                        │
  │   4. Location-based pricing (B6.2)                         │
  │   5. Demand prediction by location (B6.3)                 │
  │   6. Pricing zones map (B5.5)                              │
  │   7. News analytics dashboard (D6.2)                       │
  │   8. A/B testing for news (D6.3)                           │
  └────────────────────────────────────────────────────────────┘

TUẦN 11-14: P5 — Mobile Complete
  ┌────────────────────────────────────────────────────────────┐
  │ PRIORITY #7 (mobile parity):                              │
  │   1. Mobile profile rewrite (A5.1)                         │
  │   2. Mobile verify rewrite + camera (A5.2 → A5.3)         │
  │   3. Mobile cascade LocationSelect (C3.5)                 │
  │   4. Mobile MapView + LocationPicker (B3.4, B4.4)         │
  │   5. Mobile notification center (D5.5 → D5.6)             │
  │   6. Mobile push registration + handler (D4.5 → D4.6)     │
  │   7. Mobile admin verification (A5.4)                      │
  └────────────────────────────────────────────────────────────┘

TUẦN 14-52: P6 — Rollout 34 Tỉnh
  ┌────────────────────────────────────────────────────────────┐
  │ PRIORITY #8 (scale):                                      │
  │   1. Deploy 5 tỉnh (Tuần 14)                               │
  │   2. Deploy +12 tỉnh (Tuần 24)                             │
  │   3. Deploy +17 tỉnh (Tuần 40)                             │
  │   4. Full 63 tỉnh (Tuần 52)                                │
  └────────────────────────────────────────────────────────────┘
```

## 7. Consolidated Timeline

### Phase 0: Foundation (Tuần 1-2)

```
P0A — Database migrations (all tracks):
  ├── Worker Verification (A1.1 → A1.5)
  ├── PostGIS + Locations (B1.1 → B1.6)
  ├── 34 Tỉnh divisions (C1.1 → C1.4)
  └── Broadcasts + Notifications (D1.1 → D1.5)

P0B — Edge Functions:
  ├── osm-geocode (B1.8)
  ├── osm-distance (B1.9)
  └── ai-news-writer (D2.1)

P0C — API Routes:
  ├── /api/locations/* (B1.10 → B1.12)
  ├── /api/locations/divisions (C1.5)
  └── /api/worker/profile (A1.6)

P0D — Install dependencies:
  ├── Leaflet packages (B1.7)
  └── expo-notifications setup (D4.5)
```

### Phase 1: Worker Core + Map Foundation (Tuần 3-5)

```
P1A — Worker Profile Web (A2.1 → A2.6)
P1B — Worker Verify Web (A3.1 → A3.8)
P1C — Map Components (B2.1 → B2.7)
P1D — Cascade Address (C3.1 → C3.3)
P1E — VN Formatters (C4.1 → C4.4)
```

### Phase 2: Admin + Verification + Customer Map (Tuần 5-7)

```
P2A — Admin Verification (A4.1 → A4.6)
P2B — Customer Maps (B3.1 → B3.3)
P2C — Admin Composer (D3.1 → D3.6)
P2D — Replace all hardcodes (C2.1 → C2.5)
```

### Phase 3: Worker Map + Delivery Engine (Tuần 7-9)

```
P3A — Worker Maps (B4.1 → B4.3)
P3B — Admin Maps (B5.1 → B5.2)
P3C — Delivery Engine (D4.1 → D4.4)
P3D — Notification Center Web (D5.1 → D5.4)
```

### Phase 4: Admin Map + AI Location (Tuần 9-11)

```
P4A — Admin Maps (B5.3 → B5.6)
P4B — AI + Location (B6.1 → B6.3)
P4C — AI Scheduler + Personalize (D2.2 → D2.3)
P4D — Analytics (D6.1 → D6.3)
```

### Phase 5: Mobile Complete (Tuần 11-14)

```
P5A — Mobile Profile (A5.1 → A5.2)
P5B — Mobile Verify (A5.3)
P5C — Mobile Admin Verification (A5.4)
P5D — Mobile Maps (B3.4 → B3.5, B4.4)
P5E — Mobile Cascade + LocationSelect (C3.5)
P5F — Mobile Notification Center (D5.5 → D5.6)
P5G — Mobile Push Handler (D4.6)
```

### Phase 6: Rollout 34 Tỉnh (Tuần 14-52)

```
P6A — Deploy 5 tỉnh (Tuần 14) → HCMC, HN, ĐN, CT, HP
P6B — Deploy +12 tỉnh (Tuần 24) → Vùng kinh tế trọng điểm
P6C — Deploy +17 tỉnh (Tuần 40) → Mở rộng toàn quốc
P6D — Full 63 tỉnh (Tuần 52)
```

---

## 7. File Impact Summary

### New Migrations (16 files)

```
supabase/migrations/20260515000001_worker_documents.sql
supabase/migrations/20260515000002_verification_audit_log.sql
supabase/migrations/20260515000003_worker_missing_columns.sql
supabase/migrations/20260515000004_enable_postgis.sql
supabase/migrations/20260515000005_upgrade_locations_table.sql
supabase/migrations/20260515000006_add_location_columns.sql
supabase/migrations/20260515000007_location_cache.sql
supabase/migrations/20260515000008_create_vietnam_divisions.sql
supabase/migrations/20260515000009_seed_34_provinces.sql
supabase/migrations/20260515000010_seed_districts.sql
supabase/migrations/20260515000011_create_broadcasts.sql
supabase/migrations/20260515000012_create_in_app_notifications.sql
supabase/migrations/20260515000013_create_notification_templates.sql
supabase/migrations/20260515000014_create_user_notification_prefs.sql
supabase/migrations/20260515000015_seed_notification_templates.sql
supabase/migrations/20260515000016_create_verification_bucket.sql
```

### New Edge Functions (8 files)

```
supabase/functions/osm-geocode/index.ts
supabase/functions/osm-distance/index.ts
supabase/functions/ai-news-writer/index.ts
supabase/functions/ai-news-scheduler/index.ts
supabase/functions/ai-news-personalize/index.ts
supabase/functions/ai-news-image/index.ts
supabase/functions/notify/push.ts
supabase/functions/notify/email.ts
supabase/functions/notify/sms.ts
```

### New API Routes (8 files)

```
web/src/app/api/worker/profile/route.ts
web/src/app/api/admin/verifications/route.ts
web/src/app/api/locations/search/route.ts
web/src/app/api/locations/reverse/route.ts
web/src/app/api/locations/divisions/route.ts
web/src/app/api/workers/nearby/route.ts
web/src/app/api/admin/news/route.ts
web/src/app/api/notifications/route.ts
```

### New Web Pages (14 files)

```
web/src/app/worker/verify/page.tsx              (rewrite)
web/src/app/admin/verifications/page.tsx
web/src/app/admin/verifications/[id]/page.tsx
web/src/app/admin/news/page.tsx
web/src/app/admin/news/compose/page.tsx
web/src/app/admin/news/[id]/page.tsx
web/src/app/admin/news/analytics/page.tsx
web/src/app/notifications/page.tsx
web/src/app/settings/notifications/page.tsx
```

### New Web Components (22 files)

```
web/src/components/worker/TrustScoreGauge.tsx
web/src/components/worker/VerificationTimeline.tsx
web/src/components/map/MapView.tsx
web/src/components/map/LocationPicker.tsx
web/src/components/map/ServiceAreaDrawer.tsx
web/src/components/map/DistanceBadge.tsx
web/src/components/map/MapWithClustering.tsx
web/src/components/map/StaticMapThumbnail.tsx
web/src/components/ui/LocationSelect.tsx
web/src/components/news/AIPromptInput.tsx
web/src/components/news/RichTextEditor.tsx
web/src/components/news/TargetSelector.tsx
web/src/components/news/SchedulePicker.tsx
web/src/components/notifications/NotificationBell.tsx
web/src/components/notifications/NotificationToast.tsx
web/src/components/notifications/NotificationList.tsx
```

### New Libraries (6 files)

```
web/src/lib/haversine.ts
web/src/lib/format-currency.ts
web/src/lib/format-address.ts
web/src/lib/format-date.ts
web/src/lib/validators.ts
web/src/lib/notifications.ts
```

### New Mobile Files (8 files)

```
mobile/src/app/(customer)/notifications.tsx
mobile/src/app/(worker)/notifications.tsx
mobile/src/app/(admin)/verifications.tsx
mobile/src/components/LocationSelect.tsx
mobile/src/components/MapView.tsx
mobile/src/components/LocationPicker.tsx
mobile/src/components/NotificationBadge.tsx
mobile/src/lib/notifications.ts
```

### Modified Files (25 files)

```
web/src/app/worker/profile/page.tsx              (rewrite: avatar, bank, cascade address, service area map, trust gauge)
web/src/app/worker/verify/page.tsx               (rewrite: 4-step wizard, cascade address, document upload)
web/src/app/customer/service-request/page.tsx    (+ location picker, cascade address)
web/src/app/customer/orders/[id]/page.tsx        (+ order map)
web/src/app/customer/devices/page.tsx            (+ device location map)
web/src/app/admin/workers/page.tsx               (+ map toggle, service area view)
web/src/app/admin/orders/page.tsx                (+ map view)
web/src/app/admin/settings/pricing/page.tsx      (+ pricing zones map)
web/src/app/admin/settings/layout.tsx            (+ News nav link)
web/src/app/admin/page.tsx                       (+ heatmap)
web/src/app/worker/jobs/page.tsx                 (+ distance display)
mobile/src/app/(worker)/profile.tsx              (rewrite: align with web)
mobile/src/app/(worker)/verify.tsx               (rewrite: 4-step wizard + camera)
mobile/src/app/(customer)/service-request.tsx    (+ location picker)
mobile/src/app/(customer)/orders/[id].tsx        (+ order map)
mobile/src/app/(admin)/workers.tsx               (+ map view)
mobile/src/app/_layout.tsx                       (+ push notification init)
supabase/seed.sql                                (+ diverse provinces workers)
supabase/functions/notify/index.ts               (rewrite: full implementation)
supabase/functions/ai-chat/slot-extractor.ts     (+ DB-driven districts)
supabase/functions/ai-matching/index.ts          (+ distance-aware matching)
supabase/functions/ai-estimate-price/index.ts    (+ region-based pricing)
supabase/functions/ai-predict/index.ts           (+ location demand)
web/package.json                                 (+ leaflet deps)
mobile/package.json                              (+ react-native-maps)
```

---

## Dependency Graph

```
Phase 0 ───┬──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
            │      │            │            │                      │
            │      ├─ A1→A2    ├─ A3→A4     │                      │
            │      ├─ B1→B2    ├─ B2→B3     ├─ B4 → B5             │
            │      ├─ C1→C3    ├─ C2+C4     │                      │
            │      └─ D1─→D3   ├─ D3 ───────┴── D4 ──→ D5 ──→ D6  │
            │                                                        │
            └────────────────────────────────────────────────────────┴──→ Mobile (A5+B+C+D5)
```

---

## Key Metrics

| Metric | Current | Target (12 tháng) |
|--------|---------|-------------------|
| Tỉnh thành | 1 (HCMC) | 34 |
| Worker service areas | 15 HCMC districts | 34 provinces × all districts |
| Map components | 0 | 7 components |
| Map pages | 0 | 12 pages |
| News system | 0 | Full compose → deliver → analytics |
| Notifications sent | 0 (stub) | Multi-channel: in-app + push + email + SMS |
| AI-generated content | 0 | 6+ scheduled AI content types |
| Notification templates | 0 | 10+ templates |

---

*Cập nhật lần cuối: 13/05/2026*

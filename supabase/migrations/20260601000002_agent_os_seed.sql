-- Agent OS Seed Data
-- Phase 17-2: Populate Action Registry + Policy Matrix
-- 30+ actions across 8 domains

-- ========== ACCOUNT ACTIONS ==========

INSERT INTO agent_actions (id, domain, name, description, input_schema, output_schema, handler, autonomy_level, risk_level, persona, confirm_message) VALUES
('account.read_profile', 'account', 'Xem hồ sơ', 'Đọc thông tin hồ sơ người dùng', '{"type":"object","properties":{"user_id":{"type":"string"}}}', '{"type":"object","properties":{"full_name":{"type":"string"},"phone":{"type":"string"},"email":{"type":"string"}}}', 'GET /functions/v1/account', 2, 'safe', '{customer,worker,admin}', NULL),
('account.update_profile', 'account', 'Cập nhật hồ sơ', 'Cập nhật tên, avatar, bio', '{"type":"object","properties":{"full_name":{"type":"string"},"avatar_url":{"type":"string"},"bio":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/account/update-profile', 2, 'safe', '{customer,worker,admin}', NULL),
('account.update_address', 'account', 'Đổi địa chỉ', 'Cập nhật địa chỉ nhà', '{"type":"object","properties":{"address":{"type":"string"},"lat":{"type":"number"},"lng":{"type":"number"}}}', '{"type":"object","properties":{"success":{"type":"boolean"},"formatted_address":{"type":"string"}}}', 'POST /functions/v1/account/update-address', 2, 'safe', '{customer}', NULL),
('account.update_phone', 'account', 'Đổi số điện thoại', 'Cập nhật số điện thoại (cần OTP)', '{"type":"object","properties":{"new_phone":{"type":"string"},"otp_code":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/account/update-phone', 2, 'medium', '{customer,worker,admin}', 'Xác nhận đổi số điện thoại thành {new_phone}?'),
('account.update_password', 'account', 'Đổi mật khẩu', 'Cập nhật mật khẩu (cần mật khẩu cũ)', '{"type":"object","properties":{"current_password":{"type":"string"},"new_password":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'auth.updateUser()', 2, 'medium', '{customer,worker,admin}', 'Xác nhận đổi mật khẩu?'),
('account.verify_otp', 'account', 'Xác minh OTP', 'Xác thực mã OTP', '{"type":"object","properties":{"phone":{"type":"string"},"code":{"type":"string"},"purpose":{"type":"string"}}}', '{"type":"object","properties":{"valid":{"type":"boolean"}}}', 'POST /functions/v1/otp/verify', 2, 'medium', '{customer,worker,admin}', NULL),
('account.export_data', 'account', 'Xuất dữ liệu', 'Xuất toàn bộ dữ liệu cá nhân', '{"type":"object","properties":{}}', '{"type":"object","properties":{"download_url":{"type":"string"}}}', 'POST /functions/v1/account/export', 1, 'safe', '{customer,worker,admin}', NULL),
('account.delete_request', 'account', 'Yêu cầu xóa tài khoản', 'Gửi yêu cầu xóa tài khoản vĩnh viễn', '{"type":"object","properties":{"reason":{"type":"string"}}}', '{"type":"object","properties":{"request_id":{"type":"string"}}}', 'POST /functions/v1/account/delete-request', 1, 'critical', '{customer,worker,admin}', 'Bạn có chắc muốn xóa tài khoản vĩnh viễn? Hành động này không thể hoàn tác.');

-- ========== MEMORY ACTIONS ==========

INSERT INTO agent_actions (id, domain, name, description, input_schema, output_schema, handler, autonomy_level, risk_level, persona, confirm_message) VALUES
('memory.save_fact', 'memory', 'Lưu thông tin', 'Ghi nhớ thông tin mới về user', '{"type":"object","properties":{"key":{"type":"string"},"value":{"type":"string"},"importance":{"type":"integer","minimum":1,"maximum":5}}}', '{"type":"object","properties":{"memory_id":{"type":"string"}}}', 'POST /functions/v1/companion/memory', 2, 'safe', '{customer,worker,admin}', NULL),
('memory.update_preference', 'memory', 'Cập nhật sở thích', 'Cập nhật preference của user', '{"type":"object","properties":{"key":{"type":"string"},"value":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/companion/memory', 2, 'safe', '{customer,worker,admin}', NULL),
('memory.forget_fact', 'memory', 'Xóa thông tin đã nhớ', 'Xóa một memory cụ thể', '{"type":"object","properties":{"key":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'DELETE /functions/v1/companion/memory', 2, 'safe', '{customer,worker,admin}', NULL);

-- ========== CUSTOMER ACTIONS ==========

INSERT INTO agent_actions (id, domain, name, description, input_schema, output_schema, handler, autonomy_level, risk_level, persona, confirm_message) VALUES
('customer.add_device', 'customer', 'Thêm thiết bị', 'Thêm thiết bị vào hồ sơ nhà', '{"type":"object","properties":{"name":{"type":"string"},"type":{"type":"string"},"install_date":{"type":"string"},"brand":{"type":"string"}}}', '{"type":"object","properties":{"device_id":{"type":"string"}}}', 'POST /functions/v1/customer/devices', 2, 'safe', '{customer}', NULL),
('customer.create_goal', 'customer', 'Tạo mục tiêu dịch vụ', 'Tạo goal mới từ yêu cầu dịch vụ', '{"type":"object","properties":{"description":{"type":"string"},"service_type":{"type":"string"},"urgency":{"type":"string","enum":["low","normal","urgent"]}}}', '{"type":"object","properties":{"goal_id":{"type":"string"}}}', 'POST /functions/v1/agent-orchestrator/create-goal', 2, 'safe', '{customer}', NULL),
('customer.schedule_maintenance', 'customer', 'Đặt lịch bảo trì', 'Đặt lịch bảo trì định kỳ cho thiết bị', '{"type":"object","properties":{"device_id":{"type":"string"},"interval_days":{"type":"integer"},"start_date":{"type":"string"}}}', '{"type":"object","properties":{"schedule_id":{"type":"string"}}}', 'POST /functions/v1/customer/schedule-maintenance', 4, 'safe', '{customer}', NULL),
('customer.request_refund', 'customer', 'Yêu cầu hoàn tiền', 'Tạo yêu cầu hoàn tiền cho đơn hàng', '{"type":"object","properties":{"order_id":{"type":"string"},"reason":{"type":"string"},"evidence_urls":{"type":"array","items":{"type":"string"}}}}', '{"type":"object","properties":{"refund_request_id":{"type":"string"}}}', 'POST /functions/v1/payment-process/refund', 1, 'high', '{customer}', 'Bạn có chắc muốn yêu cầu hoàn tiền cho đơn này?');

-- ========== SERVICE ACTIONS ==========

INSERT INTO agent_actions (id, domain, name, description, input_schema, output_schema, handler, autonomy_level, risk_level, persona, confirm_message) VALUES
('service.detect', 'service', 'Nhận diện dịch vụ', 'Phân tích text để nhận diện dịch vụ phù hợp', '{"type":"object","properties":{"query":{"type":"string"}}}', '{"type":"object","properties":{"services":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"score":{"type":"number"}}}}}}', 'serviceRegistry.detect()', 2, 'safe', '{customer}', NULL),
('service.collect_slots', 'service', 'Thu thập thông tin thiếu', 'Hỏi thêm thông tin cần thiết cho dịch vụ', '{"type":"object","properties":{"service_id":{"type":"string"},"current_slots":{"type":"object"}}}', '{"type":"object","properties":{"missing_fields":{"type":"array","items":{"type":"string"}},"questions":{"type":"array","items":{"type":"string"}}}}', 'serviceRegistry.collectSlots()', 2, 'safe', '{customer}', NULL),
('service.diagnose', 'service', 'Chẩn đoán sự cố', 'Gọi AI diagnose để phân tích vấn đề', '{"type":"object","properties":{"service_id":{"type":"string"},"description":{"type":"string"},"images":{"type":"array","items":{"type":"string"}},"device_info":{"type":"object"}}}', '{"type":"object","properties":{"diagnosis":{"type":"string"},"confidence":{"type":"number"},"estimated_price":{"type":"object","properties":{"min":{"type":"number"},"max":{"type":"number"}}}}}', 'POST /functions/v1/ai-diagnose', 2, 'safe', '{customer}', NULL),
('service.quote', 'service', 'Báo giá', 'Tính giá dự kiến dựa trên diagnosis', '{"type":"object","properties":{"diagnosis_id":{"type":"string"},"service_id":{"type":"string"}}}', '{"type":"object","properties":{"min_price":{"type":"number"},"max_price":{"type":"number"},"breakdown":{"type":"object"}}}', 'POST /functions/v1/ai-estimate-price', 1, 'safe', '{customer}', NULL),
('service.create_order', 'service', 'Tạo đơn hàng', 'Tạo đơn hàng dịch vụ mới', '{"type":"object","properties":{"service_id":{"type":"string"},"diagnosis_id":{"type":"string"},"quote_id":{"type":"string"},"location":{"type":"object","properties":{"lat":{"type":"number"},"lng":{"type":"number"}}},"address":{"type":"string"},"customer_note":{"type":"string"}}}', '{"type":"object","properties":{"order_id":{"type":"string"},"status":{"type":"string"}}}', 'POST /functions/v1/payment-process/create', 1, 'high', '{customer}', 'Xác nhận tạo đơn? Giá dự kiến: {min_price}đ - {max_price}đ');

-- ========== MAP ACTIONS ==========

INSERT INTO agent_actions (id, domain, name, description, input_schema, output_schema, handler, autonomy_level, risk_level, persona, confirm_message) VALUES
('map.geocode', 'map', 'Tìm tọa độ', 'Chuyển địa chỉ thành tọa độ', '{"type":"object","properties":{"address":{"type":"string"}}}', '{"type":"object","properties":{"lat":{"type":"number"},"lng":{"type":"number"},"formatted_address":{"type":"string"}}}', 'POST /functions/v1/osm-geocode', 2, 'safe', '{customer,worker,admin}', NULL),
('map.find_providers', 'map', 'Tìm người cung cấp gần nhất', 'Tìm worker gần vị trí chỉ định', '{"type":"object","properties":{"lat":{"type":"number"},"lng":{"type":"number"},"service_id":{"type":"string"},"max_distance_km":{"type":"number"}}}', '{"type":"object","properties":{"providers":{"type":"array","items":{"type":"object"}}}}', 'find_nearest_worker RPC', 2, 'safe', '{customer}', NULL),
('map.route', 'map', 'Tính đường đi', 'Tính route từ điểm A đến B', '{"type":"object","properties":{"from":{"type":"object","properties":{"lat":{"type":"number"},"lng":{"type":"number"}}},"to":{"type":"object","properties":{"lat":{"type":"number"},"lng":{"type":"number"}}}}}', '{"type":"object","properties":{"route":{"type":"array","items":{"type":"object"}},"distance_km":{"type":"number"},"duration_min":{"type":"number"}}}', 'POST /functions/v1/osrm-route', 2, 'safe', '{customer,worker}', NULL),
('map.track_worker', 'map', 'Theo dõi vị trí thợ', 'Xem vị trí real-time của worker', '{"type":"object","properties":{"order_id":{"type":"string"}}}', '{"type":"object","properties":{"worker_location":{"type":"object"},"eta_min":{"type":"number"}}}', 'Supabase Realtime', 2, 'safe', '{customer}', NULL),
('map.check_in', 'map', 'Thợ check-in đến nơi', 'Xác nhận worker đã đến địa điểm', '{"type":"object","properties":{"order_id":{"type":"string"},"worker_lat":{"type":"number"},"worker_lng":{"type":"number"}}}', '{"type":"object","properties":{"success":{"type":"boolean"},"distance_km":{"type":"number"},"within_radius":{"type":"boolean"}}}', 'validate_check_in RPC', 2, 'safe', '{worker}', NULL);

-- ========== PAYMENT ACTIONS ==========

INSERT INTO agent_actions (id, domain, name, description, input_schema, output_schema, handler, autonomy_level, risk_level, persona, confirm_message) VALUES
('payment.create_intent', 'payment', 'Tạo thanh toán', 'Tạo payment intent qua VNPay/Stripe', '{"type":"object","properties":{"order_id":{"type":"string"},"amount":{"type":"number"},"gateway":{"type":"string","enum":["vnpay","stripe"]},"return_url":{"type":"string"}}}', '{"type":"object","properties":{"payment_id":{"type":"string"},"redirect_url":{"type":"string"},"qr_code":{"type":"string"}}}', 'POST /functions/v1/payment-process/create', 1, 'critical', '{customer}', 'Xác nhận thanh toán {amount}đ qua {gateway}?'),
('payment.check_status', 'payment', 'Kiểm tra trạng thái thanh toán', 'Xem tình trạng payment', '{"type":"object","properties":{"order_id":{"type":"string"}}}', '{"type":"object","properties":{"status":{"type":"string"},"amount":{"type":"number"}}}', 'GET /functions/v1/payment-process/status', 2, 'safe', '{customer,worker,admin}', NULL),
('payment.request_refund', 'payment', 'Yêu cầu hoàn tiền', 'Gửi yêu cầu refund', '{"type":"object","properties":{"order_id":{"type":"string"},"reason":{"type":"string"},"amount":{"type":"number"}}}', '{"type":"object","properties":{"refund_request_id":{"type":"string"}}}', 'POST /functions/v1/payment-process/refund', 1, 'high', '{customer}', 'Yêu cầu hoàn {amount}đ?'),
('payment.release_escrow', 'payment', 'Giải ngân escrow', 'Release escrow cho thợ sau khi job hoàn thành', '{"type":"object","properties":{"order_id":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"},"worker_payout":{"type":"number"}}}', 'release_escrow RPC', 4, 'high', '{admin}', NULL),
('wallet.show_balance', 'payment', 'Xem số dư ví', 'Hiển thị số dư các wallet', '{"type":"object","properties":{}}', '{"type":"object","properties":{"wallets":{"type":"array","items":{"type":"object","properties":{"type":{"type":"string"},"balance":{"type":"number"}}}}}}', 'GET /functions/v1/wallet-manager/balance', 2, 'safe', '{customer,worker,admin}', NULL);

-- ========== WORKER ACTIONS ==========

INSERT INTO agent_actions (id, domain, name, description, input_schema, output_schema, handler, autonomy_level, risk_level, persona, confirm_message) VALUES
('worker.accept_job', 'worker', 'Nhận việc', 'Chấp nhận đơn hàng được giao', '{"type":"object","properties":{"order_id":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/worker/accept-job', 1, 'medium', '{worker}', 'Nhận đơn này?'),
('worker.decline_job', 'worker', 'Từ chối việc', 'Từ chối đơn hàng', '{"type":"object","properties":{"order_id":{"type":"string"},"reason":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/worker/decline-job', 2, 'safe', '{worker}', NULL),
('worker.start_job', 'worker', 'Bắt đầu làm', 'Đánh dấu bắt đầu làm việc', '{"type":"object","properties":{"order_id":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/workflow-engine', 2, 'safe', '{worker}', NULL),
('worker.complete_job', 'worker', 'Hoàn thành job', 'Đánh dấu hoàn thành với ảnh + checklist', '{"type":"object","properties":{"order_id":{"type":"string"},"checklist":{"type":"object"},"before_photos":{"type":"array","items":{"type":"string"}},"after_photos":{"type":"array","items":{"type":"string"}},"note":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/workflow-engine', 2, 'safe', '{worker}', NULL),
('worker.request_payout', 'worker', 'Rút tiền', 'Yêu cầu rút tiền từ ví', '{"type":"object","properties":{"amount":{"type":"number"},"bank_info":{"type":"object"}}}', '{"type":"object","properties":{"payout_id":{"type":"string"},"status":{"type":"string"}}}', 'POST /functions/v1/stripe-create-payout', 1, 'critical', '{worker}', 'Rút {amount}đ về tài khoản?');

-- ========== ADMIN ACTIONS ==========

INSERT INTO agent_actions (id, domain, name, description, input_schema, output_schema, handler, autonomy_level, risk_level, persona, confirm_message) VALUES
('admin.review_kyc', 'admin', 'Duyệt/từ chối KYC', 'Review và quyết định KYC worker', '{"type":"object","properties":{"worker_id":{"type":"string"},"decision":{"type":"string","enum":["approved","rejected"]},"reason":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/admin/kyc-review', 4, 'medium', '{admin}', 'Duyệt KYC cho thợ này?'),
('admin.lock_user', 'admin', 'Khóa tài khoản', 'Khóa tài khoản người dùng', '{"type":"object","properties":{"user_id":{"type":"string"},"level":{"type":"integer","enum":[1,2,3]},"reason":{"type":"string"},"duration_hours":{"type":"integer"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/admin/lock-user', 3, 'high', '{admin}', 'Khóa tài khoản này? Lý do: {reason}'),
('admin.unlock_user', 'admin', 'Mở khóa tài khoản', 'Mở khóa tài khoản bị khóa', '{"type":"object","properties":{"user_id":{"type":"string"},"reason":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/admin/unlock-user', 3, 'medium', '{admin}', 'Mở khóa tài khoản này?'),
('admin.resolve_dispute', 'admin', 'Giải quyết tranh chấp', 'Xử lý dispute giữa khách và thợ', '{"type":"object","properties":{"dispute_id":{"type":"string"},"decision":{"type":"string"},"refund_amount":{"type":"number"},"note":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/admin/resolve-dispute', 3, 'high', '{admin}', 'Giải quyết tranh chấp: hoàn {refund_amount}đ?'),
('admin.approve_refund', 'admin', 'Duyệt hoàn tiền', 'Chấp nhận hoặc từ chối refund request', '{"type":"object","properties":{"refund_request_id":{"type":"string"},"decision":{"type":"string","enum":["approved","rejected"]},"reason":{"type":"string"}}}', '{"type":"object","properties":{"success":{"type":"boolean"}}}', 'POST /functions/v1/admin/approve-refund', 3, 'critical', '{admin}', 'Duyệt hoàn {refund_amount}đ?'),
('admin.detect_anomaly', 'admin', 'Phát hiện bất thường', 'Quét hệ thống tìm anomalies', '{"type":"object","properties":{}}', '{"type":"object","properties":{"anomalies":{"type":"array","items":{"type":"object"}}}}', 'POST /functions/v1/ai-anomaly', 4, 'safe', '{admin}', NULL),
('admin.daily_brief', 'admin', 'Tóm tắt ngày', 'Tạo báo cáo tóm tắt hoạt động trong ngày', '{"type":"object","properties":{}}', '{"type":"object","properties":{"kpi":{"type":"object"},"anomalies":{"type":"array"},"suggestions":{"type":"array"}}}', 'POST /functions/v1/admin/daily-brief', 4, 'safe', '{admin}', NULL);

-- ========== POLICY SEED ==========

-- Customer policies
INSERT INTO agent_policies (action_id, persona, max_autonomy_level, require_otp, require_confirmation, max_amount, cooldown_seconds) VALUES
('account.read_profile', 'customer', 2, false, false, NULL, 0),
('account.update_profile', 'customer', 2, false, false, NULL, 0),
('account.update_address', 'customer', 2, false, false, NULL, 0),
('account.update_phone', 'customer', 2, true, true, NULL, 60),
('account.update_password', 'customer', 2, true, true, NULL, 60),
('account.verify_otp', 'customer', 2, false, false, NULL, 0),
('account.export_data', 'customer', 1, false, false, NULL, 3600),
('account.delete_request', 'customer', 1, false, true, NULL, 0),
('memory.save_fact', 'customer', 2, false, false, NULL, 0),
('memory.update_preference', 'customer', 2, false, false, NULL, 0),
('memory.forget_fact', 'customer', 2, false, false, NULL, 0),
('customer.add_device', 'customer', 2, false, false, NULL, 0),
('customer.create_goal', 'customer', 2, false, false, NULL, 0),
('customer.schedule_maintenance', 'customer', 4, false, false, NULL, 0),
('customer.request_refund', 'customer', 1, false, true, NULL, 0),
('service.detect', 'customer', 2, false, false, NULL, 0),
('service.collect_slots', 'customer', 2, false, false, NULL, 0),
('service.diagnose', 'customer', 2, false, false, NULL, 0),
('service.quote', 'customer', 1, false, false, NULL, 0),
('service.create_order', 'customer', 1, false, true, NULL, 0),
('map.geocode', 'customer', 2, false, false, NULL, 0),
('map.find_providers', 'customer', 2, false, false, NULL, 0),
('map.route', 'customer', 2, false, false, NULL, 0),
('map.track_worker', 'customer', 2, false, false, NULL, 0),
('payment.create_intent', 'customer', 1, false, true, 10000000, 0),
('payment.check_status', 'customer', 2, false, false, NULL, 0),
('payment.request_refund', 'customer', 1, false, true, NULL, 0),
('wallet.show_balance', 'customer', 2, false, false, NULL, 0);

-- Worker policies
INSERT INTO agent_policies (action_id, persona, max_autonomy_level, require_otp, require_confirmation, max_amount, cooldown_seconds) VALUES
('account.read_profile', 'worker', 2, false, false, NULL, 0),
('account.update_profile', 'worker', 2, false, false, NULL, 0),
('account.update_phone', 'worker', 2, true, true, NULL, 60),
('account.update_password', 'worker', 2, true, true, NULL, 60),
('account.verify_otp', 'worker', 2, false, false, NULL, 0),
('memory.save_fact', 'worker', 2, false, false, NULL, 0),
('memory.update_preference', 'worker', 2, false, false, NULL, 0),
('map.geocode', 'worker', 2, false, false, NULL, 0),
('map.route', 'worker', 2, false, false, NULL, 0),
('map.check_in', 'worker', 2, false, false, NULL, 0),
('payment.check_status', 'worker', 2, false, false, NULL, 0),
('wallet.show_balance', 'worker', 2, false, false, NULL, 0),
('worker.accept_job', 'worker', 1, false, true, NULL, 0),
('worker.decline_job', 'worker', 2, false, false, NULL, 0),
('worker.start_job', 'worker', 2, false, false, NULL, 0),
('worker.complete_job', 'worker', 2, false, false, NULL, 0),
('worker.request_payout', 'worker', 1, false, true, NULL, 3600);

-- Admin policies
INSERT INTO agent_policies (action_id, persona, max_autonomy_level, require_otp, require_confirmation, max_amount, cooldown_seconds) VALUES
('account.read_profile', 'admin', 2, false, false, NULL, 0),
('account.update_profile', 'admin', 2, false, false, NULL, 0),
('account.update_phone', 'admin', 2, true, true, NULL, 60),
('account.update_password', 'admin', 2, true, true, NULL, 60),
('account.verify_otp', 'admin', 2, false, false, NULL, 0),
('memory.save_fact', 'admin', 2, false, false, NULL, 0),
('map.geocode', 'admin', 2, false, false, NULL, 0),
('map.find_providers', 'admin', 4, false, false, NULL, 0),
('payment.check_status', 'admin', 2, false, false, NULL, 0),
('wallet.show_balance', 'admin', 2, false, false, NULL, 0),
('admin.review_kyc', 'admin', 4, false, false, NULL, 0),
('admin.lock_user', 'admin', 3, false, true, NULL, 0),
('admin.unlock_user', 'admin', 3, false, true, NULL, 0),
('admin.resolve_dispute', 'admin', 3, false, true, NULL, 0),
('admin.approve_refund', 'admin', 3, false, true, NULL, 0),
('admin.detect_anomaly', 'admin', 4, false, false, NULL, 0),
('admin.daily_brief', 'admin', 4, false, false, NULL, 0),
('payment.release_escrow', 'admin', 4, false, false, NULL, 0),
('service.diagnose', 'admin', 4, false, false, NULL, 0),
('service.quote', 'admin', 4, false, false, NULL, 0);

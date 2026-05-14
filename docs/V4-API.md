# 🚀 V4 API Reference — 4 Super-Agents

Base URL: `https://lipjakzhzosrhttsltwo.supabase.co/functions/v1/{agent}`

Auth: `Authorization: Bearer {supabase-access-token}`

---

## 1. 🧠 Orchestrator — `/v4-orchestrator`

Điều phối toàn bộ hệ thống. Nhận đầu vào → phân tích ý định → xử lý → trả kết quả.

### Chat
```bash
curl -X POST /v4-orchestrator \
  -d '{"hanhDong":"xu_ly_chat","noiDung":"Máy lạnh không mát","nguCanh":{}}'
```
→ `{yDinh, cacBuoc: [{ten, moTa, trangThai, ketQua}], ketQuaCuoi: {traLoi, canLayThemThongTin}}`

### Phân tích
```bash
curl -X POST /v4-orchestrator \
  -d '{"hanhDong":"phan_tich","noiDung":"JSON data..."}'
```
→ `{yDinh, cacBuoc, ketQuaCuoi: {phanTich, deXuat, doTinCay}}`

---

## 2. 🗺️ Navigator — `/v4-navigator`

Mọi thứ về bản đồ, vị trí, khoảng cách.

### Tìm thợ gần đây
```bash
curl -X POST /v4-navigator \
  -d '{"hanhDong":"tim_gan_day","viTri":{"viDo":10.77,"kinhDo":106.69},"banKinh":20}'
```
→ `{danhSach: [{id, ten, khoangCachKm, thoiGianPhut, diemDanhGia, kyNang}], tongSo}`

### Tính đường đi (OSRM)
```bash
curl -X POST /v4-navigator \
  -d '{"hanhDong":"tinh_duong_di","viTri":{"viDo":10.77,"kinhDo":106.69},"diemDen":[{"viDo":10.82,"kinhDo":106.71}]}'
```
→ `{tuyenDuong: [{khoangCachKm, thoiGianPhut, nguon}], tongKm}`

### Heatmap nhu cầu
```bash
curl "/v4-navigator?action=nhiet_do" \
  -d '{"hanhDong":"nhiet_do","viTri":{"viDo":10.77,"kinhDo":106.69},"danhMuc":"air_conditioning"}'
```
→ `{type:"FeatureCollection", features:[{geometry, properties:{nhietDo, soDon, doanhThu}}], metadata}`

---

## 3. 💰 Monetizer — `/v4-monetizer`

Định giá, upsell, thương lượng, phân tích doanh thu.

### Định giá
```bash
curl -X POST /v4-monetizer \
  -d '{"hanhDong":"dinh_gia","danhMuc":"air_conditioning","nguCanh":{"moTa":"Máy lạnh không mát"}}'
```
→ `{deXuat, gia, doTinCay, lyDo, coHoi: [{ten, giaTri}]}`

### Upsell
```bash
curl -X POST /v4-monetizer \
  -d '{"hanhDong":"upsell","danhMuc":"air_conditioning","giaTri":500000}'
```
→ `{deXuat, mucGiam, doTinCay, lyDo}`

### Thương lượng
```bash
curl -X POST /v4-monetizer \
  -d '{"hanhDong":"thuong_luong","danhMuc":"air_conditioning","khachDeXuat":300000,"thoDeXuat":500000}'
```
→ `{deXuat, gia, doTinCay, lyDo}`

---

## 4. 🤝 Humanizer — `/v4-humanizer`

Tương tác người dùng: chat, chẩn đoán, huấn luyện, hòa giải.

### Chat thông thường
```bash
curl -X POST /v4-humanizer \
  -d '{"hanhDong":"tra_loi","tinNhan":"Máy lạnh không mát","lichSu":[]}'
```
→ `{traLoi, hanhDong: [{loai, data}], doTinCay}`

### Chẩn đoán sự cố
```bash
curl -X POST /v4-humanizer \
  -d '{"hanhDong":"chan_doan","tinNhan":"Máy lạnh chảy nước","nguCanh":{}}'
```
→ `{traLoi, hanhDong: [{loai:"hien_thi_chan_doan", data}], doTinCay}`

### Huấn luyện thợ
```bash
curl -X POST /v4-humanizer \
  -d '{"hanhDong":"huan_luyen","tinNhan":"Làm sao tăng thu nhập?","lichSu":[]}'
```
→ `{traLoi, doTinCay}`

### Hòa giải tranh chấp
```bash
curl -X POST /v4-humanizer \
  -d '{"hanhDong":"hoa_giai","tinNhan":"Khách không chịu thanh toán","donId":"uuid"}'
```
→ `{traLoi, hanhDong: [{loai:"tu_dong_giai_quyet|chuyen_admin", data}], doTinCay}`

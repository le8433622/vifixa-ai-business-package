# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home.spec.ts >> has title and login button
- Location: tests/e2e/home.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /đăng nhập/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('link', { name: /đăng nhập/i })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]: V
          - generic [ref=e7]: Vifixa AI
        - generic [ref=e8]:
          - button "Đăng nhập" [ref=e9]
          - button "Bắt đầu miễn phí" [ref=e10] [cursor=pointer]
    - generic [ref=e12]:
      - generic [ref=e15]: AI-Powered • 1200+ Thợ Xác Minh
      - heading "Sửa chữa nhà thông minh với AI" [level=1] [ref=e16]:
        - text: Sửa chữa nhà
        - text: thông minh với AI
      - paragraph [ref=e17]:
        - text: Chẩn đoán AI tức thì. Báo giá minh bạch. Thợ chuyên nghiệp được xác minh.
        - text: Tất cả chỉ trong 60 giây.
      - generic [ref=e18]:
        - button "💬 Chat với AI ngay" [ref=e19]: 💬 Chat với AI ngay
        - button "Trở thành thợ →" [ref=e21]
      - generic [ref=e22]:
        - generic [ref=e23]: ✅ Miễn phí chẩn đoán
        - generic [ref=e24]: 🔒 Bảo hành 30 ngày
        - generic [ref=e25]: ⚡ Phản hồi dưới 5 phút
    - generic [ref=e27]:
      - generic [ref=e28]:
        - generic [ref=e29]: 1200+
        - paragraph [ref=e30]: Thợ xác minh
      - generic [ref=e31]:
        - generic [ref=e32]: 5800+
        - paragraph [ref=e33]: Đơn hoàn thành
      - generic [ref=e34]:
        - generic [ref=e35]: 4.8★
        - paragraph [ref=e36]: Đánh giá TB
      - generic [ref=e37]:
        - generic [ref=e38]: 60s
        - paragraph [ref=e39]: Đặt đơn trung bình
    - generic [ref=e41]:
      - heading "3 bước đơn giản" [level=2] [ref=e42]
      - paragraph [ref=e43]: Từ mô tả sự cố đến thợ đến nhà — tất cả chỉ vài phút
      - generic [ref=e44]:
        - generic [ref=e46]:
          - generic [ref=e47]: "01"
          - generic [ref=e48]: 💬
          - heading "Chat với AI" [level=3] [ref=e49]
          - paragraph [ref=e50]: Mô tả sự cố bằng văn bản, giọng nói hoặc ảnh. AI chẩn đoán ngay.
        - generic [ref=e52]:
          - generic [ref=e53]: "02"
          - generic [ref=e54]: 💰
          - heading "Báo giá minh bạch" [level=3] [ref=e55]
          - paragraph [ref=e56]: Nhận báo giá chi tiết từng hạng mục. Không phát sinh bất ngờ.
        - generic [ref=e58]:
          - generic [ref=e59]: "03"
          - generic [ref=e60]: 🔧
          - heading "Thợ đến sửa" [level=3] [ref=e61]
          - paragraph [ref=e62]: Thợ xác minh đến đúng giờ. Bảo hành 30 ngày sau sửa chữa.
    - generic [ref=e64]:
      - heading "Dịch vụ đa dạng" [level=2] [ref=e65]
      - paragraph [ref=e66]: Mọi vấn đề trong nhà — AI đều giải quyết được
      - generic [ref=e67]:
        - button "❄️ Điện lạnh Máy lạnh, tủ lạnh, máy nước nóng" [ref=e68]:
          - generic [ref=e69]: ❄️
          - heading "Điện lạnh" [level=3] [ref=e70]
          - paragraph [ref=e71]: Máy lạnh, tủ lạnh, máy nước nóng
        - button "⚡ Điện dân dụng Sửa điện, lắp đèn, ổ cắm" [ref=e72]:
          - generic [ref=e73]: ⚡
          - heading "Điện dân dụng" [level=3] [ref=e74]
          - paragraph [ref=e75]: Sửa điện, lắp đèn, ổ cắm
        - button "🚿 Nước & Ống Thông tắc, rò rỉ, lắp mới" [ref=e76]:
          - generic [ref=e77]: 🚿
          - heading "Nước & Ống" [level=3] [ref=e78]
          - paragraph [ref=e79]: Thông tắc, rò rỉ, lắp mới
        - button "📷 Camera & Khóa Lắp camera, sửa khóa thông minh" [ref=e80]:
          - generic [ref=e81]: 📷
          - heading "Camera & Khóa" [level=3] [ref=e82]
          - paragraph [ref=e83]: Lắp camera, sửa khóa thông minh
        - button "🔧 Đồ gia dụng Máy giặt, lò vi sóng, quạt" [ref=e84]:
          - generic [ref=e85]: 🔧
          - heading "Đồ gia dụng" [level=3] [ref=e86]
          - paragraph [ref=e87]: Máy giặt, lò vi sóng, quạt
        - button "🏠 Sơn & Trát Sơn nhà, trám vá, chống thấm" [ref=e88]:
          - generic [ref=e89]: 🏠
          - heading "Sơn & Trát" [level=3] [ref=e90]
          - paragraph [ref=e91]: Sơn nhà, trám vá, chống thấm
    - generic [ref=e93]:
      - heading "Khách hàng nói gì?" [level=2] [ref=e94]
      - paragraph [ref=e95]: Hàng nghìn người đã tin tưởng Vifixa AI
      - generic [ref=e96]:
        - generic [ref=e97]:
          - generic [ref=e98]:
            - generic [ref=e99]: ★
            - generic [ref=e100]: ★
            - generic [ref=e101]: ★
            - generic [ref=e102]: ★
            - generic [ref=e103]: ★
          - paragraph [ref=e104]: "\"AI chẩn đoán chính xác, thợ đến đúng giờ. Giá rẻ hơn ngoài 30%!\""
          - generic [ref=e105]:
            - generic [ref=e106]: 👩
            - generic [ref=e107]:
              - paragraph [ref=e108]: Nguyễn Minh Hòa
              - paragraph [ref=e109]: Khách hàng
        - generic [ref=e110]:
          - generic [ref=e111]:
            - generic [ref=e112]: ★
            - generic [ref=e113]: ★
            - generic [ref=e114]: ★
            - generic [ref=e115]: ★
            - generic [ref=e116]: ★
          - paragraph [ref=e117]: "\"Thu nhập tăng 40% kể từ khi tham gia Vifixa. Ứng dụng dễ sử dụng.\""
          - generic [ref=e118]:
            - generic [ref=e119]: 👨‍🔧
            - generic [ref=e120]:
              - paragraph [ref=e121]: Trần Văn Dũng
              - paragraph [ref=e122]: Thợ điện lạnh
        - generic [ref=e123]:
          - generic [ref=e124]:
            - generic [ref=e125]: ★
            - generic [ref=e126]: ★
            - generic [ref=e127]: ★
            - generic [ref=e128]: ★
            - generic [ref=e129]: ★
          - paragraph [ref=e130]: "\"Tuyệt vời! Chat với AI như nói chuyện với chuyên gia thật vậy.\""
          - generic [ref=e131]:
            - generic [ref=e132]: 👩‍💼
            - generic [ref=e133]:
              - paragraph [ref=e134]: Lê Thị Mai
              - paragraph [ref=e135]: Khách hàng
    - generic [ref=e137]:
      - heading "Sẵn sàng trải nghiệm?" [level=2] [ref=e138]
      - paragraph [ref=e139]: Đăng ký miễn phí. Không cần thẻ tín dụng. AI sẵn sàng hỗ trợ bạn 24/7.
      - generic [ref=e140]:
        - button "Đăng ký miễn phí →" [ref=e141]
        - button "Đã có tài khoản" [ref=e142]
    - contentinfo [ref=e143]:
      - generic [ref=e144]:
        - generic [ref=e145]:
          - generic [ref=e146]:
            - generic [ref=e147]:
              - generic [ref=e148]: V
              - generic [ref=e149]: Vifixa AI
            - paragraph [ref=e150]: "Nền tảng sửa chữa nhà thông minh #1 Việt Nam"
          - generic [ref=e151]:
            - heading "Dịch vụ" [level=4] [ref=e152]
            - list [ref=e153]:
              - listitem [ref=e154]: Điện lạnh
              - listitem [ref=e155]: Điện nước
              - listitem [ref=e156]: Camera
              - listitem [ref=e157]: Sơn sửa
          - generic [ref=e158]:
            - heading "Hỗ trợ" [level=4] [ref=e159]
            - list [ref=e160]:
              - listitem [ref=e161]: Trung tâm trợ giúp
              - listitem [ref=e162]: Liên hệ
              - listitem [ref=e163]: Bảo hành
              - listitem [ref=e164]: Khiếu nại
          - generic [ref=e165]:
            - heading "Pháp lý" [level=4] [ref=e166]
            - list [ref=e167]:
              - listitem [ref=e168]: Điều khoản
              - listitem [ref=e169]: Chính sách bảo mật
              - listitem [ref=e170]: Cookie
        - generic [ref=e171]: © 2026 Vifixa AI. Tất cả quyền được bảo lưu.
  - button "Open Next.js Dev Tools" [ref=e177] [cursor=pointer]:
    - img [ref=e178]
  - alert [ref=e181]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('has title and login button', async ({ page }) => {
  4  |   await page.goto('/');
  5  | 
  6  |   // Expect a title "to contain" a substring.
  7  |   await expect(page).toHaveTitle(/Vifixa AI/);
  8  | 
  9  |   // Check for login button
  10 |   const loginBtn = page.getByRole('link', { name: /đăng nhập/i });
> 11 |   await expect(loginBtn).toBeVisible();
     |                          ^ Error: expect(locator).toBeVisible() failed
  12 | });
  13 | 
  14 | test('navigation to register page', async ({ page }) => {
  15 |   await page.goto('/');
  16 |   await page.getByRole('link', { name: /đăng ký/i }).first().click();
  17 |   await expect(page).toHaveURL(/.*register/);
  18 | });
  19 | 
```
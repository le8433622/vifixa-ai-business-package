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
        - heading "Vifixa AI" [level=1] [ref=e5]
        - generic [ref=e6]:
          - button "Đăng nhập" [ref=e7]
          - button "Đăng ký" [ref=e8]
    - generic [ref=e10]:
      - generic [ref=e11]:
        - heading "Dịch vụ sửa chữa thông minh AI" [level=2] [ref=e12]:
          - text: Dịch vụ sửa chữa
          - text: thông minh AI
        - paragraph [ref=e13]: Chẩn đoán AI tức thì, báo giá minh bạch, thợ chuyên nghiệp được xác minh. Tất cả chỉ trong vài phút.
        - generic [ref=e14]:
          - button "Bắt đầu ngay" [ref=e15]
          - button "Đăng nhập" [ref=e16]
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]: 📱
          - generic [ref=e21]:
            - heading "Tải ứng dụng Vifixa AI" [level=3] [ref=e22]
            - paragraph [ref=e23]: Quét mã QR để tải về
        - img [ref=e25]
        - generic [ref=e28]:
          - link "iOS App" [ref=e29] [cursor=pointer]:
            - /url: https://expo.dev
          - link "Android App" [ref=e30] [cursor=pointer]:
            - /url: https://expo.dev
        - paragraph [ref=e31]: "Hoặc truy cập: web-eta-ochre-99.vercel.app"
    - generic [ref=e33]:
      - heading "Cách hoạt động" [level=3] [ref=e34]
      - paragraph [ref=e35]: 3 bước đơn giản để sửa chữa mọi thứ trong nhà bạn
      - generic [ref=e36]:
        - generic [ref=e37]:
          - generic [ref=e39]: "1"
          - heading "Mô tả vấn đề" [level=4] [ref=e40]
          - paragraph [ref=e41]: Kể chúng tôi biết điều gì đang xảy ra hoặc tải ảnh lên để AI chẩn đoán.
        - generic [ref=e42]:
          - generic [ref=e44]: "2"
          - heading "Chẩn đoán AI" [level=4] [ref=e45]
          - paragraph [ref=e46]: AI phân tích vấn đề và đưa ra chẩn đoán cùng báo giá ngay lập tức.
        - generic [ref=e47]:
          - generic [ref=e49]: "3"
          - heading "Đặt thợ chuyên nghiệp" [level=4] [ref=e50]
          - paragraph [ref=e51]: Ghép với thợ đã được xác minh và theo dõi tiến độ theo thời gian thực.
      - generic [ref=e52]:
        - heading "Dịch vụ phổ biến" [level=4] [ref=e53]
        - generic [ref=e54]:
          - generic [ref=e55] [cursor=pointer]:
            - generic [ref=e56]: ❄️
            - paragraph [ref=e57]: Điện lạnh
            - paragraph [ref=e58]: Máy lạnh, tủ lạnh
          - generic [ref=e59] [cursor=pointer]:
            - generic [ref=e60]: 🚿
            - paragraph [ref=e61]: Điện nước
            - paragraph [ref=e62]: Ống nước, điện
          - generic [ref=e63] [cursor=pointer]:
            - generic [ref=e64]: 🔌
            - paragraph [ref=e65]: Điện gia dụng
            - paragraph [ref=e66]: Máy giặt, lò vi sóng
          - generic [ref=e67] [cursor=pointer]:
            - generic [ref=e68]: 📷
            - paragraph [ref=e69]: Camera & Khóa
            - paragraph [ref=e70]: Lắp đặt, sửa chữa
    - generic [ref=e73]:
      - generic [ref=e74]:
        - paragraph [ref=e75]: AI
        - paragraph [ref=e76]: Chẩn đoán thông minh
      - generic [ref=e77]:
        - paragraph [ref=e78]: 100%
        - paragraph [ref=e79]: Minh bạch giá
      - generic [ref=e80]:
        - paragraph [ref=e81]: 30 ngày
        - paragraph [ref=e82]: Bảo hành sau sửa chữa
    - contentinfo [ref=e83]:
      - paragraph [ref=e85]: © 2026 Vifixa AI. Tất cả quyền được bảo lưu.
  - button "Open Next.js Dev Tools" [ref=e91] [cursor=pointer]:
    - img [ref=e92]
  - alert [ref=e95]
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
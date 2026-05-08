# Quick Start - OpenCode MCP + Skills cho Vifixa AI

## ✅ Đã hoàn tất

1. **MCP Configuration** (`.opencode/mcp.json`):
   - ✅ filesystem server - Truy cập file dự án
   - ✅ git server - Quản lý git
   - ✅ supabase server - Tương tác Supabase

2. **10 Skills** (`.opencode/skills/`):
   - ✅ project-init.md (Step 1)
   - ✅ supabase-backend.md (Step 2)
   - ✅ web-api.md (Step 3)
   - ✅ ai-integration.md (Step 4)
   - ✅ mobile-foundation.md (Step 5)
   - ✅ mobile-web-flows.md (Step 6)
   - ✅ trust-quality.md (Step 7)
   - ✅ testing-validation.md (Step 8)
   - ✅ deployment.md (Step 9)
   - ✅ final-verification.md (Step 10)
   - ✅ INDEX.md (Danh sách tổng hợp)

## 🚀 Cách sử dụng

### Bước 1: Cài đặt MCP Servers

```bash
# Cài đặt globally
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-git
npm install -g @supabase/mcp-server-supabase
```

### Bước 2: Cấu hình Supabase

```bash
# Login Supabase
supabase login

# Lấy access token (nếu cần)
supabase projects list

# Set environment variable
export SUPABASE_ACCESS_TOKEN="your-access-token-here"
```

### Bước 3: Khởi động OpenCode

```bash
cd /Users/lha/Documents/vifixa-ai-business-package
opencode
```

MCP servers sẽ tự động kết nối theo cấu hình trong `.opencode/mcp.json`.

### Bước 4: Sử dụng Skills

Trong opencode, gõ:
```
/skill project-init
```
hoặc gõ từ khóa như "step 1", "initialize project" để load skill tương ứng.

## 📋 Thực hiện 10 bước

Làm theo thứ tự nghiêm ngặt (1 → 2 → ... → 10):

1. **Step 1**: `/skill project-init` - Khởi tạo dự án
2. **Step 2**: `/skill supabase-backend` - Backend Supabase
3. **Step 3**: `/skill web-api` - Web APIs
4. **Step 4**: `/skill ai-integration` - AI Agents
5. **Step 5**: `/skill mobile-foundation` - Mobile Foundation
6. **Step 6**: `/skill mobile-web-flows` - Mobile & Web Flows
7. **Step 7**: `/skill trust-quality` - Trust & Quality
8. **Step 8**: `/skill testing-validation` - Testing
9. **Step 9**: `/skill deployment` - Deployment
10. **Step 10**: `/skill final-verification` - Hoàn tất

## 🔍 Kiểm tra trạng thái

```bash
# Xem cấu trúc đã tạo
ls -la .opencode/
ls -la .opencode/skills/

# Kiểm tra MCP config
cat .opencode/mcp.json

# Đọc hướng dẫn chi tiết
cat .opencode/README.md
cat .opencode/skills/INDEX.md
```

## ⚠️ Lưu ý quan trọng

- Phải hoàn thành 100% một step trước khi chuyển sang step tiếp theo
- Tất cả requirements nằm trong các file .md (01-22)
- Không được bỏ qua bước nào hoặc thay đổi thứ tự
- AI calls chỉ qua Supabase Edge Functions
- Không để secrets trong mobile/web frontend

## 📞 Hỗ trợ

- Xem `agent.md` để biết chi tiết từng bước
- Xem `15_CODEX_BUSINESS_CONTEXT.md` để biết tech stack
- Xem `.opencode/skills/INDEX.md` để biết danh sách skills

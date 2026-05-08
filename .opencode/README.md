# OpenCode MCP Integration

## Cấu hình MCP cho Vifixa AI Project

MCP (Model Context Protocol) đã được cấu hình để hỗ trợ opencode làm việc với dự án này.

## MCP Servers đã cấu hình

1. **filesystem** - Truy cập đọc/ghi file trong dự án
2. **git** - Thao tác với git repository
3. **supabase** - Tương tác với Supabase (database, auth, storage, edge functions)

## Cách sử dụng

### 1. Cài đặt MCP servers

```bash
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-git
npm install -g @supabase/mcp-server-supabase
```

### 2. Thiết lập Supabase Access Token

Để sử dụng Supabase MCP server, bạn cần:

1. Đăng nhập Supabase: `supabase login`
2. Lấy access token: `supabase projects list` (hoặc tạo token tại https://supabase.com/dashboard/account/tokens)
3. Set environment variable:
   ```bash
   export SUPABASE_ACCESS_TOKEN="your-access-token-here"
   ```

### 3. Khởi động opencode

MCP servers sẽ tự động được kích hoạt khi bạn chạy opencode trong thư mục dự án này.

## Lợi ích cho dự án Vifixa AI

Với MCP, opencode có thể:
- Đọc/ghi code trực tiếp qua filesystem server
- Quản lý git commits qua git server
- Truy vấn database, tạo migrations, deploy edge functions qua supabase server
- Tự động hóa việc implement 10 bước trong agent.md

## Project Info
- Project ID: vifixa-ai-business-package
- Supabase URL: https://lipjakzhzosrhttsltwo.supabase.co

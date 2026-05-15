// CORS headers for Supabase Edge Functions
// Per 22_SECURITY_PLAN.md - CORS configuration
// ⚠️ BẮT BUỘC dùng cho mọi Edge Function response

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

/**
 * handleOptions - Xử lý OPTIONS preflight request
 * 
 * ⚠️ BẮT BUỘC gọi ở đầu mọi Edge Function để handle CORS preflight
 * 
 * @example
 * export default async function handler(req: Request) {
 *   if (req.method === 'OPTIONS') return handleOptions()
 *   // ... rest of code
 * }
 */
export function handleOptions(): Response {
  return new Response('ok', { headers: corsHeaders });
}

/**
 * jsonResponse - Tạo JSON response với CORS headers
 * 
 * ⚠️ BẮT BUỘC dùng thay vì new Response(JSON.stringify(...))
 * 
 * @example
 * return jsonResponse({ success: true, data: result })
 * return jsonResponse({ error: 'Invalid input' }, 400)
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders 
    },
  });
}

/**
 * logVifixa - Utility logging chuẩn hóa
 * 
 * ⚠️ BẮT BUỘC dùng thay vì console.log trực tiếp
 * 
 * @example
 * logVifixa('companion-chat', 'chat_request', { user_id: user.id, mode: state.mode })
 * // Output: [VIFIXA][companion-chat] chat_request | user_id="xxx" | mode="auto"
 */
export function logVifixa(module: string, action: string, data: Record<string, unknown>): void {
  const parts = [`[VIFIXA][${module}]`, action];
  const meta = Object.entries(data)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(' | ');
  console.log(parts.join(' ') + ' | ' + meta);
}

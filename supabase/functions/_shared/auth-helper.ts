import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

/**
 * verifyAuth - Xác thực user từ Authorization header
 * 
 * ⚠️ BẮT BUỘC dùng ở DÒNG ĐẦU TIÊN của mọi Edge Function
 * 
 * @example
 * const user = await verifyAuth(req)
 * if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)
 */
export async function verifyAuth(req: Request): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[VIFIXA][auth] missing_header | path=' + new URL(req.url).pathname);
      return null;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log('[VIFIXA][auth] invalid_token | error=' + (authError?.message || 'unknown'));
      return null;
    }

    return { id: user.id, email: user.email };
  } catch (error) {
    console.log('[VIFIXA][auth] exception | error=' + (error as Error).message);
    return null;
  }
}

/**
 * checkRole - Kiểm tra role của user
 * 
 * ⚠️ BẮT BUỘC dùng sau verifyAuth cho các endpoint yêu cầu role cụ thể
 * 
 * @example
 * const hasRole = await checkRole(user.id, 'worker')
 * if (!hasRole) return jsonResponse({ error: 'Forbidden' }, 403)
 */
export async function checkRole(userId: string, requiredRole: string): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.log('[VIFIXA][role] profile_not_found | user=' + userId);
      return false;
    }

    const hasRole = profile.role === requiredRole;
    console.log('[VIFIXA][role] check | user=' + userId + ' | role=' + profile.role + ' | required=' + requiredRole + ' | allowed=' + hasRole);
    return hasRole;
  } catch (error) {
    console.log('[VIFIXA][role] exception | user=' + userId + ' | error=' + (error as Error).message);
    return false;
  }
}

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

export function corsHeaders(methods = 'POST, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  return null;
}

// ---- Rate Limiter ----
const WINDOW_MS = 60_000;
const MAX_REQUESTS_DEFAULT = 20;

const buckets = new Map<string, number[]>();

function cleanup() {
  const now = Date.now();
  for (const [key, timestamps] of buckets) {
    const valid = timestamps.filter(t => now - t < WINDOW_MS);
    if (valid.length === 0) buckets.delete(key);
    else buckets.set(key, valid);
  }
}

export interface RateLimitConfig {
  maxRequests?: number;
  windowMs?: number;
}

export function checkRateLimit(userId: string, ip: string, config?: RateLimitConfig): void {
  const maxRequests = config?.maxRequests ?? MAX_REQUESTS_DEFAULT;
  const windowMs = config?.windowMs ?? WINDOW_MS;
  const now = Date.now();
  const key = `${userId}:${ip}`;

  if (Math.random() < 0.1) cleanup();

  const timestamps = buckets.get(key) || [];
  const valid = timestamps.filter(t => now - t < windowMs);
  valid.push(now);
  buckets.set(key, valid);

  if (valid.length > maxRequests) {
    const retryAfter = Math.ceil((valid[0] + windowMs - now) / 1000);
    throw new RateLimitError(retryAfter);
  }
}

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`);
    this.retryAfter = retryAfter;
    this.name = 'RateLimitError';
  }
}

const PII_PATTERNS = [
  /0\d{9,10}/g,                    // SĐT Việt Nam
  /\b\d{10,15}\b/g,                 // SĐT quốc tế
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,     // Email
  /\b\d{9,12}\b/g,                  // CMND/CCCD
];

export function redactPII(data: unknown): unknown {
  if (typeof data === 'string') {
    let s = data;
    for (const pattern of PII_PATTERNS) {
      s = s.replace(pattern, (match) => match.length > 6 ? match.slice(0, 3) + '***' : match);
    }
    return s;
  }
  if (data && typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(item => redactPII(item));
    }
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const sensitiveKeys = ['phone', 'email', 'sdt', 'dien_thoai', 'cmnd', 'cccd', 'address', 'dia_chi'];
      if (sensitiveKeys.includes(key)) {
        redacted[key] = typeof value === 'string' ? value.slice(0, 3) + '***' : value;
      } else {
        redacted[key] = redactPII(value);
      }
    }
    return redacted;
  }
  return data;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthUser {
  id: string;
  email?: string;
}

const CRON_SECRET = () => Deno.env.get('CRON_SECRET') || ''

export async function verifyAuth(req: Request, rateLimitConfig?: RateLimitConfig): Promise<AuthUser> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header', 'UNAUTHORIZED');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new AuthError(authError?.message || 'Invalid or expired token', 'UNAUTHORIZED_INVALID_TOKEN');
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  await checkRateLimit(user.id, ip, rateLimitConfig);

  return { id: user.id, email: user.email };
}

export async function verifyInternalOrUser(req: Request, rateLimitConfig?: RateLimitConfig): Promise<AuthUser | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') || ''
  if (!token) throw new AuthError('Missing authorization', 'UNAUTHORIZED')

  // Internal call via CRON_SECRET
  if (token === CRON_SECRET()) {
    return { id: 'system', email: undefined }
  }

  // User JWT
  return verifyAuth(req, rateLimitConfig)
}

export function getInternalHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CRON_SECRET()}`,
  }
}

export function isInternalCall(req: Request): boolean {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') || ''
  return token === CRON_SECRET()
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

export function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...extraHeaders },
  });
}

// Add Cache-Control to GET responses for cacheable data
export function cachedJsonResponse(data: unknown, maxAgeSeconds = 60, status = 200) {
  return jsonResponse(data, status, {
    'Cache-Control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds * 2}`,
  })
}

export function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  return null;
}

// ---- Rate Limiter (DB-backed) ----
const WINDOW_MS = 60_000;
const MAX_REQUESTS_DEFAULT = 20;

// In-memory fallback when DB is unavailable
const buckets = new Map<string, number[]>();

function cleanupMemory() {
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

export async function checkRateLimit(userId: string, ip: string, config?: RateLimitConfig): Promise<void> {
  const maxRequests = config?.maxRequests ?? MAX_REQUESTS_DEFAULT;
  const windowMs = config?.windowMs ?? WINDOW_MS;
  const now = Date.now();
  const key = `${userId}:${ip}`;

  try {
    // DB-backed rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: existing } = await supabase
        .from('rate_limits')
        .select('count, window_start')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        const elapsed = now - new Date(existing.window_start).getTime();
        if (elapsed > windowMs) {
          // Window expired, reset
          await supabase.from('rate_limits').upsert({ key, count: 1, window_start: new Date(now).toISOString() });
        } else if (existing.count >= maxRequests) {
          const retryAfter = Math.ceil((windowMs - elapsed) / 1000);
          throw new RateLimitError(retryAfter);
        } else {
          await supabase.from('rate_limits').update({ count: existing.count + 1 }).eq('key', key);
        }
      } else {
        await supabase.from('rate_limits').insert({ key, count: 1, window_start: new Date(now).toISOString() });
      }
      return;
    }
  } catch {
    // DB unavailable, fall back to in-memory
  }

  // In-memory fallback
  if (Math.random() < 0.1) cleanupMemory();
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

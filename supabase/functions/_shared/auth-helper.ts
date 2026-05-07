import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthUser {
  id: string;
  email?: string;
}

export async function verifyAuth(req: Request): Promise<AuthUser> {
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

  return { id: user.id, email: user.email };
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

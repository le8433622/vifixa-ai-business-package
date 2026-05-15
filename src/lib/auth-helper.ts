import { NextRequest } from 'next/server';
import { logVifixa } from './logger';

/**
 * [VIFIXA] Auth Helper cho API Routes
 * Tuân thủ SEC-002: Xác thực người dùng trong mọi API endpoint
 * Tuân thủ LOG-001: Logging với prefix [VIFIXA]
 */

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  token: string;
}

/**
 * Xác thực người dùng từ request
 * @param request - NextRequest object
 * @returns AuthResult nếu thành công, null nếu thất bại
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult | null> {
  const requestId = crypto.randomUUID();
  
  try {
    // Lấy Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logVifixa('warn', 'auth_helper', 'verify_auth_failed', { 
        requestId, 
        reason: 'Missing or invalid Authorization header' 
      });
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Trong thực tế, xác minh token với Supabase hoặc JWT provider
    // Đây là mock implementation cho mục đích demo
    const mockUser = {
      id: 'user_' + crypto.randomUUID(),
      email: 'user@example.com',
      role: 'admin',
    };

    logVifixa('info', 'auth_helper', 'verify_auth_success', { 
      requestId, 
      userId: mockUser.id 
    });

    return {
      user: mockUser,
      token,
    };
  } catch (error) {
    logVifixa('error', 'auth_helper', 'verify_auth_error', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return null;
  }
}

/**
 * Kiểm tra role của người dùng
 * @param authResult - Kết quả từ verifyAuth
 * @param allowedRoles - Danh sách roles được phép
 * @returns true nếu user có role phù hợp, false ngược lại
 */
export function checkRole(authResult: AuthResult | null, allowedRoles: string[]): boolean {
  if (!authResult) {
    return false;
  }

  const userRole = authResult.user.role;
  
  if (!userRole) {
    logVifixa('warn', 'auth_helper', 'check_role_failed', { 
      reason: 'User has no role' 
    });
    return false;
  }

  const hasRole = allowedRoles.includes(userRole);
  
  logVifixa('info', 'auth_helper', 'check_role_result', { 
    userId: authResult.user.id,
    userRole,
    allowedRoles,
    hasRole 
  });

  return hasRole;
}

/**
 * Tạo JSON response với headers chuẩn
 * @param data - Dữ liệu trả về
 * @param options - Tùy chọn response (status, headers)
 * @returns Response object
 */
export function jsonResponse(
  data: unknown,
  options: { status?: number; headers?: Record<string, string> } = {}
): Response {
  const { status = 200, headers = {} } = options;

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Handle CORS preflight request
 * @returns Response object với CORS headers
 */
export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

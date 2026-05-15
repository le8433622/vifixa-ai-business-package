import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logVifixa } from '@/utils/logger';
import { verifyAuth, checkRole, jsonResponse, handleOptions } from '@/lib/auth-helper';

/**
 * [VIFIXA] Customers API - GET endpoint
 * Tuân thủ SEC-002: Xác thực người dùng với verifyAuth
 * Tuân thủ QUAL-002: Zod validation cho query params
 * Tuân thủ LOG-001: Logging với prefix [VIFIXA]
 */

// Schema validation cho query params
const GetCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  query: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logVifixa('info', 'api_customers', 'get_started', { requestId, path: request.url });

  try {
    // STEP 1: Xác thực người dùng (bắt buộc)
    const authResult = await verifyAuth(request);
    if (!authResult) {
      logVifixa('warn', 'api_customers', 'get_unauthorized', { requestId });
      return jsonResponse(
        { error: 'Unauthorized', message: 'Yêu cầu xác thực' },
        { status: 401 }
      );
    }

    // STEP 2: Kiểm tra role (optional - tùy nghiệp vụ)
    // Chỉ admin hoặc staff mới được xem danh sách khách hàng
    const roleCheck = checkRole(authResult, ['admin', 'staff']);
    if (!roleCheck) {
      logVifixa('warn', 'api_customers', 'get_forbidden', { 
        requestId, 
        userId: authResult.user.id 
      });
      return jsonResponse(
        { error: 'Forbidden', message: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    // STEP 3: Parse và validate query params
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      query: searchParams.get('query') || undefined,
      status: searchParams.get('status') || undefined,
    };

    const validatedQuery = GetCustomersQuerySchema.parse(queryData);
    logVifixa('info', 'api_customers', 'get_validated', { 
      requestId, 
      query: validatedQuery 
    });

    // STEP 4: Gọi service để lấy dữ liệu (giả lập)
    // Trong thực tế, bạn sẽ gọi database hoặc Supabase ở đây
    const mockCustomers = Array.from({ length: validatedQuery.limit }, (_, i) => ({
      id: crypto.randomUUID(),
      full_name: `Khách hàng ${i + 1}`,
      email: `customer${i + 1}@example.com`,
      phone: `090${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      status: (['active', 'inactive', 'pending'] as const)[Math.floor(Math.random() * 3)],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      vehicle_info: Math.random() > 0.3 ? {
        license_plate: `${Math.floor(Math.random() * 100)}A-${Math.floor(Math.random() * 10000)}`,
        brand: ['Toyota', 'Honda', 'Ford', 'Mazda'][Math.floor(Math.random() * 4)],
        model: ['Vios', 'City', 'F150', 'CX5'][Math.floor(Math.random() * 4)],
        year: 2020 + Math.floor(Math.random() * 4)
      } : undefined,
    }));

    const total = 100; // Giả lập tổng số bản ghi
    const totalPages = Math.ceil(total / validatedQuery.limit);

    logVifixa('info', 'api_customers', 'get_success', { 
      requestId, 
      count: mockCustomers.length,
      page: validatedQuery.page,
      totalPages 
    });

    // STEP 5: Trả về response với format chuẩn
    return jsonResponse({
      data: mockCustomers,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total,
        total_pages: totalPages,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logVifixa('warn', 'api_customers', 'get_validation_error', { 
        requestId, 
        errors: error.errors 
      });
      return jsonResponse(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    logVifixa('error', 'api_customers', 'get_failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return jsonResponse(
      { error: 'Internal Server Error', message: 'Có lỗi xảy ra khi xử lý yêu cầu' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

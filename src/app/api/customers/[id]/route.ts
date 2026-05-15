import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logVifixa } from '@/utils/logger';
import { verifyAuth, checkRole, jsonResponse, handleOptions } from '@/lib/auth-helper';

/**
 * [VIFIXA] Customer Detail API - GET/PUT/DELETE endpoints
 * Tuân thủ SEC-002: Xác thực người dùng với verifyAuth
 * Tuân thủ QUAL-002: Zod validation cho input
 * Tuân thủ LOG-001: Logging với prefix [VIFIXA]
 */

// Schema validation cho params
const CustomerParamsSchema = z.object({
  id: z.string().uuid(),
});

// Schema validation cho update body
const UpdateCustomerBodySchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  vehicle_info: z.object({
    license_plate: z.string(),
    brand: z.string(),
    model: z.string(),
    year: z.number().int().positive()
  }).optional(),
});

// GET: Lấy thông tin chi tiết khách hàng
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const customerId = params.id;
  
  logVifixa('info', 'api_customer_detail', 'get_started', { requestId, customerId });

  try {
    // STEP 1: Validate params
    const validatedParams = CustomerParamsSchema.parse({ id: customerId });
    
    // STEP 2: Xác thực người dùng
    const authResult = await verifyAuth(request);
    if (!authResult) {
      logVifixa('warn', 'api_customer_detail', 'get_unauthorized', { requestId, customerId });
      return jsonResponse(
        { error: 'Unauthorized', message: 'Yêu cầu xác thực' },
        { status: 401 }
      );
    }

    // STEP 3: Kiểm tra role
    const roleCheck = checkRole(authResult, ['admin', 'staff']);
    if (!roleCheck) {
      logVifixa('warn', 'api_customer_detail', 'get_forbidden', { 
        requestId, 
        customerId,
        userId: authResult.user.id 
      });
      return jsonResponse(
        { error: 'Forbidden', message: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    // STEP 4: Giả lập lấy dữ liệu customer từ DB
    // Trong thực tế, gọi database ở đây
    const mockCustomer = {
      id: validatedParams.id,
      full_name: 'Nguyễn Văn A',
      email: 'nguyenvana@example.com',
      phone: '0901234567',
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      vehicle_info: {
        license_plate: '59A-12345',
        brand: 'Toyota',
        model: 'Vios',
        year: 2022
      }
    };

    logVifixa('info', 'api_customer_detail', 'get_success', { 
      requestId, 
      customerId: mockCustomer.id 
    });

    return jsonResponse(mockCustomer);

  } catch (error) {
    if (error instanceof z.ZodError) {
      logVifixa('warn', 'api_customer_detail', 'get_validation_error', { 
        requestId, 
        customerId,
        errors: error.errors 
      });
      return jsonResponse(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    logVifixa('error', 'api_customer_detail', 'get_failed', { 
      requestId, 
      customerId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return jsonResponse(
      { error: 'Internal Server Error', message: 'Có lỗi xảy ra khi xử lý yêu cầu' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật thông tin khách hàng
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const customerId = params.id;
  
  logVifixa('info', 'api_customer_detail', 'put_started', { requestId, customerId });

  try {
    // STEP 1: Validate params
    const validatedParams = CustomerParamsSchema.parse({ id: customerId });
    
    // STEP 2: Xác thực người dùng
    const authResult = await verifyAuth(request);
    if (!authResult) {
      logVifixa('warn', 'api_customer_detail', 'put_unauthorized', { requestId, customerId });
      return jsonResponse(
        { error: 'Unauthorized', message: 'Yêu cầu xác thực' },
        { status: 401 }
      );
    }

    // STEP 3: Kiểm tra role (chỉ admin mới được sửa)
    const roleCheck = checkRole(authResult, ['admin']);
    if (!roleCheck) {
      logVifixa('warn', 'api_customer_detail', 'put_forbidden', { 
        requestId, 
        customerId,
        userId: authResult.user.id 
      });
      return jsonResponse(
        { error: 'Forbidden', message: 'Bạn không có quyền chỉnh sửa' },
        { status: 403 }
      );
    }

    // STEP 4: Parse và validate body
    const body = await request.json();
    const validatedBody = UpdateCustomerBodySchema.parse(body);
    
    logVifixa('info', 'api_customer_detail', 'put_validated', { 
      requestId, 
      customerId,
      data: validatedBody 
    });

    // STEP 5: Giả lập cập nhật trong DB
    // Trong thực tế, gọi database update ở đây
    const updatedCustomer = {
      id: validatedParams.id,
      full_name: body.full_name || 'Nguyễn Văn A',
      email: body.email || 'nguyenvana@example.com',
      phone: body.phone || '0901234567',
      status: body.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      vehicle_info: body.vehicle_info || {
        license_plate: '59A-12345',
        brand: 'Toyota',
        model: 'Vios',
        year: 2022
      }
    };

    logVifixa('info', 'api_customer_detail', 'put_success', { 
      requestId, 
      customerId: updatedCustomer.id 
    });

    return jsonResponse(updatedCustomer);

  } catch (error) {
    if (error instanceof z.ZodError) {
      logVifixa('warn', 'api_customer_detail', 'put_validation_error', { 
        requestId, 
        customerId,
        errors: error.errors 
      });
      return jsonResponse(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    logVifixa('error', 'api_customer_detail', 'put_failed', { 
      requestId, 
      customerId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return jsonResponse(
      { error: 'Internal Server Error', message: 'Có lỗi xảy ra khi xử lý yêu cầu' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa khách hàng
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const customerId = params.id;
  
  logVifixa('info', 'api_customer_detail', 'delete_started', { requestId, customerId });

  try {
    // STEP 1: Validate params
    const validatedParams = CustomerParamsSchema.parse({ id: customerId });
    
    // STEP 2: Xác thực người dùng
    const authResult = await verifyAuth(request);
    if (!authResult) {
      logVifixa('warn', 'api_customer_detail', 'delete_unauthorized', { requestId, customerId });
      return jsonResponse(
        { error: 'Unauthorized', message: 'Yêu cầu xác thực' },
        { status: 401 }
      );
    }

    // STEP 3: Kiểm tra role (chỉ admin mới được xóa)
    const roleCheck = checkRole(authResult, ['admin']);
    if (!roleCheck) {
      logVifixa('warn', 'api_customer_detail', 'delete_forbidden', { 
        requestId, 
        customerId,
        userId: authResult.user.id 
      });
      return jsonResponse(
        { error: 'Forbidden', message: 'Bạn không có quyền xóa' },
        { status: 403 }
      );
    }

    // STEP 4: Giả lập xóa trong DB
    // Trong thực tế, gọi database delete ở đây
    logVifixa('info', 'api_customer_detail', 'delete_success', { 
      requestId, 
      customerId: validatedParams.id 
    });

    return jsonResponse(
      { message: 'Đã xóa khách hàng thành công', id: validatedParams.id },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      logVifixa('warn', 'api_customer_detail', 'delete_validation_error', { 
        requestId, 
        customerId,
        errors: error.errors 
      });
      return jsonResponse(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    logVifixa('error', 'api_customer_detail', 'delete_failed', { 
      requestId, 
      customerId,
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

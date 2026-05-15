import { z } from 'zod';

/**
 * [VIFIXA] Customer Data Models
 * Tuân thủ QUAL-001: Không dùng type 'any'
 * Tuân thủ QUAL-002: Zod validation cho mọi input/output
 */

// Schema xác thực dữ liệu khách hàng từ API
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(2, "Tên khách hàng phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  vehicle_info: z.object({
    license_plate: z.string(),
    brand: z.string(),
    model: z.string(),
    year: z.number().int().positive()
  }).optional()
});

export type Customer = z.infer<typeof CustomerSchema>;

// Schema cho danh sách khách hàng (phân trang)
export const CustomerListSchema = z.object({
  data: z.array(CustomerSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative()
  })
});

export type CustomerList = z.infer<typeof CustomerListSchema>;

// Schema cho yêu cầu tìm kiếm/lọc
export const CustomerFilterSchema = z.object({
  query: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10)
});

export type CustomerFilter = z.infer<typeof CustomerFilterSchema>;

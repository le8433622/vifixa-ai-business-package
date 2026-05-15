import { logVifixa } from '../utils/logger';
import { Customer, CustomerList, CustomerFilter } from '../types/customer';
import { CustomerSchema, CustomerListSchema, CustomerFilterSchema } from '../types/customer';

/**
 * [VIFIXA] Customer Service
 * Tuân thủ ARCH-002: Tích hợp service registry
 * Tuân thủ SEC-003: Gọi API qua backend (không gọi trực tiếp Supabase từ frontend)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export class CustomerService {
  /**
   * Lấy danh sách khách hàng với phân trang và lọc
   */
  async getCustomers(filter: CustomerFilter): Promise<CustomerList> {
    logVifixa('info', 'customer_service', 'get_customers_started', { filter });

    try {
      // Validate input bằng Zod
      const validatedFilter = CustomerFilterSchema.parse(filter);

      const params = new URLSearchParams({
        page: validatedFilter.page.toString(),
        limit: validatedFilter.limit.toString(),
      });

      if (validatedFilter.query) {
        params.append('query', validatedFilter.query);
      }
      if (validatedFilter.status) {
        params.append('status', validatedFilter.status);
      }

      const response = await fetch(`${API_BASE_URL}/customers?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate output bằng Zod
      const validatedData = CustomerListSchema.parse(data);

      logVifixa('info', 'customer_service', 'get_customers_success', {
        count: validatedData.data.length,
        pagination: validatedData.pagination,
      });

      return validatedData;
    } catch (error) {
      logVifixa('error', 'customer_service', 'get_customers_failed', { error });
      throw error;
    }
  }

  /**
   * Lấy thông tin chi tiết khách hàng theo ID
   */
  async getCustomerById(id: string): Promise<Customer> {
    logVifixa('info', 'customer_service', 'get_customer_by_id_started', { id });

    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate output bằng Zod
      const validatedData = CustomerSchema.parse(data);

      logVifixa('info', 'customer_service', 'get_customer_by_id_success', {
        customerId: validatedData.id,
      });

      return validatedData;
    } catch (error) {
      logVifixa('error', 'customer_service', 'get_customer_by_id_failed', { id, error });
      throw error;
    }
  }

  /**
   * Tạo mới khách hàng
   */
  async createCustomer(customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    logVifixa('info', 'customer_service', 'create_customer_started', { customerData });

    try {
      const response = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate output bằng Zod
      const validatedData = CustomerSchema.parse(data);

      logVifixa('info', 'customer_service', 'create_customer_success', {
        customerId: validatedData.id,
      });

      return validatedData;
    } catch (error) {
      logVifixa('error', 'customer_service', 'create_customer_failed', { error });
      throw error;
    }
  }

  /**
   * Cập nhật thông tin khách hàng
   */
  async updateCustomer(
    id: string,
    customerData: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Customer> {
    logVifixa('info', 'customer_service', 'update_customer_started', { id, customerData });

    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate output bằng Zod
      const validatedData = CustomerSchema.parse(data);

      logVifixa('info', 'customer_service', 'update_customer_success', {
        customerId: validatedData.id,
      });

      return validatedData;
    } catch (error) {
      logVifixa('error', 'customer_service', 'update_customer_failed', { id, error });
      throw error;
    }
  }

  /**
   * Xóa khách hàng
   */
  async deleteCustomer(id: string): Promise<void> {
    logVifixa('info', 'customer_service', 'delete_customer_started', { id });

    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      logVifixa('info', 'customer_service', 'delete_customer_success', { id });
    } catch (error) {
      logVifixa('error', 'customer_service', 'delete_customer_failed', { id, error });
      throw error;
    }
  }
}

// Singleton instance cho service registry
export const customerService = new CustomerService();

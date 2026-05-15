'use client';

import React, { useState, useEffect } from 'react';
import { customerService } from '@/services/customer.service';
import { Customer, CustomerSchema } from '@/types/customer';
import { createLogger } from '@/utils/logger';
import { z } from 'zod';

const logger = createLogger('CustomerForm');

// Schema cho form tạo/sửa khách hàng (không yêu cầu các field auto-generated)
const CustomerFormSchema = CustomerSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  full_name: z.string().min(2, "Tên khách hàng phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
  vehicle_info: z.object({
    license_plate: z.string().min(1, "Biển số xe là bắt buộc"),
    brand: z.string().min(1, "Hãng xe là bắt buộc"),
    model: z.string().min(1, "Dòng xe là bắt buộc"),
    year: z.number().int().positive().max(new Date().getFullYear() + 1)
  }).optional()
});

type CustomerFormData = z.infer<typeof CustomerFormSchema>;

interface CustomerFormProps {
  customerId?: string; // Nếu có thì là chế độ sửa, không có thì là chế độ tạo mới
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
}

export default function CustomerForm({ customerId, onSuccess, onCancel }: CustomerFormProps) {
  const isEditMode = !!customerId;
  
  const [formData, setFormData] = useState<CustomerFormData>({
    full_name: '',
    email: '',
    phone: '',
    status: 'pending',
    vehicle_info: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetchingData, setFetchingData] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode && customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  const loadCustomerData = async () => {
    logger.info('load_customer_for_edit_started', { customerId });
    setFetchingData(true);

    try {
      const customer = await customerService.getCustomerById(customerId);
      setFormData({
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone || '',
        status: customer.status,
        vehicle_info: customer.vehicle_info,
      });
      logger.info('load_customer_for_edit_success', { customerId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      logger.error('load_customer_for_edit_failed', { customerId, error: errorMessage });
    } finally {
      setFetchingData(false);
    }
  };

  const validateForm = (): boolean => {
    try {
      CustomerFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path.length > 0) {
            const fieldName = error.path.join('.');
            newErrors[fieldName] = error.message;
          }
        });
        setErrors(newErrors);
        logger.warn('form_validation_failed', { errors: newErrors });
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logger.info('form_submit_started', { mode: isEditMode ? 'edit' : 'create' });

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let customer: Customer;
      
      if (isEditMode && customerId) {
        customer = await customerService.updateCustomer(customerId, formData);
        logger.info('customer_updated_success', { customerId });
      } else {
        customer = await customerService.createCustomer(formData as Omit<Customer, 'id' | 'created_at' | 'updated_at'>);
        logger.info('customer_created_success', { customerId: customer.id });
      }

      onSuccess?.(customer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      logger.error('form_submit_failed', { error: errorMessage, mode: isEditMode ? 'edit' : 'create' });
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Xóa error khi người dùng nhập lại
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleVehicleInfoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      vehicle_info: {
        ...prev.vehicle_info,
        [name]: name === 'year' ? parseInt(value) || 0 : value,
      },
    }));

    // Xóa error khi người dùng nhập lại
    const fieldName = `vehicle_info.${name}`;
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Lỗi chung của form */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{errors.submit}</p>
        </div>
      )}

      {/* Thông tin cơ bản */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Thông tin cơ bản</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Họ và tên */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 ${
                errors.full_name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Số điện thoại */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Số điện thoại
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Trạng thái */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Trạng thái <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 ${
                errors.status ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="pending">Chờ xử lý</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status}</p>
            )}
          </div>
        </div>
      </div>

      {/* Thông tin xe */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Thông tin xe (tùy chọn)</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Biển số xe */}
          <div>
            <label htmlFor="license_plate" className="block text-sm font-medium text-gray-700">
              Biển số xe
            </label>
            <input
              type="text"
              id="license_plate"
              name="license_plate"
              value={formData.vehicle_info?.license_plate || ''}
              onChange={handleVehicleInfoChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 ${
                errors['vehicle_info.license_plate'] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors['vehicle_info.license_plate'] && (
              <p className="mt-1 text-sm text-red-600">{errors['vehicle_info.license_plate']}</p>
            )}
          </div>

          {/* Hãng xe */}
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
              Hãng xe
            </label>
            <input
              type="text"
              id="brand"
              name="brand"
              value={formData.vehicle_info?.brand || ''}
              onChange={handleVehicleInfoChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 ${
                errors['vehicle_info.brand'] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors['vehicle_info.brand'] && (
              <p className="mt-1 text-sm text-red-600">{errors['vehicle_info.brand']}</p>
            )}
          </div>

          {/* Dòng xe */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700">
              Dòng xe
            </label>
            <input
              type="text"
              id="model"
              name="model"
              value={formData.vehicle_info?.model || ''}
              onChange={handleVehicleInfoChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 ${
                errors['vehicle_info.model'] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors['vehicle_info.model'] && (
              <p className="mt-1 text-sm text-red-600">{errors['vehicle_info.model']}</p>
            )}
          </div>

          {/* Năm sản xuất */}
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700">
              Năm sản xuất
            </label>
            <input
              type="number"
              id="year"
              name="year"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={formData.vehicle_info?.year || ''}
              onChange={handleVehicleInfoChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 ${
                errors['vehicle_info.year'] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors['vehicle_info.year'] && (
              <p className="mt-1 text-sm text-red-600">{errors['vehicle_info.year']}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo mới'}
        </button>
      </div>
    </form>
  );
}

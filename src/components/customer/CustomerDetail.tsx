'use client';

import React, { useState, useEffect } from 'react';
import { customerService } from '@/services/customer.service';
import { Customer } from '@/types/customer';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CustomerDetail');

interface CustomerDetailProps {
  customerId: string;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customerId: string) => void;
}

export default function CustomerDetail({ customerId, onEdit, onDelete }: CustomerDetailProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    logger.info('load_customer_detail_started', { customerId });
    setLoading(true);
    setError(null);

    try {
      const data = await customerService.getCustomerById(customerId);
      setCustomer(data);
      logger.info('load_customer_detail_success', { customerId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(errorMessage);
      logger.error('load_customer_detail_failed', { customerId, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      return;
    }

    logger.info('delete_customer_started', { customerId });
    setDeleting(true);

    try {
      await customerService.deleteCustomer(customerId);
      logger.info('delete_customer_success', { customerId });
      onDelete?.(customerId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(errorMessage);
      logger.error('delete_customer_failed', { customerId, error: errorMessage });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Đang tải thông tin khách hàng...</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Lỗi: {error || 'Không tìm thấy thông tin khách hàng'}</p>
        <button
          onClick={loadCustomer}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Thông tin khách hàng</h2>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(customer)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Chỉnh sửa
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-6">
        {/* Thông tin cơ bản */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin cơ bản</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">ID khách hàng</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Họ và tên</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.full_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                  {customer.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Số điện thoại</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-gray-400">Chưa cập nhật</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Trạng thái</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    customer.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : customer.status === 'inactive'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {customer.status === 'active'
                    ? 'Hoạt động'
                    : customer.status === 'inactive'
                    ? 'Không hoạt động'
                    : 'Chờ xử lý'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Ngày tạo</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(customer.created_at).toLocaleDateString('vi-VN')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Cập nhật lần cuối</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(customer.updated_at).toLocaleDateString('vi-VN')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Thông tin xe */}
        {customer.vehicle_info && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin xe</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Biển số xe</dt>
                <dd className="mt-1 text-sm text-gray-900 font-medium">
                  {customer.vehicle_info.license_plate}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Hãng xe</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.vehicle_info.brand}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Dòng xe</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.vehicle_info.model}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Năm sản xuất</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.vehicle_info.year}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

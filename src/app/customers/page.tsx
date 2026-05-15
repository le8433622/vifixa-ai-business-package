'use client';

import React, { useState } from 'react';
import { CustomerList, CustomerDetail, CustomerForm } from '@/components/customer';
import { Customer } from '@/types/customer';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CustomersPage');

export default function CustomersPage() {
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create' | 'edit'>('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Để refresh danh sách khi cần

  const handleCustomerSelect = (customerId: string) => {
    logger.info('customer_selected', { customerId });
    setSelectedCustomerId(customerId);
    setViewMode('detail');
  };

  const handleCreateNew = () => {
    logger.info('create_new_clicked');
    setSelectedCustomerId(null);
    setViewMode('create');
  };

  const handleEdit = (customer: Customer) => {
    logger.info('edit_clicked', { customerId: customer.id });
    setSelectedCustomerId(customer.id);
    setViewMode('edit');
  };

  const handleDelete = (customerId: string) => {
    logger.info('customer_deleted', { customerId });
    setSelectedCustomerId(null);
    setViewMode('list');
    setRefreshKey(prev => prev + 1); // Refresh danh sách
  };

  const handleFormSuccess = (customer: Customer) => {
    logger.info('form_success', { 
      customerId: customer.id, 
      mode: viewMode 
    });
    setSelectedCustomerId(customer.id);
    setViewMode('detail');
    setRefreshKey(prev => prev + 1); // Refresh danh sách
  };

  const handleFormCancel = () => {
    logger.info('form_cancelled');
    if (selectedCustomerId) {
      setViewMode('detail');
    } else {
      setViewMode('list');
    }
  };

  const handleBackToList = () => {
    logger.info('back_to_list');
    setSelectedCustomerId(null);
    setViewMode('list');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quản lý khách hàng</h1>
              <p className="mt-1 text-sm text-gray-500">
                Quản lý thông tin khách hàng và xe của họ
              </p>
            </div>
            {viewMode !== 'list' && (
              <button
                onClick={handleBackToList}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                ← Quay lại danh sách
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Thêm khách hàng mới
              </button>
            </div>
            <CustomerList
              key={refreshKey}
              initialFilter={{}}
            />
          </div>
        )}

        {viewMode === 'detail' && selectedCustomerId && (
          <CustomerDetail
            customerId={selectedCustomerId}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {viewMode === 'create' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Thêm khách hàng mới</h2>
            <CustomerForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        {viewMode === 'edit' && selectedCustomerId && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Chỉnh sửa thông tin khách hàng</h2>
            <CustomerForm
              customerId={selectedCustomerId}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        )}
      </main>
    </div>
  );
}

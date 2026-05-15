/**
 * [VIFIXA] Customer Module Exports
 * Tuân thủ ARCH-002: Service registry pattern
 */

export { CustomerList } from './CustomerList';
export { CustomerDetail } from './CustomerDetail';
export { CustomerForm } from './CustomerForm';

// Re-export types cho tiện sử dụng
export type {
  Customer,
  CustomerList as CustomerListType,
  CustomerFilter,
} from '@/types/customer';

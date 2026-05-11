import { formatPrice, getStatusColor, getStatusLabel } from '@/lib/customerConstants';

describe('Customer Constants Utils', () => {
  describe('formatPrice', () => {
    it('formats price correctly for VND', () => {
      // Note: toLocaleString behavior might vary slightly by environment
      // We check if it contains the currency symbol and digits
      const result = formatPrice(150000);
      expect(result).toContain('150.000');
      expect(result).toContain('₫');
    });

    it('returns default message for undefined price', () => {
      expect(formatPrice(undefined)).toBe('Chưa có giá');
      expect(formatPrice(null)).toBe('Chưa có giá');
    });
  });

  describe('getStatusColor', () => {
    it('returns correct color for pending status', () => {
      expect(getStatusColor('pending')).toBe('#fef3c7');
    });

    it('returns default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('#f3f4f6');
    });
  });

  describe('getStatusLabel', () => {
    it('returns vietnamese label for status', () => {
      expect(getStatusLabel('completed')).toBe('Hoàn thành');
    });

    it('returns raw status for unknown labels', () => {
      expect(getStatusLabel('custom')).toBe('custom');
    });
  });
});

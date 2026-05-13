// Vietnamese address formatter
export function formatAddress(params: {
  street?: string;
  ward?: string;
  district?: string;
  province?: string;
}): string {
  const parts = [params.street, params.ward, params.district, params.province]
    .filter(Boolean);
  return parts.join(', ');
}

// Abbreviate province name for display
const PROVINCE_ABBR: Record<string, string> = {
  'Thành phố Hồ Chí Minh': 'TP.HCM',
  'Thành phố Hà Nội': 'Hà Nội',
  'Thành phố Đà Nẵng': 'Đà Nẵng',
  'Thành phố Cần Thơ': 'Cần Thơ',
  'Thành phố Hải Phòng': 'Hải Phòng',
};

export function shortenProvince(name: string): string {
  return PROVINCE_ABBR[name] || name.replace(/^(Tỉnh|Thành phố) /, '');
}

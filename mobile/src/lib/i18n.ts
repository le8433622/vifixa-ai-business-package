// 🌐 Vifixa Mobile i18n — EN + VI
// Dùng chung key structure với web i18n

type Locale = 'en' | 'vi'

const en: Record<string, string> = {
  'nav.home': 'Home',
  'nav.orders': 'Orders',
  'nav.devices': 'Devices',
  'nav.account': 'Account',
  'nav.jobs': 'Jobs',
  'nav.earnings': 'Earnings',
  'nav.profile': 'Profile',
  'order.status.pending': 'Pending',
  'order.status.matched': 'Matched',
  'order.status.in_progress': 'In Progress',
  'order.status.completed': 'Completed',
  'common.back': 'Back',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading...',
  'wallet.balance': 'Balance',
  'wallet.deposit': 'Deposit',
  'wallet.withdraw': 'Withdraw',
}

const vi: Record<string, string> = {
  'nav.home': 'Trang chủ',
  'nav.orders': 'Đơn hàng',
  'nav.devices': 'Thiết bị',
  'nav.account': 'Tài khoản',
  'nav.jobs': 'Việc làm',
  'nav.earnings': 'Thu nhập',
  'nav.profile': 'Hồ sơ',
  'order.status.pending': 'Chờ xử lý',
  'order.status.matched': 'Đã ghép thợ',
  'order.status.in_progress': 'Đang thực hiện',
  'order.status.completed': 'Hoàn thành',
  'common.back': 'Quay lại',
  'common.save': 'Lưu',
  'common.cancel': 'Hủy',
  'common.loading': 'Đang tải...',
  'wallet.balance': 'Số dư',
  'wallet.deposit': 'Nạp tiền',
  'wallet.withdraw': 'Rút tiền',
}

export function useT(locale: Locale = 'vi') {
  const dict = locale === 'en' ? en : vi
  return { t: (key: string) => dict[key] || key, locale }
}

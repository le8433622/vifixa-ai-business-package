'use client'

import Link from 'next/link'

// Bảng điều khiển trung tâm AI — chỉ giữ MAP + AI cốt lõi

const DANH_MUC_AI = [
  {
    nhom: '🗺️ Bản đồ & Giám sát',
    moTa: 'Xem toàn bộ hệ thống trên bản đồ, theo dõi AI real-time',
    muc: [
      { href: '/admin/ai/dashboard', tieuDe: 'Bảng điều khiển', icon: '🗺️', moTa: 'Xem thợ, đơn hàng, nhu cầu trên bản đồ' },
      { href: '/admin/ai/heatmap', tieuDe: 'Bản đồ nhu cầu', icon: '🔥', moTa: 'Phân tích nhu cầu dịch vụ theo khu vực' },
      { href: '/admin/ai/health', tieuDe: 'Giám sát sản xuất', icon: '🏥', moTa: 'Uptime, health check, performance toàn bộ hệ thống' },
      { href: '/admin/ai/monitor', tieuDe: 'Giám sát AI', icon: '📡', moTa: 'AI calls real-time, chi phí, cảnh báo' },
      { href: '/admin/ai/cost', tieuDe: 'Chi phí AI', icon: '💰', moTa: 'Chi phí theo ngày, agent, cache hit rate' },
    ],
  },
  {
    nhom: '🧠 Chất lượng AI',
    moTa: 'Đánh giá và cải thiện độ chính xác của AI',
    muc: [
      { href: '/admin/ai/accuracy', tieuDe: 'Độ chính xác', icon: '🎯', moTa: 'Tỷ lệ đúng/sai theo từng AI agent' },
      { href: '/admin/ai/feedback', tieuDe: 'Phản hồi', icon: '💬', moTa: 'Feedback từ người dùng về quyết định AI' },
      { href: '/admin/ai/abtests', tieuDe: 'Thử nghiệm A/B', icon: '🧪', moTa: 'So sánh prompt, statistical significance' },
      { href: '/admin/ai/prompts', tieuDe: 'Quản lý Prompt', icon: '📝', moTa: 'Xem và chỉnh sửa prompt theo phiên bản' },
      { href: '/admin/ai/autopilot', tieuDe: 'Tự động hóa', icon: '🚀', moTa: 'Auto-Pilot — AI tự động xử lý đơn hàng' },
    ],
  },
  {
    nhom: '📊 Phân tích AI',
    moTa: 'Khai thác dữ liệu với AI',
    muc: [
      { href: '/admin/ai/analytics', tieuDe: 'Phân tích AI', icon: '📊', moTa: 'Tổng quan hiệu suất, doanh thu, churn' },
      { href: '/admin/ai-logs', tieuDe: 'Nhật ký AI', icon: '🤖', moTa: 'Raw AI logs và quality metrics' },
    ],
  },
]

export default function TrangChuAI() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-2">🧠 Trung tâm AI</h1>
          <p className="text-blue-100 text-sm">
            Hệ điều hành AI cho dịch vụ vật lý — MAP + AI = Trung tâm
          </p>
          <div className="flex gap-4 mt-6">
            <Link href="/admin/ai/dashboard" className="px-5 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium hover:bg-white/30">
              🗺️ Vào bảng điều khiển
            </Link>
            <Link href="/admin/ai/monitor" className="px-5 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-sm font-medium hover:bg-white/20">
              📡 Giám sát AI
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {DANH_MUC_AI.map(nhom => (
          <section key={nhom.nhom}>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">{nhom.nhom}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{nhom.moTa}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nhom.muc.map(muc => (
                <Link key={muc.href} href={muc.href}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shrink-0">
                      {muc.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 mb-1">{muc.tieuDe}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{muc.moTa}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
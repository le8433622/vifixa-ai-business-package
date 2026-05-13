import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block">← Quay lại</Link>
        <h1 className="text-3xl font-bold mb-8">Điều khoản Dịch vụ</h1>

        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Giới thiệu</h2>
            <p>Chào mừng bạn đến với Vifixa. Khi sử dụng nền tảng của chúng tôi, bạn đồng ý tuân thủ các điều khoản và điều kiện sau đây.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Định nghĩa</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Nền tảng:</strong> Ứng dụng và website Vifixa kết nối khách hàng với thợ sửa chữa chuyên nghiệp.</li>
              <li><strong>Khách hàng:</strong> Người dùng đăng dịch vụ sửa chữa.</li>
              <li><strong>Thợ:</strong> Người dùng cung cấp dịch vụ sửa chữa đã được xác minh.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Trách nhiệm của Thợ</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Cung cấp thông tin cá nhân chính xác và đầy đủ.</li>
              <li>Thực hiện dịch vụ theo đúng mô tả và báo giá.</li>
              <li>Giữ thái độ chuyên nghiệp và tôn trọng khách hàng.</li>
              <li>Hoàn thành công việc đúng thời hạn đã cam kết.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Trách nhiệm của Khách hàng</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Cung cấp thông tin chính xác về vấn đề cần sửa chữa.</li>
              <li>Thanh toán chi phí dịch vụ theo đúng thỏa thuận.</li>
              <li>Tạo điều kiện thuận lợi cho thợ thực hiện công việc.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Xác minh và Tin cậy</h2>
            <p>Vifixa có quyền xác minh thông tin của thợ và khách hàng. Điểm tin cậy (trust score) được tính dựa trên lịch sử hoàn thành công việc và đánh giá từ khách hàng.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Thanh toán</h2>
            <p>Tất cả giao dịch thanh toán được xử lý qua cổng thanh toán an toàn. Vifixa không chịu trách nhiệm cho các giao dịch ngoài nền tảng.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Quyền riêng tư</h2>
            <p>Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn. Xem Chính sách Bảo mật để biết thêm chi tiết.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Giải quyết tranh chấp</h2>
            <p>Mọi tranh chấp phát sinh sẽ được giải quyết thông qua hòa giải trước khi đưa ra tòa án có thẩm quyền tại Việt Nam.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Liên hệ</h2>
            <p>Mọi thắc mắc vui lòng liên hệ qua email: <a href="mailto:support@vifixa.com" className="text-blue-600 hover:underline">support@vifixa.com</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}

// Landing Page - Public & Authenticated
// Per 05_PRODUCT_SOLUTION.md - Public landing page
// Per Step 3: Build web app

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await (supabase as any)
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const profile = data as { role?: string } | null;
        const role = profile?.role;
        const updatedUser = { ...session.user, role };

        // Khách đã login → redirect thẳng vào dashboard
        if (role === 'customer') {
          router.replace('/customer');
          return;
        }
        if (role === 'worker') {
          router.replace('/worker');
          return;
        }
        if (role === 'admin') {
          router.replace('/admin');
          return;
        }

        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Vifixa AI</h1>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <button onClick={() => router.push('/admin')} className="text-gray-600 hover:text-gray-900 font-medium">
                    Admin Dashboard
                  </button>
                )}
                <button onClick={handleLogout} className="text-gray-600 hover:text-red-600 px-3 py-1 rounded-md hover:bg-red-50 transition-colors">
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button onClick={() => router.push('/login')} className="text-gray-600 hover:text-gray-900">
                  Đăng nhập
                </button>
                <button onClick={() => router.push('/register')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
              Dịch vụ sửa chữa<br />
              <span className="text-blue-600">thông minh AI</span>
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 mb-8 max-w-xl leading-relaxed">
              Chẩn đoán AI tức thì, báo giá minh bạch, thợ chuyên nghiệp được xác minh. Tất cả chỉ trong vài phút.
            </p>
            {user ? (
              user.role === 'admin' ? (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Vào trang quản trị
                </button>
              ) : (
                <button
                  onClick={() => router.push('/customer')}
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Đến dashboard khách hàng
                </button>
              )
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => router.push('/register')}
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Bắt đầu ngay
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="bg-gray-100 text-gray-800 px-8 py-3.5 rounded-lg text-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Đăng nhập
                </button>
              </div>
            )}
          </div>

          {/* QR Code for Mobile App */}
          <div className="flex flex-col items-center lg:items-end">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Tải ứng dụng Vifixa AI</h3>
                  <p className="text-sm text-gray-500">Quét mã QR để tải về</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-100">
                <QRCodeSVG
                  value="https://web-eta-ochre-99.vercel.app"
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <a
                  href="https://expo.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-black text-white text-xs font-medium px-3 py-2.5 rounded-lg text-center hover:bg-gray-800 transition-colors"
                >
                  iOS App
                </a>
                <a
                  href="https://expo.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-600 text-white text-xs font-medium px-3 py-2.5 rounded-lg text-center hover:bg-blue-700 transition-colors"
                >
                  Android App
                </a>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">
                Hoặc truy cập: web-eta-ochre-99.vercel.app
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-4">Cách hoạt động</h3>
          <p className="text-center text-gray-600 mb-12 max-w-lg mx-auto">3 bước đơn giản để sửa chữa mọi thứ trong nhà bạn</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Mô tả vấn đề</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Kể chúng tôi biết điều gì đang xảy ra hoặc tải ảnh lên để AI chẩn đoán.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Chẩn đoán AI</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                AI phân tích vấn đề và đưa ra chẩn đoán cùng báo giá ngay lập tức.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Đặt thợ chuyên nghiệp</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Ghép với thợ đã được xác minh và theo dõi tiến độ theo thời gian thực.
              </p>
            </div>
          </div>

          {/* Service Categories */}
          <div className="mt-16">
            <h4 className="text-xl font-bold text-center mb-8">Dịch vụ phổ biến</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '❄️', label: 'Điện lạnh', desc: 'Máy lạnh, tủ lạnh' },
                { icon: '🚿', label: 'Điện nước', desc: 'Ống nước, điện' },
                { icon: '🔌', label: 'Điện gia dụng', desc: 'Máy giặt, lò vi sóng' },
                { icon: '📷', label: 'Camera & Khóa', desc: 'Lắp đặt, sửa chữa' },
              ].map((cat) => (
                <div
                  key={cat.label}
                  onClick={() => router.push('/register')}
                  className="bg-white rounded-xl p-4 border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer text-center"
                >
                  <span className="text-3xl block mb-2">{cat.icon}</span>
                  <p className="font-semibold text-gray-900 text-sm">{cat.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-blue-600">AI</p>
              <p className="text-sm text-gray-600 mt-1">Chẩn đoán thông minh</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">100%</p>
              <p className="text-sm text-gray-600 mt-1">Minh bạch giá</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">30 ngày</p>
              <p className="text-sm text-gray-600 mt-1">Bảo hành sau sửa chữa</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-8 border-t">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>© 2026 Vifixa AI. Tất cả quyền được bảo lưu.</p>
        </div>
      </footer>
    </div>
  );
}

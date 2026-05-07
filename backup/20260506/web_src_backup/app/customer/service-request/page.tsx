// Web Service Request Form
// Per 05_PRODUCT_SOLUTION.md - Customer flow: Multi-step request with AI diagnosis
// Per Step 6: Web Flows with TanStack Query

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import QueryProvider from '@/components/QueryProvider';

const CATEGORIES = [
  { id: 'electricity', name: 'Điện lạnh', icon: '❄️' },
  { id: 'plumbing', name: 'Điện nước', icon: '🚿' },
  { id: 'appliance', name: 'Điện gia dụng', icon: '🔌' },
  { id: 'camera', name: 'Camera/Khóa', icon: '📷' },
];

export default function WebServiceRequest() {
  return (
    <QueryProvider>
      <ServiceRequestContent />
    </QueryProvider>
  );
}

function ServiceRequestContent() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState<FileList | null>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // TanStack Query for session check
  const { data: session, isLoading } = useQuery({
    queryKey: ['session-check'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return null;
      }
      return session;
    },
  });

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Upload media files
      let mediaUrls: string[] = [];
      if (mediaFiles) {
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          const fileName = `${Date.now()}-${file.name}`;
          const { data, error } = await supabase.storage
            .from('service-media')
            .upload(fileName, file);

          if (!error && data) {
            const { data: { publicUrl } } = supabase.storage
              .from('service-media')
              .getPublicUrl(data.path);
            mediaUrls.push(publicUrl);
          }
        }
      }

      // Get user's location (default to HCMC)
      const location = { lat: 10.8231, lng: 106.6297 };

      const response = await fetch('/api/ai/customer-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          description,
          media_urls: mediaUrls,
          location,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('API error response:', text.substring(0, 200));
        throw new Error(`API error: ${response.status} ${text.substring(0, 100)}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        console.error('JSON parse error, response:', text.substring(0, 200));
        throw new Error('Invalid response from server');
      }

      if (!response.ok) throw new Error(data.error || 'Failed to create request');

      setDiagnosis(data.ai_diagnosis);
      setEstimatedPrice(data.estimated_price);
      setStep(3);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <button 
          onClick={() => router.push('/customer')}
          className="text-white mb-2 hover:underline"
        >
          ← Quay lại Dashboard
        </button>
        <h1 className="text-3xl font-bold">Tạo yêu cầu dịch vụ</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {/* Step Indicator */}
        <div className="flex items-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                s === step ? 'bg-blue-600 text-white' :
                s < step ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {s}
              </div>
              {s < 3 && <div className="w-16 h-1 bg-gray-300"></div>}
            </div>
          ))}
        </div>

        {/* Step 1: Select Category */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Chọn danh mục dịch vụ</h2>
            <div className="grid grid-cols-4 gap-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setStep(2);
                  }}
                  className={`p-6 rounded-lg border-2 text-center ${
                    selectedCategory === cat.id 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-4xl mb-2">{cat.icon}</div>
                  <p className="font-semibold">{cat.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Describe Problem */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Mô tả vấn đề</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mô tả chi tiết vấn đề
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Điều hòa bị rò rỉ nước, không làm lạnh..."
                  className="w-full px-4 py-3 border rounded-lg"
                  rows={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tải lên ảnh/video (tùy chọn)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => setMediaFiles(e.target.files)}
                  className="w-full"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!description || submitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? 'Đang xử lý...' : 'Gửi yêu cầu & Nhận AI Diagnosis'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: AI Diagnosis Result */}
        {step === 3 && diagnosis && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-green-800 mb-4">
                ✅ AI Diagnosis Complete!
              </h2>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Kết quả chẩn đoán</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Chẩn đoán</p>
                  <p className="text-lg font-semibold">{diagnosis.diagnosis}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mức độ</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                    diagnosis.severity === 'emergency' ? 'bg-red-100 text-red-800' :
                    diagnosis.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    diagnosis.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {diagnosis.severity}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kỹ năng cần thiết</p>
                  <p className="font-semibold">{diagnosis.recommended_skills?.join(', ')}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Giá dự kiến</h3>
              <p className="text-3xl font-bold text-blue-600">${estimatedPrice}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedCategory('');
                  setDescription('');
                  setDiagnosis(null);
                  setEstimatedPrice(null);
                }}
                className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Tạo yêu cầu mới
              </button>
              <button
                onClick={() => router.push('/customer')}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              >
                Xem đơn hàng của tôi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Admin AI Approval Queue
// Human approval path for supervised/manual AI action requests.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'blocked' | 'all';
type ApprovalDecision = 'approve' | 'reject' | 'execute';

interface ApprovalProfile {
  email?: string;
  phone?: string;
}

interface ApprovalPayload {
  category?: string;
  description?: string;
  urgency?: string;
  preferred_time?: string;
  location?: { lat?: number; lng?: number; address?: string } | string;
  quote?: {
    estimated_price?: number;
    confidence?: number;
    disclaimer?: string;
    price_breakdown?: Record<string, unknown>;
  };
  media_urls?: string[];
}

interface AIActionRequest {
  id: string;
  request_id: string;
  session_id?: string;
  order_id?: string;
  user_id: string;
  action_type: string;
  action_payload: ApprovalPayload;
  status: Exclude<ApprovalStatus, 'all'>;
  approval_mode: 'autonomous' | 'supervised' | 'manual';
  decision_reason: string;
  approved_by?: string;
  approved_at?: string;
  executed_at?: string;
  metadata?: {
    risk_flags?: string[];
    confidence?: number;
    conversion_stage?: string;
    admin_note?: string;
  };
  created_at: string;
  profiles?: ApprovalProfile;
}

const STATUSES: ApprovalStatus[] = ['pending', 'approved', 'blocked', 'executed', 'rejected', 'all'];

function formatCurrency(value?: number) {
  if (!value) return 'Chưa có giá';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatLocation(location: ApprovalPayload['location']) {
  if (!location) return 'Chưa có vị trí';
  if (typeof location === 'string') return location;
  if (location.address) return location.address;
  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
  }
  return JSON.stringify(location);
}

function statusClass(status: AIActionRequest['status']) {
  if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
  if (status === 'approved') return 'bg-blue-100 text-blue-800';
  if (status === 'executed') return 'bg-green-100 text-green-800';
  if (status === 'blocked') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

function reasonLabel(reason: string) {
  return reason.replaceAll('_', ' ');
}

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<AIActionRequest[]>([]);
  const [status, setStatus] = useState<ApprovalStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests],
  );

  useEffect(() => {
    fetchRequests(status);
  }, [status]);

  async function getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/');
      return null;
    }
    return session.access_token;
  }

  async function fetchRequests(nextStatus = status) {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch(`/api/ai/admin-dashboard?action=ai-action-requests&status=${nextStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được approval queue');
      setRequests(data.requests || []);
    } catch (err: any) {
      setError(err.message || 'Không tải được approval queue');
    } finally {
      setLoading(false);
    }
  }

  async function submitDecision(requestId: string, decision: ApprovalDecision) {
    setActingId(requestId);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch('/api/ai/admin-dashboard?action=ai-action-request-decision', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          decision,
          note: noteById[requestId] || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được approval request');

      if (decision === 'execute' && data.order_id) {
        alert(`Đã thực thi và tạo đơn ${data.order_id}`);
      }
      await fetchRequests(status);
    } catch (err: any) {
      setError(err.message || 'Không cập nhật được approval request');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <button
        onClick={() => router.push('/admin')}
        className="text-blue-600 hover:underline mb-6"
      >
        ← Back to Dashboard
      </button>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">AI Autonomy Control</p>
          <h1 className="text-3xl font-bold">Admin Approval Queue</h1>
          <p className="text-gray-600 mt-2 max-w-3xl">
            Duyệt các hành động AI không đủ điều kiện tự động thực thi: manual/supervised mode,
            confidence thấp, giá vượt ngưỡng hoặc rủi ro vận hành.
          </p>
        </div>
        <button
          onClick={() => fetchRequests(status)}
          className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-800"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
          <p className="text-sm text-yellow-800">Pending cần duyệt</p>
          <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-800">Bộ lọc hiện tại</p>
          <p className="text-3xl font-bold text-blue-900 capitalize">{status}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-sm text-green-800">Tổng request đang hiển thị</p>
          <p className="text-3xl font-bold text-green-900">{requests.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={`px-4 py-2 rounded-full border capitalize ${status === item ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading approval queue...</p>
      ) : requests.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-600">
          Không có AI action request nào trong trạng thái này.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const payload = request.action_payload || {};
            const riskFlags = request.metadata?.risk_flags || [];
            const canApprove = request.status === 'pending';
            const canReject = request.status === 'pending' || request.status === 'approved';
            const canExecute = request.status === 'pending' || request.status === 'approved';

            return (
              <div key={request.id} className="bg-white border rounded-lg p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass(request.status)}`}>
                        {request.status}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        {request.approval_mode}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {request.action_type}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold capitalize">{payload.category || 'Unknown service'}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Khách: {request.profiles?.email || request.user_id} · {new Date(request.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      Lý do cần duyệt: <span className="font-medium">{reasonLabel(request.decision_reason)}</span>
                    </p>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-sm text-gray-600">Giá AI đề xuất</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(payload.quote?.estimated_price)}</p>
                    <p className="text-xs text-gray-500">
                      Confidence: {payload.quote?.confidence ? `${Math.round(payload.quote.confidence * 100)}%` : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="font-semibold mb-2">Thông tin chốt đơn</h3>
                    <dl className="space-y-2 text-sm">
                      <div><dt className="text-gray-500">Mô tả</dt><dd>{payload.description || '-'}</dd></div>
                      <div><dt className="text-gray-500">Vị trí</dt><dd>{formatLocation(payload.location)}</dd></div>
                      <div><dt className="text-gray-500">Mức khẩn cấp</dt><dd>{payload.urgency || '-'}</dd></div>
                      <div><dt className="text-gray-500">Thời gian mong muốn</dt><dd>{payload.preferred_time || '-'}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="font-semibold mb-2">Risk & Audit</h3>
                    {riskFlags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {riskFlags.map((flag) => (
                          <span key={flag} className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">
                            {flag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-green-700 mb-3">Không có risk flag.</p>
                    )}
                    <p className="text-xs text-gray-500 break-all">Session: {request.session_id || 'N/A'}</p>
                    <p className="text-xs text-gray-500 break-all">Request: {request.request_id}</p>
                    {request.order_id && <p className="text-xs text-gray-500 break-all">Order: {request.order_id}</p>}
                    {request.metadata?.admin_note && (
                      <p className="text-xs text-gray-700 mt-2">Ghi chú admin: {request.metadata.admin_note}</p>
                    )}
                  </div>
                </div>

                {payload.media_urls && payload.media_urls.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Media khách gửi</h3>
                    <div className="flex flex-wrap gap-2">
                      {payload.media_urls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">
                          Xem media
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={`note-${request.id}`}>
                    Ghi chú duyệt/từ chối/thực thi
                  </label>
                  <textarea
                    id={`note-${request.id}`}
                    value={noteById[request.id] || ''}
                    onChange={(event) => setNoteById({ ...noteById, [request.id]: event.target.value })}
                    className="w-full border rounded-lg p-3 text-sm"
                    rows={2}
                    placeholder="Ví dụ: Đã kiểm tra thông tin, cho phép tạo đơn."
                  />
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  {canApprove && (
                    <button
                      disabled={actingId === request.id}
                      onClick={() => submitDecision(request.id, 'approve')}
                      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Approve only
                    </button>
                  )}
                  {canExecute && (
                    <button
                      disabled={actingId === request.id}
                      onClick={() => submitDecision(request.id, 'execute')}
                      className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve & Execute
                    </button>
                  )}
                  {canReject && (
                    <button
                      disabled={actingId === request.id}
                      onClick={() => submitDecision(request.id, 'reject')}
                      className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  {request.order_id && (
                    <button
                      onClick={() => router.push('/admin/orders')}
                      className="px-4 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                      View Orders
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

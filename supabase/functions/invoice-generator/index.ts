// Invoice Generator — Creates PDF invoice for orders
// GET /invoice-generator?order_id=xxx — Returns HTML invoice (print → PDF)
// POST /invoice-generator — Returns JSON with download URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id')

    if (!orderId) {
      return jsonResponse({ error: 'Missing order_id' }, 400)
    }

    // Fetch order with related data
    const { data: order } = await supabase
      .from('orders')
      .select('*, customer:customer_id(*), worker:worker_id(*)')
      .eq('id', orderId)
      .single()

    if (!order) return jsonResponse({ error: 'Order not found' }, 404)

    const invoiceNo = `INV-${order.id?.slice(0, 8).toUpperCase() || '00000000'}`
    const issuedDate = new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    const total = order.estimated_price || 0
    const vat = Math.round(total * 0.1)
    const grandTotal = total + vat

    const customerName = order.customer?.full_name || order.customer?.email || 'Khách hàng'
    const customerPhone = order.customer?.phone || ''
    const workerName = order.worker?.full_name || '—'

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Hóa đơn ${invoiceNo}</title>
<style>
  @page { margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; }
  .brand h1 { font-size: 28px; color: #2563eb; margin-bottom: 4px; }
  .brand p { color: #666; font-size: 12px; }
  .invoice-info { text-align: right; }
  .invoice-info h2 { font-size: 22px; margin-bottom: 8px; }
  .invoice-info p { font-size: 13px; color: #666; }
  .divider { border: none; border-top: 2px solid #2563eb; margin: 24px 0; }
  .section { margin-bottom: 32px; }
  .section h3 { font-size: 14px; text-transform: uppercase; color: #2563eb; margin-bottom: 12px; letter-spacing: 1px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .detail-row { display: flex; justify-content: space-between; padding: 6px 0; }
  .detail-row span:first-child { color: #666; }
  .table { width: 100%; border-collapse: collapse; }
  .table th { text-align: left; padding: 10px 12px; background: #f3f4f6; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
  .table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
  .table td:last-child, .table th:last-child { text-align: right; }
  .totals { margin-top: 24px; margin-left: auto; width: 300px; }
  .totals .row { display: flex; justify-content: space-between; padding: 8px 0; }
  .totals .total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 12px; margin-top: 8px; }
  .footer { margin-top: 48px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 24px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-unpaid { background: #fef3c7; color: #92400e; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>Vifixa AI</h1>
      <p>AI-Powered Home Services</p>
    </div>
    <div class="invoice-info">
      <h2>HÓA ĐƠN</h2>
      <p>${invoiceNo}</p>
      <p>Ngày: ${issuedDate}</p>
      <span class="status-badge ${order.status === 'completed' ? 'status-paid' : 'status-unpaid'}">${order.status === 'completed' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
    </div>
  </div>

  <hr class="divider">

  <div class="grid section">
    <div>
      <h3>Khách hàng</h3>
      <p><strong>${customerName}</strong></p>
      <p>${customerPhone}</p>
      <p style="font-size:12px;color:#666;">${order.address || ''}</p>
    </div>
    <div>
      <h3>Thông tin đơn</h3>
      <p>Mã đơn: <strong>#${orderId?.slice(0, 8)}</strong></p>
      <p>Dịch vụ: ${order.service_type || 'Sửa chữa'}</p>
      <p>Thợ: ${workerName}</p>
    </div>
  </div>

  <div class="section">
    <h3>Chi tiết</h3>
    <table class="table">
      <thead>
        <tr><th>Dịch vụ</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${order.service_type ? order.service_type : order.description || 'Dịch vụ sửa chữa'}</td>
          <td>${total.toLocaleString()}₫</td>
          <td>1</td>
          <td>${total.toLocaleString()}₫</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="row"><span>Tạm tính</span><span>${total.toLocaleString()}₫</span></div>
    <div class="row"><span>VAT (10%)</span><span>${vat.toLocaleString()}₫</span></div>
    <div class="row total"><span>Tổng cộng</span><span>${grandTotal.toLocaleString()}₫</span></div>
  </div>

  <div class="footer">
    <p>Vifixa AI — Hỗ trợ: contact@vifixa.com — Hotline: 1900 xxxx</p>
    <p>Cảm ơn bạn đã sử dụng dịch vụ!</p>
  </div>
</body>
</html>`

    // If the request accepts HTML, return it directly
    const accept = req.headers.get('accept') || ''
    if (accept.includes('text/html')) {
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Otherwise return JSON with HTML content
    return jsonResponse({
      success: true,
      invoice_no: invoiceNo,
      html,
      download_url: `${supabaseUrl}/functions/v1/invoice-generator?order_id=${orderId}`,
    })
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
})

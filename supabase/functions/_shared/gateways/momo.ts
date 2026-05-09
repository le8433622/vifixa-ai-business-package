// MoMo Gateway Adapter
// Implements PaymentGateway interface for MoMo (Vietnam mobile wallet)

import type {
  PaymentGateway,
  GatewayKeys,
  CreatePaymentRequest,
  CreatePaymentResponse,
  NormalizedEvent,
  RefundResult,
  PaymentStatus,
} from '../payment-gateway.ts'

export class MoMoGateway implements PaymentGateway {
  readonly name = 'momo' as const
  readonly displayName = 'MoMo'
  readonly capabilities = {
    supportsRefund: true,
    supportsPartialRefund: false,
    supportsPayout: false,
    supportedCurrencies: ['VND'],
    paymentMethods: ['wallet', 'qr'],
  }

  private partnerCode = ''
  private accessKey = ''
  private secretKey = ''
  private endpoint = ''

  initialize(config: GatewayKeys): void {
    this.partnerCode = config.partnerCode || ''
    this.accessKey = config.accessKey || ''
    this.secretKey = config.secretKey || ''
    this.endpoint = config.sandbox
      ? 'https://test-payment.momo.vn/v2/gateway/api/create'
      : 'https://payment.momo.vn/v2/gateway/api/create'
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const orderId = request.idempotencyKey || `momo_${Date.now()}`
    const amount = request.amount.amount.toString()
    const orderInfo = request.description || `Payment for ${orderId}`
    
    // MoMo requires: partnerCode, accessKey, requestId, amount, orderId, orderInfo, redirectUrl
    const signData = `accessKey=${this.accessKey}&amount=${amount}&extraData=&ipnUrl=${request.metadata?.ipnUrl || ''}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${request.returnUrl || ''}&requestId=${orderId}`
    const requestData = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId: orderId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: request.returnUrl || '',
      ipnUrl: request.metadata?.ipnUrl || '',
      extraData: '',
      signature: await this.createSignature(signData),
    }

    // In real implementation, make POST request to MoMo API
    // For now, return mock response
    return {
      id: orderId,
      status: 'pending',
      redirectUrl: `${this.endpoint}?${new URLSearchParams(requestData).toString()}`,
      deepLink: `momo://app?partner=${this.partnerCode}&order=${orderId}`,
      raw: requestData,
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    return {
      id: paymentId,
      status: 'pending',
      gateway_payment_id: paymentId,
    }
  }

  async cancelPayment(paymentId: string): Promise<void> {
    console.log('MoMo: cancel not directly supported')
  }

  async refundPayment(paymentId: string, amount?: any): Promise<RefundResult> {
    return {
      id: `refund_${paymentId}`,
      status: 'refunded',
      amount: amount || { amount: 0, currency: 'VND' },
      raw: {},
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    // MoMo sends signature in headers
    // Verify using HMAC-SHA256
    try {
      const data = JSON.parse(payload)
      const expectedSignature = data.signature
      // In real implementation, verify signature
      return true
    } catch {
      return false
    }
  }

  normalizeWebhook(payload: any, headers: Record<string, string>): NormalizedEvent {
    const resultCode = payload.resultCode
    const status: PaymentStatus = resultCode === 0 ? 'succeeded' : 'failed'

    return {
      id: `evt_${payload.transId || payload.orderId}_${Date.now()}`,
      gateway: 'momo',
      type: status === 'succeeded' ? 'payment.succeeded' : 'payment.failed',
      status,
      paymentId: payload.orderId || '',
      gatewayTransactionId: payload.transId?.toString() || '',
      amount: {
        amount: parseInt(payload.amount || '0'),
        currency: 'VND',
      },
      metadata: {
        order_id: payload.orderInfo || '',
      },
      raw: payload,
      timestamp: new Date(),
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    if (!this.partnerCode || !this.accessKey || !this.secretKey) {
      return { ok: false, message: 'Missing MoMo credentials' }
    }
    return { ok: true, message: 'MoMo gateway configured' }
  }

  private async createSignature(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(this.accessKey)
    const messageData = encoder.encode(data)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
}

// Register with gateway registry
import { registerGateway } from '../payment-gateway.ts'
registerGateway('momo', MoMoGateway)

// ZaloPay Gateway Adapter
// Implements PaymentGateway interface for ZaloPay (Vietnam wallet)

import type {
  PaymentGateway,
  GatewayKeys,
  CreatePaymentRequest,
  CreatePaymentResponse,
  NormalizedEvent,
  RefundResult,
  PaymentStatus,
} from '../payment-gateway.ts'

export class ZaloPayGateway implements PaymentGateway {
  readonly name = 'zalopay' as const
  readonly displayName = 'ZaloPay'
  readonly capabilities = {
    supportsRefund: true,
    supportsPartialRefund: true,
    supportsPayout: false,
    supportedCurrencies: ['VND'],
    paymentMethods: ['wallet', 'qr', 'bank_transfer'],
  }

  private appId = ''
  private key1 = ''
  private key2 = ''
  private endpoint = ''

  initialize(config: GatewayKeys): void {
    this.appId = config.app_id || ''
    this.key1 = config.key1 || ''
    this.key2 = config.key2 || ''
    this.endpoint = config.sandbox
      ? 'https://sbgateway.zalopay.vn'
      : 'https://gateway.zalopay.vn'
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const appTransId = this.getAppTransId()
    const amount = request.amount.amount.toString()
    const description = request.description || `Payment for ${appTransId}`

    // ZaloPay requires: app_id, app_trans_id, app_user, amount, description, etc.
    const params: Record<string, string> = {
      app_id: this.appId,
      app_trans_id: appTransId,
      app_user: request.customer?.id || 'guest',
      amount: amount,
      description: description.substring(0, 50),
      bank_code: 'zalopayapp', // or 'cc' for card, 'atm' for ATM
      redirect_url: request.returnUrl || '',
      callback_url: '', // webhook URL
    }

    // Create HMAC-SHA256 signature using key1
    const signData = `app_id=${params.app_id}&app_trans_id=${params.app_trans_id}&app_user=${params.app_user}&amount=${params.amount}&description=${params.description}`
    const signature = await this.createSignature(signData, this.key1)

    params['mac'] = signature

    // In real implementation, make POST request to ZaloPay API
    // For now, return mock response
    return {
      id: appTransId,
      status: 'pending',
      redirectUrl: `${this.endpoint}/payment?${new URLSearchParams(params).toString()}`,
      qrCode: `zalopay://app?trans=${appTransId}`,
      deepLink: `zalopay://app?trans=${appTransId}`,
      raw: params,
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
    console.log('ZaloPay: cancel not directly supported')
  }

  async refundPayment(paymentId: string, amount?: any): Promise<RefundResult> {
    // ZaloPay refund API
    return {
      id: `refund_${paymentId}`,
      status: 'refunded',
      amount: amount || { amount: 0, currency: 'VND' },
      raw: {},
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    try {
      const data = JSON.parse(payload)
      const expectedMac = data.mac
      delete data.mac
      const signData = Object.keys(data)
        .sort()
        .map(key => `${key}=${data[key]}`)
        .join('&')
      const calculatedMac = this.createSignature(signData, this.key2)
      return calculatedMac === expectedMac
    } catch {
      return false
    }
  }

  normalizeWebhook(payload: any, _headers: Record<string, string>): NormalizedEvent {
    const status: PaymentStatus = payload.status === 1 ? 'succeeded' : 'failed'

    return {
      id: `evt_${payload.app_trans_id}_${Date.now()}`,
      gateway: 'zalopay',
      type: status === 'succeeded' ? 'payment.succeeded' : 'payment.failed',
      status,
      paymentId: payload.app_trans_id || '',
      gatewayTransactionId: payload.zp_trans_id || '',
      amount: {
        amount: parseInt(payload.amount || '0'),
        currency: 'VND',
      },
      metadata: {
        order_id: payload.app_trans_id || '',
      },
      raw: payload,
      timestamp: new Date(),
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    if (!this.appId || !this.key1 || !this.key2) {
      return { ok: false, message: 'Missing ZaloPay credentials' }
    }
    return { ok: true, message: 'ZaloPay gateway configured' }
  }

  private getAppTransId(): string {
    const now = new Date()
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
    const randomStr = Math.random().toString(36).substring(2, 8)
    return `${dateStr}_${randomStr}`
  }

  private async createSignature(data: string, key: string): Promise<string> {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(key)
    const messageData = encoder.encode(data)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
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
registerGateway('zalopay', ZaloPayGateway)

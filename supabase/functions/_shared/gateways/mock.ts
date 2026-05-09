// Mock Gateway Adapter
// Implements PaymentGateway interface for development/testing
// No real API calls - returns fake success/failure for testing

import type {
  PaymentGateway,
  GatewayKeys,
  CreatePaymentRequest,
  CreatePaymentResponse,
  NormalizedEvent,
  RefundResult,
  Money,
  PaymentStatus,
} from '../payment-gateway.ts'

export class MockGateway implements PaymentGateway {
  readonly name = 'mock' as const
  readonly displayName = 'Mock (Development)'
  readonly capabilities = {
    supportsRefund: true,
    supportsPartialRefund: true,
    supportsPayout: false,
    supportedCurrencies: ['VND', 'USD'],
    paymentMethods: ['mock'],
  }

  private successRate = 0.9 // 90% success rate
  private delayMs = 500 // Simulate network delay

  initialize(_config: GatewayKeys): void {
    // Mock doesn't need config
    console.log('Mock Gateway initialized')
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    // Simulate network delay
    await this.delay()

    const success = Math.random() < this.successRate
    const paymentId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const status: PaymentStatus = success ? 'succeeded' : 'failed'

    return {
      id: paymentId,
      status,
      redirectUrl: success
        ? `${request.returnUrl}?status=success&payment_id=${paymentId}`
        : `${request.returnUrl}?status=failed&payment_id=${paymentId}`,
      qrCode: `mock://qr/${paymentId}`,
      raw: {
        mock: true,
        success,
        amount: request.amount,
        idempotency_key: request.idempotencyKey,
      },
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    await this.delay(200)
    return {
      id: paymentId,
      status: 'succeeded',
      gateway_payment_id: paymentId,
    }
  }

  async cancelPayment(_paymentId: string): Promise<void> {
    await this.delay(100)
    console.log('Mock: payment cancelled')
  }

  async refundPayment(paymentId: string, amount?: Money): Promise<RefundResult> {
    await this.delay(300)
    return {
      id: `refund_${paymentId}`,
      status: 'refunded',
      amount: amount || { amount: 0, currency: 'VND' },
      raw: { mock: true, refunded: true },
    }
  }

  verifyWebhook(_payload: string, _signature: string): boolean {
    // Mock always returns true for webhook verification
    return true
  }

  normalizeWebhook(payload: any, _headers: Record<string, string>): NormalizedEvent {
    const success = payload.status !== 'failed'
    return {
      id: `evt_${Date.now()}`,
      gateway: 'mock',
      type: success ? 'payment.succeeded' : 'payment.failed',
      status: success ? 'succeeded' : 'failed',
      paymentId: payload.payment_id || '',
      gatewayTransactionId: payload.transaction_id || '',
      amount: payload.amount || { amount: 0, currency: 'VND' },
      metadata: payload.metadata || {},
      raw: payload,
      timestamp: new Date(),
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    return { ok: true, message: 'Mock gateway is always healthy' }
  }

  // Helper to simulate delay
  private delay(ms?: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms || this.delayMs))
  }
}

// Register with gateway registry
import { registerGateway } from '../payment-gateway.ts'
registerGateway('mock', MockGateway)

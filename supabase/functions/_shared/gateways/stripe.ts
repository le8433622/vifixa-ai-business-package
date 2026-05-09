// Stripe Gateway Adapter
// Implements PaymentGateway interface for Stripe (global payments)

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

export class StripeGateway implements PaymentGateway {
  readonly name = 'stripe' as const
  readonly displayName = 'Stripe'
  readonly capabilities = {
    supportsRefund: true,
    supportsPartialRefund: true,
    supportsPayout: true,
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    paymentMethods: ['card', 'sepa', 'ideal', 'bancontact'],
  }

  private publishableKey = ''
  private secretKey = ''
  private endpoint = 'https://api.stripe.com/v1'

  initialize(config: GatewayKeys): void {
    this.publishableKey = config.publishable_key || ''
    this.secretKey = config.secret_key || ''
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    // Stripe Payment Intents API
    const amountInCents = request.amount.currency === 'USD'
      ? request.amount.amount
      : request.amount.amount * 100 // Convert to cents

    // In real implementation, make POST to /v1/payment_intents
    // For now, return mock response
    const paymentIntentId = `pi_${Date.now()}`

    return {
      id: paymentIntentId,
      status: 'requires_payment_method',
      redirectUrl: undefined, // Stripe uses client-side confirmation
      raw: {
        id: paymentIntentId,
        amount: amountInCents,
        currency: request.amount.currency.toLowerCase(),
        status: 'requires_payment_method',
        client_secret: `${paymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`,
      },
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    // GET /v1/payment_intents/:id
    return {
      id: paymentId,
      status: 'pending',
      gateway_payment_id: paymentId,
    }
  }

  async cancelPayment(paymentId: string): Promise<void> {
    // POST /v1/payment_intents/:id/cancel
    console.log('Stripe: cancel payment', paymentId)
  }

  async refundPayment(paymentId: string, amount?: Money): Promise<RefundResult> {
    // POST /v1/refunds
    return {
      id: `re_${Date.now()}`,
      status: 'refunded',
      amount: amount || { amount: 0, currency: 'USD' },
      raw: {},
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    // Verify Stripe-Signature header
    // v1: t=...,v1=...
    // Use Stripe webhook secret to verify
    try {
      const sig = signature.replace('t=', '').split(',')[0]
      // Real implementation: Stripe.webhooks.constructEvent
      return true
    } catch {
      return false
    }
  }

  normalizeWebhook(payload: any, headers: Record<string, string>): NormalizedEvent {
    const eventType = payload.type
    const object = payload.data?.object

    let status: PaymentStatus = 'pending'
    if (eventType === 'payment_intent.succeeded') status = 'succeeded'
    if (eventType === 'payment_intent.payment_failed') status = 'failed'
    if (eventType === 'charge.refunded') status = 'refunded'

    return {
      id: `evt_${payload.id}_${Date.now()}`,
      gateway: 'stripe',
      type: eventType as any,
      status,
      paymentId: object?.id || '',
      gatewayTransactionId: object?.charge || '',
      amount: {
        amount: object?.amount || 0,
        currency: object?.currency?.toUpperCase() || 'USD',
      },
      metadata: object?.metadata || {},
      raw: payload,
      timestamp: new Date(payload.created * 1000),
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    if (!this.publishableKey || !this.secretKey) {
      return { ok: false, message: 'Missing Stripe API keys' }
    }
    // In real implementation, make test API call
    return { ok: true, message: 'Stripe gateway configured' }
  }
}

// Register with gateway registry
import { registerGateway } from '../payment-gateway.ts'
registerGateway('stripe', StripeGateway)

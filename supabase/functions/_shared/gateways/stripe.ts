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

  private isSandbox = false

  initialize(config: GatewayKeys): void {
    this.publishableKey = config.publishable_key || ''
    this.secretKey = config.secret_key || ''
    this.isSandbox = config.sandbox === 'true' || config.sandbox === '1'
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const amountInCents = request.amount.currency === 'USD'
      ? request.amount.amount
      : request.amount.amount * 100

    if (this.isSandbox || !this.secretKey) {
      const paymentIntentId = `pi_mock_${Date.now()}`
      return {
        id: paymentIntentId,
        status: 'requires_payment_method',
        redirectUrl: undefined,
        raw: {
          id: paymentIntentId,
          amount: amountInCents,
          currency: request.amount.currency.toLowerCase(),
          status: 'requires_payment_method',
          client_secret: `${paymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`,
          sandbox: true,
        },
      }
    }

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amountInCents.toString(),
        currency: request.amount.currency.toLowerCase(),
        description: request.description || '',
        ...(request.idempotencyKey ? { idempotency_key: request.idempotencyKey } : {}),
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(`Stripe API error: ${data.error?.message || response.statusText}`)
    }

    return {
      id: data.id,
      status: data.status,
      redirectUrl: undefined,
      raw: data,
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    // GET /v1/payment_intents/:id
    return {
      id: paymentId,
      status: 'pending',
      gateway_txn_id: paymentId,
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

  async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    try {
      const parts = signature.split(',')
      const timePart = parts.find(p => p.startsWith('t='))
      const sigPart = parts.find(p => p.startsWith('v1='))
      if (!timePart || !sigPart) return false
      const sig = sigPart.slice(3)
      const signedPayload = `${timePart.slice(2)}.${payload}`
      const encoder = new TextEncoder()
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      const key = await crypto.subtle.importKey('raw', encoder.encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const expectedBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
      const expected = Array.from(new Uint8Array(expectedBytes)).map(b => b.toString(16).padStart(2, '0')).join('')
      if (expected.length !== sig.length) return false
      const result = expected.split('').map((c, i) => c === sig[i]).every(Boolean)
      return result
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
    if (this.isSandbox) {
      return { ok: true, message: 'Stripe sandbox mode — keys present, not verified' }
    }
    try {
      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: { 'Authorization': `Bearer ${this.secretKey}` },
      })
      const data = await response.json()
      if (!response.ok) {
        return { ok: false, message: `Stripe API error: ${data.error?.message || response.statusText}` }
      }
      return { ok: true, message: 'Stripe API keys verified successfully' }
    } catch (err: any) {
      return { ok: false, message: `Stripe connection failed: ${err.message}` }
    }
  }
}

// Register with gateway registry
import { registerGateway } from '../payment-gateway.ts'
registerGateway('stripe', StripeGateway)

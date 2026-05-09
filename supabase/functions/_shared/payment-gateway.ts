// Payment Gateway Abstraction Layer - Core Interface
// Per Step 3: Payment Gateway Settings
// Inspired by Stripe API, Adyen unified API, PayStack plugin pattern

// ========== CORE TYPES ==========
export type GatewayName = 'vnpay' | 'momo' | 'zalopay' | 'stripe' | 'mock'

export interface Money {
  amount: number       // smallest unit (VND: 1000 = 1000, USD: cents)
  currency: string     // ISO 4217: 'VND', 'USD'
}

export type PaymentStatus =
  | 'pending'
  | 'requires_payment_method'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded'

export interface GatewayConfig {
  name: GatewayName
  displayName: string
  active: boolean
  sandbox: boolean             // toggle test/live
  sandboxKeys: GatewayKeys
  liveKeys: GatewayKeys
  priority: number             // lower = higher priority
  supportedCurrencies: string[]
  supportedMethods: string[]    // ['qr', 'bank_transfer', 'card', 'wallet']
}

export interface GatewayKeys {
  // Each gateway has its own key structure
  [key: string]: string
}

// ========== CAPABILITIES ==========
export interface GatewayCapabilities {
  supportsRefund: boolean
  supportsPartialRefund: boolean
  supportsPayout: boolean
  supportedCurrencies: string[]
  paymentMethods: string[]
}

// ========== API INTERFACES ==========
export interface CreatePaymentRequest {
  amount: Money
  idempotencyKey: string
  description?: string
  returnUrl?: string
  cancelUrl?: string
  customer?: {
    id: string
    email?: string
    phone?: string
  }
  metadata?: Record<string, string>  // { order_id, user_id }
}

export interface CreatePaymentResponse {
  id: string                 // Gateway's payment ID
  status: PaymentStatus
  redirectUrl?: string       // URL to redirect user to gateway
  qrCode?: string            // QR code data (for QR payment)
  deepLink?: string          // Mobile app deep link (MoMo)
  raw: any                    // Full response from gateway (debug)
}

export interface NormalizedEvent {
  id: string
  gateway: GatewayName
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded'
  status: PaymentStatus
  paymentId: string
  gatewayTransactionId: string
  amount: Money
  metadata: Record<string, string>
  raw: any
  timestamp: Date
}

export interface RefundResult {
  id: string
  status: PaymentStatus
  amount: Money
  raw: any
}

// ========== GATEWAY INTERFACE ==========
export interface PaymentGateway {
  readonly name: GatewayName
  readonly displayName: string
  readonly capabilities: GatewayCapabilities

  // Initialize with config (called when admin activates)
  initialize(config: GatewayKeys): void

  // Core payment lifecycle
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>
  getPaymentStatus(paymentId: string): Promise<CreatePaymentResponse>
  cancelPayment(paymentId: string): Promise<void>
  refundPayment(paymentId: string, amount?: Money): Promise<RefundResult>

  // Webhook handling
  verifyWebhook(payload: string, signature: string): boolean
  normalizeWebhook(payload: any, headers: Record<string, string>): NormalizedEvent

  // Health check (for admin monitoring)
  healthCheck(): Promise<{ ok: boolean; message?: string }>
}

// ========== GATEWAY REGISTRY (Plugin Pattern) ==========
const registry = new Map<GatewayName, new () => PaymentGateway>()

export function registerGateway(name: GatewayName, impl: new () => PaymentGateway) {
  registry.set(name, impl)
}

export function getGateway(name: GatewayName, config: GatewayConfig): PaymentGateway {
  const Ctor = registry.get(name)
  if (!Ctor) throw new Error(`Gateway ${name} not registered`)
  const instance = new Ctor()
  instance.initialize(config.sandbox ? config.sandboxKeys : config.liveKeys)
  return instance
}

export function getActiveGateways(configs: GatewayConfig[]): PaymentGateway[] {
  return configs
    .filter(c => c.active)
    .sort((a, b) => a.priority - b.priority)
    .map(c => getGateway(c.name, c))
}

export function listRegisteredGateways(): GatewayName[] {
  return Array.from(registry.keys())
}

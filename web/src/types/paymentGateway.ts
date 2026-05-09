// TypeScript types and interfaces for Payment Gateway System

// ========== Gateway Configuration ==========
export type GatewayName = 'vnpay' | 'momo' | 'zalopay' | 'stripe' | 'mock'

export interface GatewayKeys {
  [key: string]: string
}

export interface GatewayConfig {
  id?: string
  key: GatewayName
  display_name: string
  description?: string
  active: boolean
  sandbox: boolean
  sandbox_keys: GatewayKeys
  live_keys: GatewayKeys
  priority: number
  supported_currencies: string[]
  supported_methods: string[]
  webhook_url?: string
  created_at?: string
  updated_at?: string
  updated_by?: string
}

// ========== Payment Types ==========
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

export interface Money {
  amount: number    // smallest unit (VND: 1000 = 1000, USD: cents)
  currency: string  // ISO 4217: 'VND', 'USD'
}

export interface PaymentIntent {
  id: string
  gateway_payment_id: string
  gateway: GatewayName
  order_id?: string
  user_id?: string
  amount: Money
  status: PaymentStatus
  redirect_url?: string
  qr_code?: string
  deep_link?: string
  idempotency_key?: string
  gateway_response?: any
  succeeded_at?: string
  failed_at?: string
  error_message?: string
  created_at?: string
  updated_at?: string
}

// ========== Gateway Capabilities ==========
export interface GatewayCapabilities {
  supportsRefund: boolean
  supportsPartialRefund: boolean
  supportsPayout: boolean
  supportedCurrencies: string[]
  paymentMethods: string[]
}

// ========== API Requests/Responses ==========
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
  id: string
  status: PaymentStatus
  redirectUrl?: string
  qrCode?: string
  deepLink?: string
  raw: any  // Full response from gateway
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

// ========== Webhook ==========
export interface WebhookEvent {
  id: string
  gateway: GatewayName
  event_id: string
  type: string
  status?: string
  payment_intent_id?: string
  raw: any
  processed: boolean
  created_at?: string
}

// ========== Gateway Adapter Interface ==========
export interface PaymentGateway {
  readonly name: GatewayName
  readonly displayName: string
  readonly capabilities: GatewayCapabilities

  initialize(config: GatewayKeys): void
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>
  getPaymentStatus(paymentId: string): Promise<PaymentIntent>
  cancelPayment(paymentId: string): Promise<void>
  refundPayment(paymentId: string, amount?: Money): Promise<RefundResult>
  
  verifyWebhook(payload: string, signature: string): boolean
  normalizeWebhook(payload: any, headers: Record<string, string>): NormalizedEvent
  
  healthCheck(): Promise<{ ok: boolean; message?: string }>
}

// ========== Ledger / Wallet ==========
export interface LedgerEntry {
  id?: string
  transaction_id: string
  wallet_id: string
  account: string  // 'user.wallet', 'platform.fee', 'escrow'
  direction: 'debit' | 'credit'
  amount: number
  currency?: string
  balance_after?: number
  reference_type: 'payment' | 'payout' | 'fee' | 'refund'
  reference_id?: string
  description?: string
  created_at?: string
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  locked_amount: number
  currency?: string
  created_at?: string
  updated_at?: string
}

export interface Payout {
  id: string
  wallet_id: string
  user_id: string
  amount: number
  fee?: number
  bank_account?: any  // { bank_name, account_number, holder }
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  admin_id?: string
  note?: string
  completed_at?: string
  created_at?: string
}

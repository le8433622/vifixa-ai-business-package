// Shared types for Edge Functions
// Reduces `any` usage by providing typed interfaces for common patterns

// === Agent OS ===
export interface AgentPlan {
  goal: string
  steps: AgentStep[]
  estimated_cost?: number
  risk_level?: 'low' | 'medium' | 'high'
}

export interface AgentStep {
  action: string
  params: Record<string, unknown>
  expected_outcome: string
  requires_approval: boolean
}

export interface AgentApproval {
  id: string
  run_id: string
  step_id: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  approved_at?: string
  rejected_at?: string
}

export interface AgentRun {
  id: string
  user_id: string
  goal_id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at?: string
}

// === Wallet / Payment ===
export interface Money {
  amount: number
  currency: 'VND' | 'USD' | 'THB' | 'IDR'
}

export interface LedgerEntry {
  id: string
  wallet_id: string
  amount: number
  currency: string
  entry_type: 'credit' | 'debit'
  reference_type: string
  reference_id: string
  description: string
  created_at: string
}

export interface WalletTransaction {
  id: string
  wallet_id: string
  amount: number
  currency: string
  txn_type: 'payment' | 'refund' | 'payout' | 'commission' | 'deposit' | 'withdrawal'
  status: 'pending' | 'completed' | 'failed'
  reference_id?: string
  created_at: string
}

// === User / Profile ===
export interface UserProfile {
  id: string
  full_name: string
  phone: string
  email: string
  role: 'customer' | 'worker' | 'admin'
  avatar_url?: string
  is_active: boolean
  created_at: string
}

export interface WorkerProfile extends UserProfile {
  skills: string[]
  rating_avg: number
  trust_score: number
  is_verified: boolean
  is_online: boolean
  location_lat?: number
  location_lng?: number
  completed_jobs: number
}

// === Order ===
export interface Order {
  id: string
  customer_id: string
  worker_id?: string
  service_type: string
  category?: string
  status: 'pending' | 'diagnosed' | 'quoted' | 'in_progress' | 'completed' | 'cancelled'
  estimated_price?: number
  final_price?: number
  currency: string
  location_lat?: number
  location_lng?: number
  description?: string
  created_at: string
  completed_at?: string
}

// === Service Area ===
export interface ServiceArea {
  id: string
  worker_id: string
  geometry?: Record<string, unknown>
  center_lat: number
  center_lng: number
  radius_km: number
  is_active: boolean
  name?: string
}

// === Service Registry ===
export interface ServiceDefinition {
  id: string
  name: string
  description: string
  typicalPricing: {
    min: number
    max: number
    currency: 'VND' | 'USD'
  }
  estimatedDuration: string
  requiredSkills: string[]
  category: string
}

// === Behavior Analytics ===
export interface UserBehavior {
  user_id: string
  action: string
  timestamp: string
  metadata?: Record<string, unknown>
  session_id?: string
}

export interface BehaviorPattern {
  pattern_type: string
  frequency: number
  confidence: number
  detected_at: string
  metadata?: Record<string, unknown>
}

// === Companion ===
export interface CompanionMemory {
  key: string
  value: string
  category: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface CompanionMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  actions?: unknown[]
  plan_preview?: AgentPlan
  created_at: string
}

// === Pagination ===
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

// === Response wrapper ===
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

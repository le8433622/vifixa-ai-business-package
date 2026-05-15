// 🏛️ Vifixa Wallet Core — Multi-Ledger Dynamic Wallet Engine
// Layer 2: Atomic Transaction Engine + Escrow + Auto-Split

import { logVifixa } from './logger.ts'

export type WalletType = 'txn' | 'stake' | 'reward' | 'treasury'

export interface WalletBalance {
  txn: number
  stake: number
  reward: number
  treasury: number
}

// ─── CONSTANTS ──────────────────────────────────────────────

export const DEFAULT_FEE_RATE = 0.03  // 3% platform fee
export const VFC_TO_VND_RATE = 0.01   // 1 VFC = 0.01 VND (100 VFC = 1 VND)
export const STAKE_BASE_RATE = 0.05   // 5% base APY
export const GATEWAY_FEE_RATE = 0.02  // 2% nạp/rút

// ─── MONEY MATH (prevent floating point issues) ─────────────

export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

export function calculateFee(amount: number, rate: number = DEFAULT_FEE_RATE): number {
  return fromCents(Math.round(toCents(amount) * rate))
}

// ─── INTEREST CALCULATION ─────────────────────────────────

export function calculateStakingInterest(
  amount: number,
  rate: number,
  daysStaked: number,
): number {
  // Simple interest: principal × rate × (days/365)
  return fromCents(Math.round(toCents(amount) * rate * daysStaked / 365))
}

export function dynamicInterestRate(
  totalSystemStaked: number,
  userTrustScore: number,
  stakeDays: number,
): number {
  let rate = STAKE_BASE_RATE
  
  // More total stake → lower rate (supply/demand)
  if (totalSystemStaked > 1_000_000_000) rate -= 0.01
  else if (totalSystemStaked > 500_000_000) rate -= 0.005
  
  // Higher trust → higher rate
  rate += (userTrustScore - 0.5) * 0.02
  
  // Longer stake → higher rate
  if (stakeDays >= 365) rate += 0.02
  else if (stakeDays >= 180) rate += 0.01
  else if (stakeDays >= 90) rate += 0.005
  
  return Math.max(0.01, Math.min(0.12, rate)) // Clamp 1%-12%
}

// ─── TIER CALCULATION ────────────────────────────────────

export function calculateTier(totalVfcEarned: number): {
  tier: string
  multiplier: number
  nextTierAt: number
} {
  if (totalVfcEarned >= 1_000_000) return { tier: 'diamond', multiplier: 3.0, nextTierAt: 0 }
  if (totalVfcEarned >= 500_000) return { tier: 'gold', multiplier: 2.0, nextTierAt: 1_000_000 }
  if (totalVfcEarned >= 100_000) return { tier: 'silver', multiplier: 1.5, nextTierAt: 500_000 }
  return { tier: 'bronze', multiplier: 1.0, nextTierAt: 100_000 }
}

// ─── TRANSACTION VALIDATION ───────────────────────────────

export interface TransferRequest {
  fromUserId: string
  toUserId: string
  amount: number
  walletType: WalletType
  description?: string
  refType?: string
  refId?: string
}

export interface SplitRequest {
  totalAmount: number
  customerId: string
  workerId: string
  orderId: string
  feeRate?: number
}

export interface SplitResult {
  workerPayout: number
  platformFee: number
  rewardPoints: number
  treasuryAmount: number
}

export function calculateSplit(request: SplitRequest): SplitResult {
  const feeRate = request.feeRate ?? DEFAULT_FEE_RATE
  const amount = request.totalAmount
  
  const platformFee = calculateFee(amount, feeRate)
  const workerPayout = amount - platformFee
  const rewardPoints = Math.round(amount * 0.01)  // 1% as VFC points
  const treasuryAmount = platformFee * 0.2  // 20% of fee → treasury reserve
  
  return { workerPayout, platformFee, rewardPoints, treasuryAmount }
}

// ─── ESCROW LOGIC ─────────────────────────────────────────

export function canReleaseEscrow(
  orderStatus: string,
  mapVerified: boolean,
  customerConfirmed: boolean,
): { allowed: boolean; reason: string } {
  if (orderStatus !== 'completed') return { allowed: false, reason: 'Order not completed' }
  if (!mapVerified) return { allowed: false, reason: 'Worker location not verified' }
  if (!customerConfirmed) return { allowed: false, reason: 'Customer has not confirmed' }
  return { allowed: true, reason: 'All conditions met' }
}

// ─── DYNAMIC PRICING ──────────────────────────────────────

export interface PricingFactors {
  basePrice: number
  demandMultiplier: number  // 1.0 = normal, 1.5 = high demand
  distanceKm: number
  workerTrustScore: number
  customerTier: string
  timeOfDay: number  // 0-24
  isWeekend: boolean
  customerStakeBalance: number
}

export function calculateDynamicPrice(factors: PricingFactors): {
  finalPrice: number
  breakdown: Array<{ item: string; amount: number; note: string }>
} {
  const breakdown: Array<{ item: string; amount: number; note: string }> = []
  
  // Base
  let price = factors.basePrice
  breakdown.push({ item: 'Giá cơ bản', amount: price, note: 'Theo bảng giá niêm yết' })
  
  // Demand surge
  if (factors.demandMultiplier > 1.0) {
    const surge = calculateFee(price, factors.demandMultiplier - 1)
    price += surge
    breakdown.push({ item: 'Phí cao điểm', amount: surge, note: `x${factors.demandMultiplier.toFixed(1)} nhu cầu` })
  }
  
  // Distance
  if (factors.distanceKm > 5) {
    const distFee = calculateFee(factors.basePrice, factors.distanceKm * 0.002)
    price += distFee
    breakdown.push({ item: 'Phí khoảng cách', amount: distFee, note: `${factors.distanceKm.toFixed(1)}km` })
  }
  
  // Customer stake discount
  if (factors.customerStakeBalance > 0) {
    const discount = calculateFee(price, Math.min(factors.customerStakeBalance / 10_000_000, 0.1))
    price -= discount
    breakdown.push({ item: 'Giảm giá Stake', amount: -discount, note: `Số dư stake ${factors.customerStakeBalance.toLocaleString()}₫` })
  }
  
  // Tier discount
  if (factors.customerTier === 'gold') {
    const discount = calculateFee(price, 0.05)
    price -= discount
    breakdown.push({ item: 'Giảm hạng Vàng', amount: -discount, note: 'Gold member discount 5%' })
  } else if (factors.customerTier === 'diamond') {
    const discount = calculateFee(price, 0.1)
    price -= discount
    breakdown.push({ item: 'Giảm hạng Kim cương', amount: -discount, note: 'Diamond member discount 10%' })
  }
  
  return { finalPrice: Math.max(price, 10000), breakdown }
}

// ─── LOGGING ──────────────────────────────────────────────

export function logTransaction(
  action: string,
  data: Record<string, unknown>,
) {
  logVifixa('wallet', action, data)
}

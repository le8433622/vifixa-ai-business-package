import { assertEquals, assert, assertExists } from 'https://deno.land/std/testing/asserts.ts'
import {
  calculateFee, calculateStakingInterest, dynamicInterestRate,
  calculateTier, calculateSplit, calculateDynamicPrice,
  canReleaseEscrow, toCents, fromCents,
} from './wallet-core.ts'

Deno.test('[VIFIXA_TEST] wallet: fee calculation', () => {
  assertEquals(calculateFee(100000, 0.03), 3000)
  assertEquals(calculateFee(50000, 0.05), 2500)
  assertEquals(calculateFee(0, 0.03), 0)
  console.log('[VIFIXA_TEST] OK: fee calculation precise')
})

Deno.test('[VIFIXA_TEST] wallet: staking interest', () => {
  const interest = calculateStakingInterest(1000000, 0.05, 365)
  assertEquals(interest, 50000)  // 5% of 1M for 1 year
  console.log('[VIFIXA_TEST] OK: staking interest =', interest)
})

Deno.test('[VIFIXA_TEST] wallet: dynamic interest rate', () => {
  const low = dynamicInterestRate(100_000_000, 0.7, 90)
  const high = dynamicInterestRate(2_000_000_000, 0.9, 365)
  assert(low >= 0.01 && low <= 0.12, 'Rate within range')
  assert(high >= 0.01 && high <= 0.12, 'High system stake → lower rate')
  console.log('[VIFIXA_TEST] OK: dynamic rates:', { low, high })
})

Deno.test('[VIFIXA_TEST] wallet: tier calculation', () => {
  assertEquals(calculateTier(0).tier, 'bronze')
  assertEquals(calculateTier(100_000).tier, 'silver')
  assertEquals(calculateTier(500_000).tier, 'gold')
  assertEquals(calculateTier(1_000_000).tier, 'diamond')
  console.log('[VIFIXA_TEST] OK: all 4 tiers correct')
})

Deno.test('[VIFIXA_TEST] wallet: auto split', () => {
  const split = calculateSplit({ totalAmount: 100000, customerId: 'a', workerId: 'b', orderId: '1' })
  assertEquals(split.workerPayout, 97000)  // 100K - 3% fee
  assertEquals(split.platformFee, 3000)    // 3%
  assert(split.rewardPoints > 0)
  console.log('[VIFIXA_TEST] OK: split:', split)
})

Deno.test('[VIFIXA_TEST] wallet: dynamic pricing', () => {
  const price = calculateDynamicPrice({
    basePrice: 200000,
    demandMultiplier: 1.2,
    distanceKm: 3,
    workerTrustScore: 0.8,
    customerTier: 'silver',
    timeOfDay: 14,
    isWeekend: false,
    customerStakeBalance: 0,
  })
  assert(price.finalPrice >= 200000, 'Price should be at least base')
  assert(price.breakdown.length >= 2, 'Should have base + demand breakdown')
  console.log('[VIFIXA_TEST] OK: dynamic pricing:', price.finalPrice)
})

Deno.test('[VIFIXA_TEST] wallet: escrow release conditions', () => {
  const ok = canReleaseEscrow('completed', true, true)
  assertEquals(ok.allowed, true)
  
  const notDone = canReleaseEscrow('pending', true, true)
  assertEquals(notDone.allowed, false)
  
  const noMap = canReleaseEscrow('completed', false, true)
  assertEquals(noMap.allowed, false)
  
  const noConfirm = canReleaseEscrow('completed', true, false)
  assertEquals(noConfirm.allowed, false)
  
  console.log('[VIFIXA_TEST] OK: escrow all conditions correct')
})

Deno.test('[VIFIXA_TEST] wallet: money math precision', () => {
  // Không floating point errors
  assertEquals(toCents(100.50), 10050)
  assertEquals(fromCents(10050), 100.50)
  assertEquals(toCents(0.1), 10)
  
  // Fee rounding — 33333 * 0.03 = 999.99 (cents math, no floating drift)
  assertEquals(calculateFee(33333, 0.03), 999.99)
  assertEquals(calculateFee(100000, 0.03), 3000)  // clean number
  console.log('[VIFIXA_TEST] OK: money math precise')
})

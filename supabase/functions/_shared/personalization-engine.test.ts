import { assertEquals, assertExists, assert } from 'https://deno.land/std/testing/asserts.ts'
import { buildPersonalizedPrompt, getPersonalizedWelcome, type UserData } from './personalization-engine.ts'

const sampleUser: UserData = {
  userId: 'test-1',
  persona: 'customer',
  name: 'Nguyễn Văn A',
  email: 'a@test.com',
  companionProfile: {
    tone: 'Ấm áp',
    formality: 0.3,
    empathy_level: 0.8,
    autonomy_level: 0.7,
  },
  memories: [
    { key: 'device_ac', value: 'Máy lạnh Daikin 2023', category: 'device', importance: 5 },
    { key: 'last_service', value: 'Sửa máy lạnh tháng 3', category: 'order', importance: 3 },
  ],
  devices: [
    { device_type: 'air_conditioning', brand: 'Daikin', model: 'FT25', purchase_date: '2023-01-15' },
  ],
  currentTime: new Date().toISOString(),
}

function assertIncludes(actual: string, expected: string, msg?: string) {
  if (!actual.includes(expected)) {
    throw new Error(msg || `Expected to include "${expected}". Actual starts: "${actual.slice(0, 150)}..."`)
  }
}

Deno.test('[VIFIXA_TEST] personalization: buildPersonalizedPrompt includes user name', () => {
  const prompt = buildPersonalizedPrompt('chat', sampleUser)
  // Name appears as: "Bạn đang nói chuyện với Nguyễn Văn A"
  assertIncludes(prompt, 'Nguyễn Văn A')
  assertIncludes(prompt, 'AI CÁ NHÂN')
  assertIncludes(prompt, 'Từ bi')
  console.log('[VIFIXA_TEST] OK: buildPersonalizedPrompt personalizes with user name')
})

Deno.test('[VIFIXA_TEST] personalization: buildPersonalizedPrompt adapts for worker', () => {
  const workerUser: UserData = {
    ...sampleUser,
    persona: 'worker',
    name: 'Trần Văn B',
    skills: [{ name: 'Máy lạnh', level: '5' }],
    earnings: { today: 200000, week: 1200000, month: 5000000 },
  }
  const prompt = buildPersonalizedPrompt('chat', workerUser)
  assertIncludes(prompt, 'Trần Văn B')
  assertIncludes(prompt, 'Máy lạnh')
  console.log('[VIFIXA_TEST] OK: Worker personalization includes skills')
})

Deno.test('[VIFIXA_TEST] personalization: getPersonalizedWelcome for first-time user', () => {
  const newUser: UserData = {
    userId: 'new-user',
    persona: 'customer',
    name: 'Khách mới',
    memories: [],
    devices: [],
    orders: [],
  }
  const welcome = getPersonalizedWelcome(newUser)
  assertIncludes(welcome, 'Khách mới')
  assertIncludes(welcome, 'Rất vui')
  // First-time check: welcome should mention starting out
  assert(welcome.includes('bắt đầu') || welcome.includes('đầu tiên'), 'Should welcome first-time user')
  console.log('[VIFIXA_TEST] OK: First-time user gets personalized welcome')
})

Deno.test('[VIFIXA_TEST] personalization: getPersonalizedWelcome for returning user', () => {
  const returningUser: UserData = {
    ...sampleUser,
    orders: [
      { id: 'o1', category: 'Máy lạnh', status: 'completed', created_at: new Date().toISOString(), estimated_price: 450000 },
    ],
    lastSessionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  }
  const welcome = getPersonalizedWelcome(returningUser)
  assertIncludes(welcome, 'Nguyễn Văn A')
  // Should mention last service
  const mentionsLastService = welcome.includes('Máy lạnh') || welcome.includes('đặt dịch vụ')
  assert(mentionsLastService, 'Should reference past service: ' + welcome.slice(0, 200))
  console.log('[VIFIXA_TEST] OK: Returning user gets context-aware welcome')
})

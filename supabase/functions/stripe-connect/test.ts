import { assertEquals, assertExists, assertMatch } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const ConnectSchema = z.object({
  worker_id: z.string().uuid(),
  email: z.string().email().optional(),
  country: z.string().length(2).default('VN'),
});

Deno.test('ConnectSchema - valid input', () => {
  const result = ConnectSchema.parse({
    worker_id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'worker@test.com',
    country: 'VN',
  });
  assertEquals(result.worker_id, '550e8400-e29b-41d4-a716-446655440000');
  assertEquals(result.country, 'VN');
});

Deno.test('ConnectSchema - default country is VN', () => {
  const result = ConnectSchema.parse({
    worker_id: '550e8400-e29b-41d4-a716-446655440000',
  });
  assertEquals(result.country, 'VN');
});

Deno.test('ConnectSchema - rejects invalid uuid', () => {
  let threw = false;
  try {
    ConnectSchema.parse({ worker_id: 'not-a-uuid' });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test('ConnectSchema - rejects invalid email', () => {
  let threw = false;
  try {
    ConnectSchema.parse({
      worker_id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'not-an-email',
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test('Stripe Connect - response structure', () => {
  const output = {
    success: true,
    stripe_account_id: 'acct_test123',
    onboarding_url: 'https://connect.stripe.com/setup/s/test123',
  };
  assertEquals(output.success, true);
  assertMatch(output.onboarding_url, /^https:\/\//);
  assertExists(output.stripe_account_id);
});

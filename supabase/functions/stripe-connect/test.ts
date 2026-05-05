// Test: Stripe Connect Edge Function
// Per Step 8: Testing & Validation

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { handler } from './index.ts';

Deno.test('Stripe Connect - creates account for new worker', async () => {
  const req = new Request('http://localhost:8000', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      worker_id: 'test-worker-id',
      email: 'worker@test.com',
      country: 'US',
    }),
  });

  const res = await handler(req);
  const data = await res.json();

  assertEquals(res.status, 200);
  assertEquals(data.success, true);
  assertEquals(typeof data.stripe_account_id, 'string');
  assertEquals(typeof data.onboarding_url, 'string');
});

Deno.test('Stripe Connect - missing fields returns error', async () => {
  const req = new Request('http://localhost:8000', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const res = await handler(req);
  const data = await res.json();

  assertEquals(res.status, 400);
  assertEquals(data.error, 'Missing required fields: worker_id, email');
});

// Test: Fraud Check Edge Function
// Per Step 8: Testing & Validation

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { handler } from './index.ts';

Deno.test('Fraud Check - detects multiple disputes', async () => {
  const req = new Request('http://localhost:8000', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: 'test-user-with-disputes',
      check_type: 'suspicious_activity',
    }),
  });

  const res = await handler(req);
  const data = await res.json();

  assertEquals(res.status, 200);
  assertEquals(data.success, true);
  assertEquals(Array.isArray(data.alerts), true);
  assertEquals(typeof data.risk_score, 'number');
});

Deno.test('Fraud Check - price change detection', async () => {
  const req = new Request('http://localhost:8000', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      order_id: 'test-order-id',
      check_type: 'price_change',
    }),
  });

  const res = await handler(req);
  const data = await res.json();

  assertEquals(res.status, 200);
  assertEquals(data.success, true);
});

// Test: AI Diagnosis Edge Function
// Per Step 8: Testing & Validation

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { handler } from './index.ts';

Deno.test('AI Diagnosis - valid request returns diagnosis', async () => {
  const req = new Request('http://localhost:8000', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: 'Leaking pipe under kitchen sink',
      category: 'plumbing',
    }),
  });

  const res = await handler(req);
  const data = await res.json();

  assertEquals(res.status, 200);
  assertEquals(data.success, true);
  assertEquals(typeof data.diagnosis, 'string');
  assertEquals(typeof data.confidence, 'number');
  assertEquals(Array.isArray(data.suggested_parts), true);
});

Deno.test('AI Diagnosis - missing description returns error', async () => {
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
  assertEquals(data.error, 'Missing required fields: description, category');
});

Deno.test('AI Diagnosis - missing auth returns 401', async () => {
  const req = new Request('http://localhost:8000', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: 'test',
      category: 'plumbing',
    }),
  });

  const res = await handler(req);
  assertEquals(res.status, 401);
});

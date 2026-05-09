import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActions } from './action-builder.ts';
import { buildChatEventRows, deriveChatEventTypes } from './event-service.ts';
import { evaluateAutonomy } from './autonomy-service.ts';
import { goldenCases } from './golden-cases.ts';
import { validateOrderCreationContext } from './order-service.ts';
import { buildReply } from './reply-builder.ts';
import { extractSlots } from './slot-extractor.ts';
import { chooseState, getMissingSlots } from './state-machine.ts';
import type { ChatContext } from './types.ts';

function runCase(message: string, context: Partial<ChatContext> = {}) {
  const slots = extractSlots(message, context);
  const missingSlots = getMissingSlots(slots);
  const state = chooseState(slots, missingSlots);
  const actions = buildActions(state, missingSlots, slots);
  const reply = buildReply(state, missingSlots, slots);
  return { slots, missingSlots, state, actions, reply };
}

test('golden chat closing cases', async (t) => {
  for (const testCase of goldenCases) {
    await t.test(testCase.name, () => {
      const result = runCase(testCase.message, testCase.context);
      const expected = testCase.expected;

      if (expected.category) assert.equal(result.slots.category, expected.category);
      if (expected.urgency) assert.equal(result.slots.urgency, expected.urgency);
      if (expected.intent) assert.equal(result.slots.intent, expected.intent);
      if (expected.customer_confirmation !== undefined) {
        assert.equal(result.slots.customer_confirmation, expected.customer_confirmation);
      }
      if (expected.state) assert.equal(result.state, expected.state);

      for (const missingSlot of expected.missingIncludes || []) {
        assert.ok(result.missingSlots.includes(missingSlot), `Expected missing slot ${missingSlot}`);
      }
      for (const missingSlot of expected.missingExcludes || []) {
        assert.ok(!result.missingSlots.includes(missingSlot), `Did not expect missing slot ${missingSlot}`);
      }
      for (const actionType of expected.actionTypes || []) {
        assert.ok(result.actions.some(action => action.type === actionType), `Expected action ${actionType}`);
      }
      for (const riskFlag of expected.riskFlags || []) {
        assert.ok(result.slots.risk_flags?.includes(riskFlag), `Expected risk flag ${riskFlag}`);
      }
    });
  }
});

test('order validation rejects missing required slots', () => {
  assert.throws(
    () => validateOrderCreationContext({ category: 'air_conditioning', description: 'Máy lạnh không mát' }),
    /Missing required slots: location, urgency, preferred_time, customer_confirmation/,
  );
});

test('order validation accepts complete confirmed context', () => {
  assert.doesNotThrow(() => validateOrderCreationContext({
    category: 'air_conditioning',
    description: 'Máy lạnh không mát',
    location: { lat: 10.77, lng: 106.69 },
    urgency: 'high',
    preferred_time: 'chiều nay',
    customer_confirmation: true,
  }));
});

test('handoff actions return view_order only when order exists', () => {
  const actions = buildActions('handoff', [], { customer_confirmation: true }, 'order-123');
  assert.deepEqual(actions, [{ type: 'view_order', label: 'Xem đơn hàng', value: 'order-123' }]);
});


test('chat event derivation logs funnel events without raw PII', () => {
  const events = deriveChatEventTypes({
    isNewSession: true,
    state: 'confirmation',
    intent: 'quote',
    missingSlots: ['customer_confirmation'],
    context: {
      category: 'air_conditioning',
      quote: { estimated_price: 450000 },
      conversion_stage: 'quoted',
      confidence: 0.82,
    },
  });

  assert.deepEqual(events, ['chat_started', 'quote_shown', 'confirmation_shown']);

  const rows = buildChatEventRows({
    isNewSession: true,
    requestId: 'req-1',
    userId: 'user-1',
    sessionId: 'session-1',
    state: 'confirmation',
    intent: 'quote',
    missingSlots: ['customer_confirmation'],
    context: {
      category: 'air_conditioning',
      quote: { estimated_price: 450000 },
      conversion_stage: 'quoted',
      confidence: 0.82,
    },
  });

  assert.equal(rows.length, 3);
  assert.equal(rows[0].session_id, 'session-1');
  assert.equal(rows[0].user_id, 'user-1');
  assert.equal(rows[0].metadata.request_id, 'req-1');
  assert.equal(rows[0].metadata.category, 'air_conditioning');
  assert.ok(!('message' in rows[0].metadata));
});

test('chat event derivation logs order_created for handoff orders', () => {
  const events = deriveChatEventTypes({
    isNewSession: false,
    state: 'handoff',
    intent: 'confirm',
    missingSlots: [],
    orderId: 'order-1',
    context: { conversion_stage: 'order_created' },
  });

  assert.deepEqual(events, ['order_created']);
});


test('autonomy evaluation executes safe autonomous orders', () => {
  const evaluation = evaluateAutonomy({
    confidence: 0.82,
    quote: { estimated_price: 450000 },
    risk_flags: [],
  }, {
    mode: 'autonomous',
    min_confidence: 0.6,
    max_auto_order_value: 2000000,
    allow_safety_risk: false,
  });

  assert.equal(evaluation.decision, 'execute');
  assert.equal(evaluation.reason, 'autonomous_policy_allows_execution');
});

test('autonomy evaluation requires approval in supervised and manual modes', () => {
  for (const mode of ['supervised', 'manual'] as const) {
    const evaluation = evaluateAutonomy({ confidence: 0.9, quote: { estimated_price: 100000 } }, {
      mode,
      min_confidence: 0.6,
      max_auto_order_value: 2000000,
      allow_safety_risk: false,
    });

    assert.equal(evaluation.decision, 'requires_approval');
  }
});

test('autonomy evaluation blocks safety risk in automatic mode', () => {
  const evaluation = evaluateAutonomy({
    confidence: 0.95,
    quote: { estimated_price: 100000 },
    risk_flags: ['safety'],
  }, {
    mode: 'autonomous',
    min_confidence: 0.6,
    max_auto_order_value: 2000000,
    allow_safety_risk: false,
  });

  assert.equal(evaluation.decision, 'blocked');
  assert.equal(evaluation.reason, 'safety_risk_requires_human');
});

test('chat event derivation records confirmation click and approval request', () => {
  assert.deepEqual(deriveChatEventTypes({
    isNewSession: false,
    state: 'approval_required',
    intent: 'confirm',
    missingSlots: [],
    context: { customer_confirmation: true },
  }), ['confirmation_clicked', 'approval_requested']);
});

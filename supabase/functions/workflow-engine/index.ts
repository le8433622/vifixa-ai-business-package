import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth, jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

type EventType =
  | 'payment:succeeded'
  | 'payment:failed'
  | 'diagnosis:completed'
  | 'price:estimated'
  | 'worker:matched'
  | 'worker:accepted'
  | 'worker:declined'
  | 'worker:arrived'
  | 'job:started'
  | 'job:completed'
  | 'quality:passed'
  | 'quality:failed'
  | 'review:submitted'
  | 'order:cancelled'

interface WorkflowRequest {
  order_id: string
  event: EventType
  data?: Record<string, unknown>
}

const STATE_TRANSITIONS: Record<string, Record<string, string>> = {
  created: {
    'diagnosis:completed': 'diagnosed',
    'payment:succeeded': 'paid',
    'order:cancelled': 'cancelled',
  },
  diagnosed: {
    'price:estimated': 'priced',
    'payment:succeeded': 'paid',
    'order:cancelled': 'cancelled',
  },
  priced: {
    'payment:succeeded': 'paid',
    'order:cancelled': 'cancelled',
  },
  paid: {
    'worker:matched': 'matched',
    'order:cancelled': 'cancelled',
  },
  matched: {
    'worker:accepted': 'accepted',
    'worker:declined': 'paid',
    'order:cancelled': 'cancelled',
  },
  accepted: {
    'worker:arrived': 'in_progress',
    'order:cancelled': 'cancelled',
  },
  in_progress: {
    'job:completed': 'completing',
    'order:cancelled': 'cancelled',
  },
  completing: {
    'quality:passed': 'completed',
    'quality:failed': 'in_progress',
  },
  completed: {
    'review:submitted': 'reviewed',
  },
  reviewed: {},
  cancelled: {},
}

const STATE_ACTIONS: Record<string, string[]> = {
  paid: ['notify_worker', 'start_matching'],
  accepted: ['notify_customer_arriving', 'send_eta'],
  completing: ['run_quality_check', 'release_escrow', 'activate_warranty'],
  completed: ['calculate_trust_score', 'request_review', 'send_receipt'],
  cancelled: ['process_refund'],
}

async function executeAction(action: string, orderId: string, supabase: any, context: any): Promise<void> {
  switch (action) {
    case 'notify_worker': {
      const { data: order } = await supabase.from('orders').select('*, customer:customer_id(*)').eq('id', orderId).single()
      const workerNotifyUrl = `${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/notify`
      fetch(workerNotifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          type: 'new_job',
          order_id: orderId,
          category: order?.category,
          description: order?.description?.substring(0, 100),
          customer_name: order?.customer?.full_name,
        }),
      }).catch(e => console.error('[workflow] notify_worker failed', e))
      break
    }
    case 'start_matching': {
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
      if (order) {
        fetch(`${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/ai-auto-executor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ action: 'auto_match', data: { order_id: orderId, category: order.category, customer_lat: order.location_lat, customer_lng: order.location_lng } }),
        }).catch(e => console.error('[workflow] start_matching failed', e))
      }
      break
    }
    case 'notify_customer_arriving': {
      const { data: order } = await supabase.from('orders').select('customer_id').eq('id', orderId).single()
      if (order) {
        const { data: worker } = await supabase.from('workers').select('*, profiles:worker_id(full_name)').eq('id', context?.worker_id).single()
        fetch(`${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({
            type: 'worker_arriving',
            user_id: order.customer_id,
            order_id: orderId,
            worker_name: worker?.profiles?.full_name || 'Thợ',
          }),
        }).catch(e => console.error('[workflow] notify_customer_arriving failed', e))
      }
      break
    }
    case 'send_eta': {
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
      if (order) {
        fetch(`${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ type: 'worker_eta', user_id: order.customer_id, order_id: orderId }),
        }).catch(e => console.error('[workflow] send_eta failed', e))
      }
      break
    }
    case 'run_quality_check': {
      fetch(`${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/ai-quality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({ order_id: orderId }),
      }).catch(e => console.error('[workflow] run_quality_check failed', e))
      break
    }
    case 'release_escrow': {
      fetch(`${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/wallet-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({ action: 'escrow:release', data: { order_id: orderId } }),
      }).catch(e => console.error('[workflow] release_escrow failed', e))
      break
    }
    case 'activate_warranty': {
      fetch(`${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/ai-warranty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({ order_id: orderId, action: 'activate' }),
      }).catch(e => console.error('[workflow] activate_warranty failed', e))
      break
    }
    case 'calculate_trust_score': {
      supabase.rpc('calculate_trust_score', { target_user_id: context?.worker_id || '' })
        .catch(e => console.error('[workflow] calculate_trust_score failed', e))
      break
    }
    case 'request_review': {
      const { data: order } = await supabase.from('orders').select('customer_id').eq('id', orderId).single()
      if (order) {
        fetch(`${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ type: 'request_review', user_id: order.customer_id, order_id: orderId }),
        }).catch(e => console.error('[workflow] request_review failed', e))
      }
      break
    }
    case 'send_receipt': {
      const { data: order } = await supabase.from('orders').select('*, workers:worker_id(full_name)').eq('id', orderId).single()
      if (order) {
        fetch(`${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({
            type: 'receipt',
            user_id: order.customer_id,
            order_id: orderId,
            amount: order.actual_price || order.estimated_price,
            worker_name: order.workers?.full_name,
          }),
        }).catch(e => console.error('[workflow] send_receipt failed', e))
      }
      break
    }
    case 'process_refund': {
      fetch(`${Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')}/functions/v1/wallet-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({ action: 'escrow:refund', data: { order_id: orderId } }),
      }).catch(e => console.error('[workflow] process_refund failed', e))
      break
    }
  }
}

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const user = await verifyAuth(req)
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const body: WorkflowRequest = await req.json()
    const { order_id, event, data = {} } = body

    if (!order_id || !event) {
      return jsonResponse({ error: 'Missing order_id or event' }, 400)
    }

    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let { data: workflow, error: fetchError } = await supabase
      .from('workflow_states')
      .select('*')
      .eq('order_id', order_id)
      .single()

    if (fetchError || !workflow) {
      const { data: newWorkflow, error: insertError } = await supabase
        .from('workflow_states')
        .insert({ order_id, current_state: 'created' })
        .select()
        .single()

      if (insertError || !newWorkflow) {
        return jsonResponse({ error: 'Failed to create workflow state' }, 500)
      }
      workflow = newWorkflow
    }

    const currentState = workflow.current_state
    const transitions = STATE_TRANSITIONS[currentState]

    if (!transitions) {
      return jsonResponse({ error: `No transitions defined for state: ${currentState}`, current_state: currentState }, 400)
    }

    const nextState = transitions[event]
    if (!nextState) {
      return jsonResponse({
        error: `Event '${event}' not allowed from state '${currentState}'`,
        current_state: currentState,
        allowed_events: Object.keys(transitions),
      }, 400)
    }

    const mergedContext = { ...(workflow.context as Record<string, unknown> || {}), ...data }

    await supabase
      .from('workflow_states')
      .update({
        current_state: nextState,
        context: mergedContext,
        updated_at: new Date().toISOString(),
        error_count: 0,
        last_error: null,
      })
      .eq('id', workflow.id)

    const actions = STATE_ACTIONS[nextState] || []
    const actionResults: string[] = []

    for (const action of actions) {
      try {
        await executeAction(action, order_id, supabase, mergedContext)
        actionResults.push(`${action}:ok`)
      } catch (e: any) {
        console.error(`[workflow] action ${action} failed:`, e)
        actionResults.push(`${action}:fail`)
        await supabase
          .from('workflow_states')
          .update({
            error_count: (workflow.error_count || 0) + 1,
            last_error: `Action ${action}: ${e.message}`,
          })
          .eq('id', workflow.id)
      }
    }

    return jsonResponse({
      success: true,
      order_id,
      previous_state: currentState,
      current_state: nextState,
      event,
      actions_executed: actionResults,
    })
  } catch (error: any) {
    console.error('[workflow] error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})

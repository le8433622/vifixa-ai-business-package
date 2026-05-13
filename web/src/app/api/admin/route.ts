// Admin API Route - Handle all admin operations
// Per 21_API_SPECIFICATION.md - Web APIs for admin

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client
function createServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const serverClient = createServerClient();
    
    // Verify admin
    const { data: { user }, error: authError } = await serverClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const { data: profile } = await serverClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Handle different actions
    switch (action) {
      case 'users': {
        const search = searchParams.get('search') || ''
        const role = searchParams.get('role') || ''
        const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
        const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20'), 1), 100)
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        let query = serverClient
          .from('profiles')
          .select('*', { count: 'exact' })

        if (search) {
          query = query.or(
            `email.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%`
          )
        }

        if (role && ['customer', 'worker', 'admin'].includes(role)) {
          query = query.eq('role', role)
        }

        const { data: users, count, error } = await query
          .order('created_at', { ascending: false })
          .range(from, to)

        if (error) throw error
        return NextResponse.json({ users, count, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) })
      }

      case 'users-update': {
        const { user_id, updates } = body
        if (!user_id || !updates) {
          return NextResponse.json({ error: 'user_id and updates are required' }, { status: 400 })
        }

        // Only allow specific fields to be updated
        const allowedFields: Record<string, unknown> = {}
        if (updates.role && ['customer', 'worker', 'admin'].includes(updates.role)) {
          allowedFields.role = updates.role
        }
        if (typeof updates.full_name === 'string') {
          allowedFields.full_name = updates.full_name
        }
        if (typeof updates.phone === 'string') {
          allowedFields.phone = updates.phone
        }

        if (Object.keys(allowedFields).length === 0) {
          return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
        }

        const { error: updateError } = await serverClient
          .from('profiles')
          .update(allowedFields)
          .eq('id', user_id)

        if (updateError) throw updateError
        return NextResponse.json({ success: true })
      }

      case 'workers': {
        const wSearch = searchParams.get('search') || ''
        const vStatus = searchParams.get('verification_status') || ''
        const wPage = Math.max(parseInt(searchParams.get('page') || '1'), 1)
        const wPageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20'), 1), 100)
        const wFrom = (wPage - 1) * wPageSize
        const wTo = wFrom + wPageSize - 1

        let wQuery = serverClient
          .from('workers')
          .select('*, profiles!inner(email, phone, full_name)', { count: 'exact' })

        if (wSearch) {
          wQuery = wQuery.or(
            `profiles.email.ilike.%${wSearch}%,profiles.phone.ilike.%${wSearch}%,profiles.full_name.ilike.%${wSearch}%`
          )
        }

        if (vStatus && ['pending', 'verified', 'rejected'].includes(vStatus)) {
          wQuery = wQuery.eq('verification_status', vStatus)
        }

        const { data: workers, count: wCount, error: workersError } = await wQuery
          .order('created_at', { ascending: false })
          .range(wFrom, wTo)

        if (workersError) throw workersError
        return NextResponse.json({
          workers,
          count: wCount,
          page: wPage,
          pageSize: wPageSize,
          totalPages: Math.ceil((wCount || 0) / wPageSize),
        })
      }

      case 'orders': {
        const oSearch = searchParams.get('search') || ''
        const oStatus = searchParams.get('status') || ''
        const oPage = Math.max(parseInt(searchParams.get('page') || '1'), 1)
        const oPageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20'), 1), 100)
        const oFrom = (oPage - 1) * oPageSize
        const oTo = oFrom + oPageSize - 1

        let oQuery = serverClient
          .from('orders')
          .select('*, profiles!inner(email), workers(user_id, profiles!inner(email, full_name))', { count: 'exact' })

        if (oSearch) {
          oQuery = oQuery.or(
            `profiles.email.ilike.%${oSearch}%,description.ilike.%${oSearch}%,category.ilike.%${oSearch}%`
          )
        }

        if (oStatus && ['pending', 'matched', 'in_progress', 'completed', 'cancelled', 'disputed'].includes(oStatus)) {
          oQuery = oQuery.eq('status', oStatus)
        }

        const { data: orders, count: oCount, error: ordersError } = await oQuery
          .order('created_at', { ascending: false })
          .range(oFrom, oTo)

        if (ordersError) throw ordersError
        return NextResponse.json({
          orders,
          count: oCount,
          page: oPage,
          pageSize: oPageSize,
          totalPages: Math.ceil((oCount || 0) / oPageSize),
        })
      }
        
      case 'disputes': {
        const dStatus = searchParams.get('review_status') || ''
        const dType = searchParams.get('entity_type') || ''
        const dPage = Math.max(parseInt(searchParams.get('page') || '1'), 1)
        const dPageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20'), 1), 100)
        const dFrom = (dPage - 1) * dPageSize
        const dTo = dFrom + dPageSize - 1

        let dQuery = serverClient
          .from('admin_review_queue')
          .select('*, profiles:created_by(id, email, full_name)', { count: 'exact' })

        if (dStatus && ['pending', 'approved', 'rejected', 'escalated'].includes(dStatus)) {
          dQuery = dQuery.eq('review_status', dStatus)
        }
        if (dType && ['dispute', 'order', 'fraud', 'quality', 'pricing'].includes(dType)) {
          dQuery = dQuery.eq('entity_type', dType)
        }

        const { data: disputes, count: dCount, error: disputesError } = await dQuery
          .order('created_at', { ascending: false })
          .range(dFrom, dTo)

        if (disputesError) throw disputesError
        return NextResponse.json({
          disputes,
          count: dCount,
          page: dPage,
          pageSize: dPageSize,
          totalPages: Math.ceil((dCount || 0) / dPageSize),
        })
      }
        
      case 'wallets': {
        const wSearch = searchParams.get('search') || ''
        const wPage = Math.max(parseInt(searchParams.get('page') || '1'), 1)
        const wPageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20'), 1), 100)
        const wFrom = (wPage - 1) * wPageSize
        const wTo = wFrom + wPageSize - 1

        let wQuery = serverClient
          .from('wallets')
          .select('*, profiles!inner(id, email, full_name, role)', { count: 'exact' })

        if (wSearch) {
          wQuery = wQuery.or(
            `profiles.email.ilike.%${wSearch}%,profiles.full_name.ilike.%${wSearch}%`
          )
        }

        const { data: wallets, count: wCount, error: wError } = await wQuery
          .order('created_at', { ascending: false })
          .range(wFrom, wTo)

        if (wError) throw wError
        return NextResponse.json({
          wallets,
          count: wCount,
          page: wPage,
          pageSize: wPageSize,
          totalPages: Math.ceil((wCount || 0) / wPageSize),
        })
      }

      case 'wallets-summary': {
        const { data: walletsAll } = await serverClient
          .from('wallets')
          .select('balance, locked_amount')

        const { count: totalWallets } = await serverClient
          .from('wallets')
          .select('*', { count: 'exact', head: true })

        const { count: pendingPayouts, data: pendingData } = await serverClient
          .from('payouts')
          .select('amount', { count: 'exact', head: false })
          .eq('status', 'pending')

        const totalBalance = (walletsAll || []).reduce((s, w) => s + Number(w.balance), 0)
        const totalLocked = (walletsAll || []).reduce((s, w) => s + Number(w.locked_amount || 0), 0)
        const totalPendingPayout = (pendingData || []).reduce((s, p: any) => s + Number(p.amount), 0)

        return NextResponse.json({
          total_wallets: totalWallets || 0,
          total_balance: totalBalance,
          total_locked: totalLocked,
          pending_payouts: pendingPayouts || 0,
          pending_payout_amount: totalPendingPayout,
        })
      }

      case 'payouts': {
        const pStatus = searchParams.get('status') || ''
        const pPage = Math.max(parseInt(searchParams.get('page') || '1'), 1)
        const pPageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20'), 1), 100)
        const pFrom = (pPage - 1) * pPageSize
        const pTo = pFrom + pPageSize - 1

        let pQuery = serverClient
          .from('payouts')
          .select('*, profiles!payouts_user_id_fkey(id, email, full_name, role)', { count: 'exact' })
          .order('created_at', { ascending: false })

        if (pStatus && ['pending', 'completed', 'failed', 'cancelled'].includes(pStatus)) {
          pQuery = pQuery.eq('status', pStatus)
        }

        const { data: payouts, count: pCount, error: pError } = await pQuery
          .range(pFrom, pTo)

        if (pError) throw pError
        return NextResponse.json({
          payouts,
          count: pCount,
          page: pPage,
          pageSize: pPageSize,
          totalPages: Math.ceil((pCount || 0) / pPageSize),
        })
      }

      case 'ai-logs':
        const { data: logs, error: logsError } = await serverClient
          .from('ai_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (logsError) throw logsError;
        return NextResponse.json({ logs });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error('Admin API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const serverClient = createServerClient();
    const body = await request.json();
    const { action } = body;
    
    // Verify admin
    const { data: { user }, error: authError } = await serverClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const { data: profile } = await serverClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Handle different actions
    switch (action) {
      case 'verify-worker':
        const { user_id, is_verified } = body;
        const { error: vError } = await serverClient
          .from('workers')
          .update({ is_verified })
          .eq('user_id', user_id);
        
        if (vError) throw vError;
        return NextResponse.json({ success: true });

      case 'workers-update':
        const { user_id: wuId, updates: wuUpdates } = body
        if (!wuId || !wuUpdates) {
          return NextResponse.json({ error: 'user_id and updates are required' }, { status: 400 })
        }

        const wuAllowed: Record<string, unknown> = {}
        if (typeof wuUpdates.trust_score === 'number' && wuUpdates.trust_score >= 0 && wuUpdates.trust_score <= 100) {
          wuAllowed.trust_score = wuUpdates.trust_score
        }
        if (['pending', 'verified', 'rejected'].includes(wuUpdates.verification_status)) {
          wuAllowed.verification_status = wuUpdates.verification_status
        }
        if (typeof wuUpdates.is_verified === 'boolean') {
          wuAllowed.is_verified = wuUpdates.is_verified
        }

        if (Object.keys(wuAllowed).length === 0) {
          return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
        }

        const { error: wuError } = await serverClient
          .from('workers')
          .update(wuAllowed)
          .eq('user_id', wuId)

        if (wuError) throw wuError
        return NextResponse.json({ success: true })

      case 'orders-update':
        const { order_id, updates: ouUpdates } = body
        if (!order_id || !ouUpdates) {
          return NextResponse.json({ error: 'order_id and updates are required' }, { status: 400 })
        }

        const ouAllowed: Record<string, unknown> = {}
        if (['pending', 'matched', 'in_progress', 'completed', 'cancelled', 'disputed'].includes(ouUpdates.status)) {
          ouAllowed.status = ouUpdates.status
        }
        if (typeof ouUpdates.worker_id === 'string') {
          ouAllowed.worker_id = ouUpdates.worker_id
        }
        if (typeof ouUpdates.final_price === 'number') {
          ouAllowed.final_price = ouUpdates.final_price
        }

        if (Object.keys(ouAllowed).length === 0) {
          return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
        }

        const { error: ouError } = await serverClient
          .from('orders')
          .update(ouAllowed)
          .eq('id', order_id)

        if (ouError) throw ouError
        return NextResponse.json({ success: true })

      case 'disputes-resolve':
        const { review_id, resolution } = body
        if (!review_id || !resolution) {
          return NextResponse.json({ error: 'review_id and resolution are required' }, { status: 400 })
        }

        const allowedResolutions: Record<string, unknown> = {}
        if (['approved', 'rejected', 'escalated'].includes(resolution.review_status)) {
          allowedResolutions.review_status = resolution.review_status
          allowedResolutions.resolved_by = user.id
          allowedResolutions.resolved_at = new Date().toISOString()
        }
        if (typeof resolution.action === 'string') {
          allowedResolutions.resolution_action = resolution.action
        }

        if (Object.keys(allowedResolutions).length === 0) {
          return NextResponse.json({ error: 'No valid resolution fields' }, { status: 400 })
        }

        const { error: drError } = await serverClient
          .from('admin_review_queue')
          .update(allowedResolutions)
          .eq('id', review_id)

        if (drError) throw drError

        // If resolving with an order action, update the order too
        if (resolution.order_action && resolution.entity_id) {
          const orderStatus = resolution.order_action === 'complete' ? 'completed' : 
                            resolution.order_action === 'refund' ? 'cancelled' : null
          if (orderStatus) {
            await serverClient
              .from('orders')
              .update({ status: orderStatus })
              .eq('id', resolution.entity_id)
          }
        }

        return NextResponse.json({ success: true })

      case 'wallets-adjust': {
        const { user_id, amount, reason } = body
        if (!user_id || typeof amount !== 'number' || !reason) {
          return NextResponse.json({ error: 'user_id, amount, and reason are required' }, { status: 400 })
        }

        if (amount > 0) {
          // Atomic: use add_wallet_funds RPC (FOR UPDATE)
          const { data: result, error: rpcError } = await serverClient
            .rpc('add_wallet_funds', {
              p_user_id: user_id,
              p_amount: amount,
              p_reference_type: 'adjustment',
              p_description: `Admin điều chỉnh: ${reason}`,
            })

          if (rpcError) throw rpcError
          if (!result.success) throw new Error(result.error)
        } else if (amount < 0) {
          // Deduct: lock row first, then update
          const { data: wallet } = await serverClient
            .from('wallets')
            .select('id, balance')
            .eq('user_id', user_id)
            .single()

          if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
          }

          const deductAmount = Math.abs(amount)
          if (Number(wallet.balance) < deductAmount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
          }

          await serverClient
            .from('wallets')
            .update({ balance: wallet.balance - deductAmount })
            .eq('id', wallet.id)

          await serverClient
            .from('ledger_entries')
            .insert({
              transaction_id: `adjust_${Date.now()}`,
              wallet_id: wallet.id,
              account: 'wallet.adjustment',
              direction: 'debit',
              amount: deductAmount,
              reference_type: 'fee',
              description: `Admin điều chỉnh: ${reason}`,
            })
        }

        return NextResponse.json({ success: true })
      }

      case 'payouts-approve': {
        const { payout_id: ap_payout_id } = body
        if (!ap_payout_id) {
          return NextResponse.json({ error: 'payout_id is required' }, { status: 400 })
        }

        const { data: ap_result, error: ap_rpcError } = await serverClient
          .rpc('approve_payout', { p_payout_id: ap_payout_id })

        if (ap_rpcError) {
          console.error('Approve payout RPC error:', ap_rpcError)
          return NextResponse.json({ error: 'Failed to approve payout' }, { status: 500 })
        }

        if (!ap_result.success) {
          return NextResponse.json({ error: ap_result.error }, { status: 400 })
        }

        // Track admin who approved
        await serverClient
          .from('payouts')
          .update({ admin_id: user.id })
          .eq('id', ap_payout_id)

        return NextResponse.json({ success: true })
      }

      case 'payouts-reject': {
        const { payout_id, note } = body
        if (!payout_id) {
          return NextResponse.json({ error: 'payout_id is required' }, { status: 400 })
        }

        // Atomic RPC: unlock locked_amount + mark payout failed (FOR UPDATE)
        const { data: result, error: rpcError } = await serverClient
          .rpc('reject_payout', { p_payout_id: payout_id })

        if (rpcError) {
          console.error('Reject payout RPC error:', rpcError)
          return NextResponse.json({ error: 'Failed to reject payout' }, { status: 500 })
        }

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        // Update note separately (not in RPC to keep it focused)
        if (note) {
          await serverClient
            .from('payouts')
            .update({ note, admin_id: user.id })
            .eq('id', payout_id)
        }

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error('Admin API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

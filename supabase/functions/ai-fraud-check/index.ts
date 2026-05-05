// AI Fraud Check Edge Function
// Per 12_OPERATIONS_AND_TRUST.md - Detect fraud patterns
// Per Step 7: Trust & Quality - Fraud detection alerts

import { corsHeaders } from '../_shared/cors.ts';
import { createAIProvider } from '../_shared/ai-provider.ts';

interface FraudCheckRequest {
  order_id?: string;
  user_id?: string;
  check_type: 'multiple_accounts' | 'price_change' | 'fake_review' | 'suspicious_activity';
}

interface FraudAlert {
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify admin role
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': serviceRoleKey,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userData.id}&select=role`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const profile = await profileResponse.json();

    if (!profile[0] || profile[0].role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, user_id, check_type }: FraudCheckRequest = await req.json();

    const aiProvider = createAIProvider();
    const alerts: FraudAlert[] = [];

    // Check 1: Multiple accounts same IP (simplified - would need IP tracking)
    if (check_type === 'multiple_accounts' && user_id) {
      // In production, track IP addresses in auth logs
      // This is a placeholder for the AI-powered detection
      const { data: orders, error } = await fetch(
        `${supabaseUrl}/rest/v1/orders?customer_id=eq.${user_id}&select=count`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!error) {
        const ordersData = await orders.json();
        if (ordersData.count > 10) {
          alerts.push({
            alert_type: 'high_volume',
            severity: 'medium',
            description: `User has ${ordersData.count} orders - unusually high volume`,
            evidence: { order_count: ordersData.count },
          });
        }
      }
    }

    // Check 2: Sudden price changes
    if (check_type === 'price_change' && order_id) {
      const { data: order, error } = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${order_id}&select=estimated_price,final_price,status`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!error) {
        const orderData = await order.json();
        if (orderData[0] && orderData[0].final_price) {
          const estimated = orderData[0].estimated_price;
          const final = orderData[0].final_price;
          const changePercent = Math.abs((final - estimated) / estimated * 100);

          if (changePercent > 50) {
            alerts.push({
              alert_type: 'price_manipulation',
              severity: 'high',
              description: `Price changed by ${changePercent.toFixed(1)}% from estimated`,
              evidence: { estimated, final, change_percent: changePercent },
            });
          }
        }
      }
    }

    // Check 3: Fake reviews (simplified)
    if (check_type === 'fake_review' && order_id) {
      // In production, use AI to analyze review patterns
      // Placeholder for AI analysis
      alerts.push({
        alert_type: 'review_analysis',
        severity: 'low',
        description: 'Review analysis pending - AI model needed',
        evidence: { order_id },
      });
    }

    // Check 4: Suspicious activity (multiple disputes)
    if (user_id) {
      const { data: disputes, error } = await fetch(
        `${supabaseUrl}/rest/v1/orders?customer_id=eq.${user_id}&status=eq.disputed&select=count`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!error) {
        const disputesData = await disputes.json();
        if (disputesData.count >= 3) {
          alerts.push({
            alert_type: 'multiple_disputes',
            severity: 'critical',
            description: `User has ${disputesData.count} disputes - potential fraud`,
            evidence: { dispute_count: disputesData.count },
          });
        }
      }
    }

    // Log fraud check to ai_logs
    if (alerts.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/ai_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          agent_type: 'fraud',
          input: { order_id, user_id, check_type },
          output: { alerts, risk_score: alerts.filter(a => a.severity === 'critical').length * 30 + alerts.filter(a => a.severity === 'high').length * 20 },
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts,
        risk_score: alerts.reduce((score, alert) => {
          if (alert.severity === 'critical') return score + 30;
          if (alert.severity === 'high') return score + 20;
          if (alert.severity === 'medium') return score + 10;
          return score + 5;
        }, 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fraud check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Enhanced AI Fraud Check Edge Function
// Per 12_OPERATIONS_AND_TRUST.md - Anti-fraud detection
// Per Step 7: Trust & Quality - Task 5

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface FraudCheckRequest {
  order_id?: string;
  user_id?: string;
  check_type: 'multiple_accounts' | 'price_change' | 'fake_review' | 'suspicious_activity' | 'dispute_rate';
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

    const alerts: FraudAlert[] = [];

    // Check 1: Multiple accounts same IP (requires IP tracking - simplified)
    if (check_type === 'multiple_accounts' && user_id) {
      // In production: Track IP addresses in auth logs
      // Placeholder for AI-powered detection
      const ordersResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?customer_id=eq.${user_id}&select=count`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Accept': 'application/json',
          },
        }
      );

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
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

    // Check 2: Sudden price changes > 50%
    if (check_type === 'price_change' && order_id) {
      const orderResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${order_id}&select=estimated_price,final_price,status`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        if (orderData[0] && orderData[0].final_price && orderData[0].estimated_price) {
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

    // Check 3: Fake reviews detection (same rating pattern, similar text)
    if (check_type === 'fake_review' && order_id) {
      // Get the order's rating
      const orderResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${order_id}&select=rating,review_comment,customer_id`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const order = await orderResponse.json();

      if (orderResponse.ok && order[0]) {
        const orderData = order[0];
        
        if (orderData.rating && orderData.customer_id) {
          // Check if user always gives same rating (suspicious pattern)
          const userReviewsResponse = await fetch(
            `${supabaseUrl}/rest/v1/orders?customer_id=eq.${orderData.customer_id}&rating=not.is.null&select=rating`,
            {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
              },
            }
          );
          const userReviews = await userReviewsResponse.json();

          if (userReviewsResponse.ok && userReviews) {
            const ratings = userReviews.map((r: any) => r.rating);
            const allSameRating = ratings.every((r: number) => r === ratings[0]);
            
            if (ratings.length >= 3 && allSameRating) {
              alerts.push({
                alert_type: 'fake_review_pattern',
                severity: 'medium',
                description: `User gave same rating (${ratings[0]} stars) to ${ratings.length} orders - suspicious pattern`,
                evidence: { rating_pattern: ratings, count: ratings.length },
              });
            }
          }

          // Check for similar review text (copy-paste pattern)
          if (orderData.review_comment) {
            const similarReviewsResponse = await fetch(
              `${supabaseUrl}/rest/v1/orders?review_comment=ilike.*${orderData.review_comment.substring(0, 20)}*&select=id,customer_id`,
              {
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            const similarReviews = await similarReviewsResponse.json();

            if (similarReviewsResponse.ok && similarReviews && similarReviews.length > 1) {
              alerts.push({
                alert_type: 'duplicate_review_text',
                severity: 'high',
                description: `Found ${similarReviews.length} reviews with similar text - possible copy-paste`,
                evidence: { similar_count: similarReviews.length, reviews: similarReviews },
              });
            }
          }
        }
      }
    }

    // Check 4: Suspicious workers (dispute rate > 20%)
    if (check_type === 'dispute_rate' && user_id) {
      const workerOrdersResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders?worker_id=eq.${user_id}&select=status`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (workerOrdersResponse.ok) {
        const workerOrders = await workerOrdersResponse.json();
        const totalOrders = workerOrders.length;
        const disputedOrders = workerOrders.filter((o: any) => o.status === 'disputed').length;
        const disputeRate = totalOrders > 0 ? (disputedOrders / totalOrders) * 100 : 0;

        if (disputeRate > 20) {
          alerts.push({
            alert_type: 'high_dispute_rate',
            severity: 'critical',
            description: `Worker dispute rate is ${disputeRate.toFixed(1)}% (${disputedOrders}/${totalOrders} orders) - exceeds 20% threshold`,
            evidence: { dispute_rate: disputeRate, disputed_orders: disputedOrders, total_orders: totalOrders },
          });
        }
      }
    }

    // Check 5: General suspicious activity (multiple disputes, rapid order creation)
    if (check_type === 'suspicious_activity') {
      if (user_id) {
        // Check for multiple disputes
        const disputesResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?customer_id=eq.${user_id}&status=eq.disputed&select=count`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Accept': 'application/json',
            },
          }
        );

        if (disputesResponse.ok) {
          const disputesData = await disputesResponse.json();
          if (disputesData.count >= 3) {
            alerts.push({
              alert_type: 'multiple_disputes',
              severity: 'critical',
              description: `User has ${disputesData.count} disputes - potential fraud`,
              evidence: { dispute_count: disputesData.count },
            });
          }
        }

        // Check for rapid order creation (more than 5 orders in 1 hour)
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        const recentOrdersResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?customer_id=eq.${user_id}&created_at=gte.${oneHourAgo.toISOString()}&select=count`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Accept': 'application/json',
            },
          }
        );

        if (recentOrdersResponse.ok) {
          const recentOrdersData = await recentOrdersResponse.json();
          if (recentOrdersData.count >= 5) {
            alerts.push({
              alert_type: 'rapid_order_creation',
              severity: 'high',
              description: `User created ${recentOrdersData.count} orders in the last hour - bot-like behavior`,
              evidence: { recent_orders: recentOrdersData.count, time_window: '1 hour' },
            });
          }
        }
      }
    }

    // Log fraud check to ai_logs with type 'fraud_alert'
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
          output: { 
            alerts, 
            risk_score: alerts.filter(a => a.severity === 'critical').length * 30 
              + alerts.filter(a => a.severity === 'high').length * 20
              + alerts.filter(a => a.severity === 'medium').length * 10
          },
          created_at: new Date().toISOString(),
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
        alerts_count: alerts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Fraud check error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

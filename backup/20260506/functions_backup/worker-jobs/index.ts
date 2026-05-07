// Worker Jobs Edge Function
// Per 21_API_SPECIFICATION.md - Profile, jobs, earnings
// Per 05_PRODUCT_SOLUTION.md - Worker flow

import { corsHeaders } from '../_shared/cors.ts';

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

    // Get user from auth token
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
    const workerId = userData.id;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      if (action === 'profile') {
        // Get worker profile
        const profileResponse = await fetch(
          `${supabaseUrl}/rest/v1/workers?user_id=eq.${workerId}&select=*`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const profile = await profileResponse.json();
        return new Response(
          JSON.stringify({ profile: profile[0] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'jobs') {
        // Get assigned jobs
        const jobsResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?worker_id=eq.${workerId}&select=*&order=created_at.desc`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const jobs = await jobsResponse.json();
        return new Response(
          JSON.stringify({ jobs }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'earnings') {
        // Calculate earnings
        const earningsResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?worker_id=eq.${workerId}&status=eq.completed&select=final_price`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const completedJobs = await earningsResponse.json();
        const totalEarnings = completedJobs.reduce((sum: number, job: any) => sum + (job.final_price || 0), 0);

        // Get worker's avg_earnings
        const workerResponse = await fetch(
          `${supabaseUrl}/rest/v1/workers?user_id=eq.${workerId}&select=avg_earnings,trust_score`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const worker = await workerResponse.json();

        return new Response(
          JSON.stringify({
            total_earnings: totalEarnings,
            completed_jobs: completedJobs.length,
            avg_earnings: worker[0]?.avg_earnings || 0,
            trust_score: worker[0]?.trust_score || 50,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'PUT') {
      const url = new URL(req.url);
      const jobId = url.searchParams.get('job_id');
      const action = url.searchParams.get('action');

      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'Missing job_id parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'accept') {
        // Accept job
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${jobId}&worker_id=eq.${workerId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({ status: 'in_progress' }),
          }
        );

        if (!updateResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to accept job or job not assigned to you' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updatedJob = await updateResponse.json();
        return new Response(
          JSON.stringify({ success: true, order_status: 'in_progress', job: updatedJob[0] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'update_status') {
        const { status, before_media, after_media, final_price } = await req.json();

        const updateData: any = { status };
        if (before_media) updateData.before_media = before_media;
        if (after_media) updateData.after_media = after_media;
        if (final_price) updateData.final_price = final_price;

        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${jobId}&worker_id=eq.${workerId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(updateData),
          }
        );

        const updatedJob = await updateResponse.json();
        return new Response(
          JSON.stringify({ success: true, job: updatedJob[0] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Worker jobs error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

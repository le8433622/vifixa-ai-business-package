#!/usr/bin/env deno
// Auto-generate golden test cases from high-confidence AI feedback
// Usage: deno run --allow-net --allow-env scripts/generate-golden-tests.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://lipjakzhzosrhttsltwo.supabase.co'
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function generateGoldenTests() {
  console.log('=== Auto-Generating Golden Tests from AI Feedback ===\n')

  // Get high-confidence corrections (rating >= 4 or is_correct = true)
  const { data: feedback } = await supabase
    .from('ai_feedback')
    .select('*')
    .eq('is_correct', true)
    .gte('rating', 4)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!feedback || feedback.length === 0) {
    console.log('No high-confidence feedback found. Generate some by rating AI decisions!')
    return
  }

  console.log(`Found ${feedback.length} high-confidence feedback entries\n`)

  const testCases: any[] = []
  let skippedExistingPatterns = 0

  for (const fb of feedback) {
    if (!fb.request_id || !fb.correction) {
      skippedExistingPatterns++
      continue
    }

    const patternKey = `${fb.agent_type}_${fb.comment?.slice(0, 30) || 'auto'}`
    testCases.push({
      name: `auto_${fb.agent_type}_${patternKey.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}`,
      agent_type: fb.agent_type,
      input: fb.correction,
      expected_output: JSON.parse(JSON.stringify(fb.correction)),
      source: 'ai_feedback',
      feedback_id: fb.id,
      created_at: new Date().toISOString(),
    })
  }

  console.log(`Generated ${testCases.length} test cases`)
  if (skippedExistingPatterns > 0) {
    console.log(`Skipped ${skippedExistingPatterns} entries without request_id or correction`)
  }

  // Upsert to a golden_tests table (create if not exists)
  for (const tc of testCases) {
    const { error } = await supabase.from('golden_tests').upsert({
      test_name: tc.name,
      agent_type: tc.agent_type,
      input: tc.input,
      expected_output: tc.expected_output,
      source: tc.source,
      feedback_id: tc.feedback_id,
      is_active: true,
      last_passed: null,
    }, { onConflict: 'test_name' })

    if (error) {
      // Table might not exist — create it
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.log('Creating golden_tests table...')
        await createGoldenTestsTable(supabase)
        // Retry
        await supabase.from('golden_tests').upsert({
          test_name: tc.name, agent_type: tc.agent_type,
          input: tc.input, expected_output: tc.expected_output,
          source: tc.source, feedback_id: tc.feedback_id,
          is_active: true,
        })
      } else {
        console.error(`Failed to save test case ${tc.name}:`, error.message)
      }
    }
  }

  console.log(`\n=== Done: ${testCases.length} test cases saved to golden_tests table ===`)
  console.log('To run these tests: deno test --allow-net supabase/functions/_shared/golden-tests.ts')
}

async function createGoldenTestsTable(supabase: any) {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.golden_tests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        test_name TEXT NOT NULL UNIQUE,
        agent_type TEXT NOT NULL,
        input JSONB NOT NULL,
        expected_output JSONB NOT NULL,
        source TEXT DEFAULT 'auto_generated',
        feedback_id UUID,
        is_active BOOLEAN DEFAULT true,
        last_passed TIMESTAMPTZ,
        last_run TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE public.golden_tests ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Admins can manage golden_tests" ON public.golden_tests FOR ALL USING (is_admin());
      GRANT ALL ON public.golden_tests TO service_role;
    `,
  })
  if (error) {
    console.error('Failed to create golden_tests table:', error)
    // Try direct SQL
    await supabase.from('golden_tests').select('id').limit(1)
  }
}

// Run migration if table doesn't exist via a check
async function ensureTable() {
  const { error } = await supabase.from('golden_tests').select('id').limit(1)
  if (error && error.message?.includes('does not exist')) {
    console.log('golden_tests table missing - creating via migration...')
    console.log('Run: supabase db push')
  }
}

await ensureTable()
await generateGoldenTests()
-- SQL Queries for AI KPI Verification
-- Per 11_AI_OPERATING_MODEL.md - AI KPIs
-- Per Step 8: Testing & Validation

-- 1. Diagnosis Category Accuracy (Target ≥80%)
-- Check if diagnosis category matches the order category
SELECT 
  COUNT(*) as total_diagnoses,
  COUNT(CASE WHEN (output->>'category')::text = (input->>'category')::text THEN 1 END) as accurate,
  ROUND(
    (COUNT(CASE WHEN (output->>'category')::text = (input->>'category')::text THEN 1 END) * 100.0 / COUNT(*))::numeric, 
    2
  ) as accuracy_percent
FROM ai_logs
WHERE agent_type = 'diagnosis' AND input ? 'category' AND output ? 'category';

-- 2. Price Estimate Accuracy (Target ≥60%)
-- Compare estimated_price with final_price (within ±20% considered accurate)
SELECT 
  COUNT(*) as total_estimates,
  COUNT(CASE 
    WHEN orders.estimated_price > 0 
    AND ABS(orders.final_price - orders.estimated_price) / orders.estimated_price <= 0.2 
    THEN 1 
  END) as accurate,
  ROUND(
    (COUNT(CASE 
      WHEN orders.estimated_price > 0 
      AND ABS(orders.final_price - orders.estimated_price) / orders.estimated_price <= 0.2 
      THEN 1 
    END) * 100.0 / COUNT(*))::numeric, 
    2
  ) as accuracy_percent
FROM ai_logs
JOIN orders ON ai_logs.order_id = orders.id
WHERE ai_logs.agent_type = 'pricing' AND orders.final_price IS NOT NULL;

-- 3. Matching Success Rate (Target ≥50%)
-- Check if orders got matched to workers
SELECT 
  COUNT(*) as total_matchings,
  COUNT(CASE WHEN orders.worker_id IS NOT NULL THEN 1 END) as successful_matches,
  ROUND(
    (COUNT(CASE WHEN orders.worker_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*))::numeric, 
    2
  ) as success_rate_percent
FROM ai_logs
JOIN orders ON ai_logs.order_id = orders.id
WHERE ai_logs.agent_type = 'matching';

-- 4. First-Time Fix Rate (Track warranty claims)
SELECT 
  COUNT(DISTINCT orders.id) as completed_orders,
  COUNT(DISTINCT warranty_claims.order_id) as warranty_claims,
  ROUND(
    ((COUNT(DISTINCT orders.id) - COUNT(DISTINCT warranty_claims.order_id)) * 100.0 / COUNT(DISTINCT orders.id))::numeric, 
    2
  ) as first_time_fix_rate_percent
FROM orders
LEFT JOIN warranty_claims ON orders.id = warranty_claims.order_id
WHERE orders.status = 'completed';

-- 5. Trust Score Distribution
SELECT 
  CASE 
    WHEN trust_score >= 80 THEN 'Excellent (80-100)'
    WHEN trust_score >= 60 THEN 'Good (60-79)'
    WHEN trust_score >= 40 THEN 'Average (40-59)'
    ELSE 'Poor (<40)'
  END as trust_category,
  COUNT(*) as worker_count
FROM workers
GROUP BY trust_category
ORDER BY trust_category;

-- 6. Fraud Detection Effectiveness
SELECT 
  COUNT(*) as total_fraud_checks,
  COUNT(CASE WHEN (output->>'alerts_count')::int > 0 THEN 1 END) as alerts_triggered,
  ROUND(
    (COUNT(CASE WHEN (output->>'alerts_count')::int > 0 THEN 1 END) * 100.0 / COUNT(*))::numeric, 
    2
  ) as detection_rate_percent
FROM ai_logs
WHERE agent_type = 'fraud';

-- 7. Average Ratings by Worker
SELECT 
  workers.user_id,
  profiles.email,
  workers.trust_score,
  workers.avg_rating,
  workers.total_orders
FROM workers
JOIN profiles ON workers.user_id = profiles.id
WHERE workers.total_orders > 0
ORDER BY workers.avg_rating DESC
LIMIT 10;

-- 8. Dispute Rate by Worker
SELECT 
  workers.user_id,
  profiles.email,
  COUNT(orders.id) as total_orders,
  COUNT(CASE WHEN orders.status = 'disputed' THEN 1 END) as disputes,
  ROUND(
    (COUNT(CASE WHEN orders.status = 'disputed' THEN 1 END) * 100.0 / COUNT(orders.id))::numeric, 
    2
  ) as dispute_rate_percent
FROM workers
LEFT JOIN orders ON workers.user_id = orders.worker_id
JOIN profiles ON workers.user_id = profiles.id
GROUP BY workers.user_id, profiles.email
HAVING COUNT(orders.id) > 0
ORDER BY dispute_rate_percent DESC;

-- 9. Recent AI Logs Summary (last 100)
SELECT 
  agent_type,
  COUNT(*) as call_count,
  MAX(created_at) as last_called
FROM ai_logs
GROUP BY agent_type
ORDER BY last_called DESC;

-- 10. Overall System Health
SELECT 
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM orders WHERE status = 'completed') as completed_orders,
  (SELECT COUNT(*) FROM workers) as total_workers,
  (SELECT COUNT(*) FROM workers WHERE verification_status = 'verified') as verified_workers,
  (SELECT COUNT(*) FROM ai_logs) as total_ai_calls,
  (SELECT ROUND(AVG(rating), 2) FROM orders WHERE rating IS NOT NULL) as avg_customer_rating;

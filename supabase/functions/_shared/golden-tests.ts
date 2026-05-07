// Golden test cases for Vifixa AI agents
// Each case has: input (what we send), expected (what the output shape should be)

export const goldenTests = {
  diagnose: [
    {
      name: 'engine_no_start',
      input: { category: 'engine', description: 'Xe không khởi động được, có tiếng kêu tạch tạch khi vặn chìa khóa. Bình acquy còn điện.' },
      expectedShape: ['diagnosis', 'severity', 'recommended_skills', 'confidence'],
      expectedSeverity: ['low', 'medium', 'high', 'emergency'],
    },
    {
      name: 'plumbing_leak',
      input: { category: 'plumbing', description: 'Ống nước dưới bồn rửa chén bị rò rỉ, nước chảy ra sàn. Cần thợ sửa gấp.' },
      expectedShape: ['diagnosis', 'severity', 'recommended_skills', 'confidence'],
      expectedSeverity: ['low', 'medium', 'high', 'emergency'],
    },
  ],
  estimatePrice: [
    {
      name: 'engine_repair_price',
      input: { category: 'engine', diagnosis: 'Hỏng bộ khởi động', location: { lat: 10.7769, lng: 106.7009 }, urgency: 'medium' },
      expectedShape: ['estimated_price', 'price_breakdown', 'confidence'],
    },
    {
      name: 'plumbing_repair_price',
      input: { category: 'plumbing', diagnosis: 'Rò rỉ ống nước', location: { lat: 10.7626, lng: 106.6601 }, urgency: 'high' },
      expectedShape: ['estimated_price', 'price_breakdown', 'confidence'],
    },
  ],
  matchWorker: [
    {
      name: 'matching_electrician',
      input: { order_id: 'test-1', skills_required: ['electrical'], location: { lat: 10.7769, lng: 106.7009 }, urgency: 'medium' },
      expectedShape: ['matched_worker_id', 'worker_name', 'eta_minutes', 'confidence'],
    },
  ],
  quality: [
    {
      name: 'quality_check',
      input: { order_id: 'test-1', worker_id: 'test-worker', before_media: ['img1.jpg'], after_media: ['img2.jpg'] },
      expectedShape: ['quality_score', 'passed', 'issues', 'recommendations'],
    },
  ],
  dispute: [
    {
      name: 'dispute_quality',
      input: { order_id: 'test-1', complainant_id: 'cust-1', complaint_type: 'quality' as const, description: 'Sửa chữa không đạt yêu cầu, máy vẫn chạy ồn.', evidence_urls: ['video.mp4'] },
      expectedShape: ['summary', 'severity', 'recommended_action', 'confidence', 'explanation'],
    },
  ],
  coach: [
    {
      name: 'coach_worker',
      input: { worker_id: 'test-worker', job_type: 'engine repair', issue_description: 'Cần cải thiện kỹ năng chẩn đoán điện' },
      expectedShape: ['suggestions', 'safety_tips', 'skill_recommendations', 'earnings_tips'],
    },
  ],
  predict: [
    {
      name: 'washing_machine_maintenance',
      input: { device_type: 'Máy giặt', brand: 'Samsung', model: 'WA80M', purchase_date: '2021-01-15', usage_frequency: 'high' as const, issues_reported: ['rung lắc'] },
      expectedShape: ['next_maintenance_date', 'maintenance_type', 'urgency', 'recommendations'],
    },
  ],
};

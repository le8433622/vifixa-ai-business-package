# E2E Test Plan - Critical Paths
# Per Step 8: Testing & Validation

## Test Scenarios

### 1. Customer Flow: service-request → AI diagnosis → price → accept → complete → review

**Preconditions:**
- Customer logged in
- Worker available

**Steps:**
1. Customer navigates to `/customer/service-request`
2. Fills in: category=plumbing, description="Leaking pipe"
3. Uploads media (optional)
4. Submits request
5. **Verify:** AI diagnosis appears with severity, suggested parts
6. **Verify:** Estimated price displayed
7. Customer accepts price
8. **Verify:** Order status changes to 'matched'
9. Worker accepts job (simulate via DB)
10. Worker uploads before/after photos
11. Worker marks job complete
12. **Verify:** Order status = 'completed'
13. Customer sees "Rate Service" button
14. Customer submits 5-star review
15. **Verify:** Review saved to orders table
16. **Verify:** Worker's trust score recalculated

**Expected KPIs:**
- Diagnosis category accuracy ≥80%
- Price estimate accuracy ≥60%
- Matching success rate ≥50%

---

### 2. Worker Flow: accept job → start → upload photos → complete

**Preconditions:**
- Worker logged in
- Order in 'matched' status assigned to worker

**Steps:**
1. Worker logs in, navigates to `/worker/jobs`
2. **Verify:** Assigned job visible
3. Worker clicks job, views details
4. Worker clicks "Accept Job"
5. **Verify:** Status changes to 'in_progress'
6. Worker uploads before photos
7. Worker performs work
8. Worker uploads after photos
9. Worker clicks "Mark Complete"
10. **Verify:** Service_areas updated if needed
11. **Verify:** Order status = 'completed'

---

### 3. Admin Flow: verify worker → view complaints → resolve dispute

**Preconditions:**
- Admin logged in
- Worker pending verification
- Customer complaint exists

**Steps:**
1. Admin logs in, navigates to `/admin/workers`
2. **Verify:** Worker list shows pending verifications
3. Admin clicks "Verify" on worker
4. Admin uploads worker's ID document
5. **Verify:** Worker status = 'verified'
6. Admin navigates to `/admin/complaints`
7. **Verify:** Complaint list shows pending complaints
8. Admin clicks "Start Investigation"
9. Admin enters resolution details
10. Admin clicks "Resolve"
11. **Verify:** Complaint status = 'resolved'
12. Admin checks `/admin/ai-logs`
13. **Verify:** Quality Metrics tab shows updated metrics

---

### 4. Trust Score: Complete order → verify trust score recalculation

**Preconditions:**
- Worker with existing orders
- Order ready to complete

**Steps:**
1. Complete an order (use flow #1)
2. Submit positive review (4-5 stars)
3. **Verify:** Query trust_scores table
4. **Verify:** Worker's trust_score increased
5. **Verify:** total_orders incremented
6. **Verify:** avg_rating updated
7. Complete another order with negative review (1-2 stars)
8. **Verify:** trust_score decreased
9. **Verify:** dispute_rate updated if status = 'disputed'

---

### 5. Fraud Detection: Simulate suspicious activity

**Preconditions:**
- Admin access
- Test user accounts

**Steps:**
1. Create multiple orders rapidly (simulate bot behavior)
2. Call `/ai-fraud-check` with check_type='suspicious_activity'
3. **Verify:** Alert generated for rapid order creation
4. Create order with price change >50%
5. Call `/ai-fraud-check` with check_type='price_change'
6. **Verify:** Alert for price manipulation
7. Submit multiple similar reviews
8. Call `/ai-fraud-check` with check_type='fake_review'
9. **Verify:** Alert for review pattern
10. Create multiple disputes for same user
11. **Verify:** Alert for high dispute rate (>20%)

---

### 6. Warranty Flow: Completed order <30 days → eligible for claim

**Preconditions:**
- Completed order within 30 days
- Customer logged in

**Steps:**
1. Customer navigates to order details
2. **Verify:** "Warranty Claim" button visible (within 30 days)
3. Customer clicks "Warranty Claim"
4. Fills in claim reason
5. Submits claim
6. **Verify:** Warranty claim created in warranty_claims table
7. **Verify:** Order status changes to 'disputed'
8. Admin views claim in `/admin/complaints`
9. Admin resolves claim
10. **Verify:** Order fixed or compensation issued

---

## Manual Test Checklist

### Customer Paths
- [ ] Create service request
- [ ] View AI diagnosis
- [ ] Accept/Reject price
- [ ] View order status updates
- [ ] Upload media
- [ ] Submit review/rating
- [ ] File complaint
- [ ] Submit warranty claim

### Worker Paths
- [ ] View assigned jobs
- [ ] Accept job
- [ ] Upload before/after photos
- [ ] Update status (in_progress → completed)
- [ ] View earnings
- [ ] Update profile (skills, service areas)
- [ ] Upload ID for verification

### Admin Paths
- [ ] View all users
- [ ] Verify worker (approve/reject)
- [ ] View all orders
- [ ] View AI logs
- [ ] View Quality Metrics
- [ ] Manage complaints (investigate/resolve)
- [ ] View disputes

### Trust & Quality
- [ ] Trust score calculates correctly
- [ ] Review updates trust score
- [ ] Fraud detection triggers alerts
- [ ] Warranty claim works (within 30 days)
- [ ] Warranty claim blocked (after 30 days)
- [ ] Quality checklist generated
- [ ] Rating system works end-to-end

---

## Automated E2E with Playwright (Optional)

```bash
# Install Playwright
cd /Users/lha/Documents/vifixa-ai-business-package/web
npm install -D @playwright/test
npx playwright install

# Create E2E tests
mkdir -p e2e
# Write test files for critical paths
# Run: npx playwright test
```

**Note:** Full E2E automation requires running Supabase + Web app locally.
For now, manual testing with the checklist above is recommended.

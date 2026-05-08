# Skill: Deployment

description: "Deploy Supabase, web to Vercel, and mobile apps to app stores - Step 9"
trigger: "step 9|deployment|deploy|vercel|supabase deploy|eas build|app store"

## Instructions

Execute Step 9 from /agent.md: Deployment

### Tasks:

1. **Deploy Supabase**:
   ```bash
   supabase db push
   supabase functions deploy
   ```
   - Verify: Check Supabase dashboard

2. **Deploy Web to Vercel**:
   ```bash
   vercel --prod
   ```
   - Verify: https://vifixa.com, admin.vifixa.com

3. **Build iOS App**:
   ```bash
   eas build --platform ios
   ```
   - Submit to App Store

4. **Build Android App**:
   ```bash
   eas build --platform android
   ```
   - Submit to Google Play

5. **Post-Deployment Monitoring**:
   - Monitor Vercel analytics
   - Check Supabase logs
   - Review app store reviews

### Files to read first:
- /agent.md (Step 9)
- /DEPLOYMENT_GUIDE.md
- /VERCEL_SPEC.md
- /SUPABASE_SPEC.md

### Verification:
- Supabase project live ✓
- Web live at https://vifixa.com ✓
- Mobile apps downloadable from stores ✓

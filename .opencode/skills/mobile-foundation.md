# Skill: Mobile Foundation

description: "Initialize Expo mobile app with TypeScript and required libraries - Step 5"
trigger: "step 5|mobile|expo|react native|app/(customer)|app/(worker)|app/(admin)"

## Instructions

Execute Step 5 from /agent.md: Mobile Foundation (Expo/React Native)

### Tasks:
1. Initialize Expo + TypeScript: `npx create-expo-app@latest mobile --template blank-typescript`

2. Create directory structure:
   - /mobile/app/(customer)/_layout.tsx, index.tsx, service-request.tsx, orders.tsx
   - /mobile/app/(worker)/_layout.tsx, index.tsx, jobs.tsx, profile.tsx
   - /mobile/app/(admin)/_layout.tsx, index.tsx, dashboard.tsx

3. Set up Expo Router with role-based stacks

4. Integrate required libraries:
   - TanStack Query (Supabase JS client)
   - Zustand (state management)
   - Zod (validation)
   - Expo SecureStore (auth tokens)
   - Expo Image Picker (media upload)
   - Expo Location (worker matching)
   - Expo Notifications (push notifications)

5. Configure environment variables in /mobile/.env:
   - EXPO_PUBLIC_SUPABASE_URL
   - EXPO_PUBLIC_SUPABASE_ANON_KEY

### Files to read first:
- /agent.md (Step 5)
- /15_CODEX_BUSINESS_CONTEXT.md (Mobile Stack section)

### Verification:
- `npx expo start` runs successfully
- `npm test /mobile` passes foundation tests

# Codex Business Context

## Business Context for Codex

Project: **Vifixa AI**

Build a production-ready commercial mobile app, Next.js web app, and Supabase backend for an AI-powered repair and maintenance marketplace.

## Brand

- App name: Vifixa AI
- Internal codename: VFIX
- Slogan: Smart services for real life.
- Vietnamese slogan: Dịch vụ thông minh cho đời sống thật.

## Product Positioning

Vifixa AI is not only a home repair app. It is an AI service operations platform for real-world tasks: repair, maintenance, installation, inspection, and facility operations.

## Users

The system has 3 roles:

1. Customer
2. Worker
3. Admin

## Customer Goal

Customers should be able to describe a real-world issue, upload media, receive AI diagnosis, see estimated pricing, book a suitable worker, track order status, review service, and request warranty or complaint support.

## Worker Goal

Workers should be able to create a verified profile, set skills and availability, receive suitable jobs, accept/reject jobs, update status, upload before/after media, add materials, complete jobs, and track earnings/trust score.

## Admin Goal

Admins should be able to monitor users, workers, orders, complaints, warranty claims, risk alerts, AI usage logs, and audit logs.

## AI Role

AI should support:

- Repair issue diagnosis
- Price estimation
- Worker matching explanation
- Complaint summarization
- Fraud risk detection
- Worker action suggestions
- Quality control recommendations

All AI calls must go through backend. No AI secret should exist in the mobile app.

## Backend Stack

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions
- Supabase CLI

## Mobile Stack

- Expo
- React Native
- TypeScript
- Expo Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Expo SecureStore
- Expo Image Picker
- Expo Location
- Expo Notifications

## Web Stack

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Vercel
- Supabase JS

## Design Principle

Simple for humans. Structured for AI. Controlled for operations.

## Business Priorities

1. Trust
2. Speed
3. Transparent pricing
4. Quality control
5. Repeat usage
6. Worker supply quality
7. AI learning from every transaction

## Do Not Build

- Do not use mock data for production flows.
- Do not put secrets in mobile or frontend.
- Do not skip validation/auth/RBAC.
- Do not make AI decisions irreversible without audit.
- Do not expose service-role keys to client apps.

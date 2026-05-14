═══════════════════════════════════════════════════════════════
GLOBAL CONTEXT — GRWFIT (paste at top of every session)
═══════════════════════════════════════════════════════════════

PROJECT
  Name: GrwFit (grwfit.com)
  Type: Multi-tenant SaaS CRM for Indian gyms
  Tenancy: gym_id column + Row-Level Security on every table

TECH STACK
  Backend:    Node.js 20, NestJS, TypeScript, REST
  Database:   Supabase (PostgreSQL 16) — RLS on all tables, gym_id enforced
  Auth:       Supabase built-in Email OTP → custom JWT
              Access token = 15min | Refresh token = 30 days
              Staff & members log in with email (not phone)
  Storage:    Supabase Storage (dev) → AWS S3 Mumbai (production)
  Cache/Jobs: Upstash Redis + BullMQ
  Dashboard:  Next.js 14 App Router, Tailwind CSS, shadcn/ui, React Query
  Mobile:     React Native (Expo) — future

INFRA
    API server  → Render (free tier, https://grwfit.onrender.com)
                  Spins down after 15 min inactivity (~50s cold start)
                  Docker deployment via apps/api/Dockerfile
                  render.yaml at repo root for IaC
    Database    → Supabase (free tier, ap-south-1)
    Redis       → Upstash (free tier)
    Storage     → Supabase Storage
    Frontend    → Vercel (free tier) — not yet deployed
    Mobile      → Expo (free) — future
    WhatsApp    → Gupshup (NOT YET CONFIGURED — stub returns false)
    Payments    → Razorpay (NOT YET CONFIGURED — returns 503)

CURRENT STATUS (as of 2026-05-15)
    ✓ Database schema pushed (47 tables, RLS on all)
    ✓ Seed data: Iron Forge Fitness gym, 3 staff, 20 members
    ✓ API live on Render: https://grwfit.onrender.com
    ✓ Email OTP auth working via Supabase
    ✓ Redis connected (Upstash)
    ✗ Frontends not yet deployed to Vercel
    ✗ WhatsApp (Gupshup) — add credentials when ready
    ✗ Payments (Razorpay) — add credentials when ready
    ✗ Supabase Auth: staff/members need email set to log in

DISABLED FEATURES (re-enable by adding credentials to env)
    Payments:  RAZORPAY_KEY_ID/SECRET → Razorpay dashboard
    WhatsApp:  GUPSHUP_API_KEY/SRC_PHONE → Gupshup dashboard
    Payment UI: hidden from sidebar until Razorpay is live
    WhatsApp UI: hidden from sidebar until Gupshup is live


SUBDOMAINS (one backend, three frontends)
  admin.grwfit.com  → Platform/admin team (Vercel)
  app.grwfit.com    → Gym staff dashboard (Vercel)
  m.grwfit.com      → Member-facing app (Expo)

LOCALISATION & COMPLIANCE
  Currency:  INR only — stored in paise (integer), displayed in ₹
  Tax:       GST-compliant
  Timezone:  UTC stored in DB, IST (Asia/Kolkata) displayed everywhere
  Phone:     +91 format enforced

RULES (never break these)
  - Every DB table MUST have gym_id + RLS policy
  - All money stored in paise (integer), never float
  - Timestamps stored UTC, converted to IST on all outputs
  - Phone numbers stored with +91 prefix
  - Multi-tenancy isolation verified in every module
  - Never expose one gym's data to another gym

═══════════════════════════════════════════════════════════════
CODING STANDARDS — GRWFIT (enforce in every module, no exceptions)
═══════════════════════════════════════════════════════════════

ARCHITECTURE
  1.  Never hardcode values — all config from database or env vars
  2.  Think in SaaS architecture, not single-page implementation
  3.  Build modular architecture using feature-based modules
  4.  Separate UI, business logic, and API layers always
  5.  If a pattern repeats 2–3 times, convert it into a reusable system
  6.  Always version APIs → /api/v1/...
  7.  Shared TypeScript types live in packages/shared-types only

MULTI-TENANCY (non-negotiable)
  8.  Every DB query MUST include gym_id filter — no exceptions
  9.  Never trust gym_id from frontend — always read from JWT
  10. Every new table MUST have gym_id column + RLS policy
  11. Test every endpoint for cross-gym data leak before marking done

DATABASE
  12. Always use transactions for multi-table writes
  13. Never do N+1 queries — use joins or batch loads
  14. Index every foreign key and frequently filtered column
  15. Never return raw DB errors to client
  16. All money stored in paise (integer), never float
  17. All timestamps stored UTC, converted to IST on output

API DESIGN
  18. Always paginate list endpoints — never return all rows
  19. Consistent error response format across all endpoints:
        { success: false, error: { code, message, details } }
  20. Consistent success response format:
        { success: true, data: {}, meta: { page, total } }
  21. Never expose stack traces or internal errors to client
  22. Rate limit every public endpoint

TYPESCRIPT
  23. No `any` type ever — use unknown + type guards if needed
  24. DTOs for every API request and response
  25. Enums for all fixed values (roles, status, modes)
  26. Strict mode enabled in tsconfig

SECURITY
  27. Validate everything server-side — never trust client input
  28. Sanitize all user inputs (XSS, SQL injection)
  29. Never log sensitive data (OTP, tokens, passwords, card info)
  30. JWT claims are read-only — never accept role/gymId from request body
  31. httpOnly cookies for tokens — never localStorage

PERFORMANCE
  32. Cache expensive queries in Redis with explicit TTL
  33. Background jobs (BullMQ) for any operation >500ms
  34. Never block request thread with heavy computation
  35. p95 response time target: <200ms for reads, <500ms for writes

FRONTEND
  36. Always prefer reusable components over page-specific ones
  37. Never duplicate tables, forms, cards, or layouts — build once
  38. Use config-driven design instead of multiple similar components
  39. Responsive design on every screen — mobile / tablet / desktop
  40. No API calls directly in components — use React Query hooks only
  41. Every list/table must handle: loading, error, and empty states
  42. Use optimistic UI for actions that feel slow (toggle, delete)

ERROR HANDLING
  43. Every async operation wrapped in try/catch
  44. Meaningful error messages — never "something went wrong"
  45. All errors logged with context (gym_id, user_id, endpoint)
  46. Frontend shows user-friendly message, logs technical detail

TESTING
  47. Every module needs unit tests for business logic
  48. Every API endpoint needs an integration test
  49. Test each role's permission boundary explicitly
  50. RLS verified: query without gym_id context returns 0 rows

CODE QUALITY
  51. No commented-out code in commits
  52. Every function does one thing only
  53. File length max ~300 lines — split if longer
  54. Keep code scalable, maintainable, and production-ready always

═══════════════════════════════════════════════════════════════
MODULE 0 — PROJECT SETUP & MULTI-TENANT FOUNDATION
═══════════════════════════════════════════════════════════════

Build the foundation for GrwFit. This is the first module — everything else depends on it.

REQUIREMENTS

1. Initialize monorepo (Turborepo) with these packages:
   - apps/api (NestJS backend)
   - apps/staff (Next.js gym staff dashboard)
   - apps/admin (Next.js super admin dashboard)
   - apps/member-web (Next.js member portal)
   - apps/sites (Next.js public gym websites)
   - packages/shared-types (TypeScript types shared across apps)
   - packages/db (Prisma schema + migrations)
   - packages/ui (shared shadcn/ui components)
   - packages/config (shared ESLint, Tailwind, tsconfig)

2. Database setup with Supabase + Prisma:
   - Supabase project connection via DATABASE_URL
   - Connection pooling via Supabase PgBouncer
   - Migrations in packages/db/migrations
   - Seed script: 1 demo gym, 3 staff, 20 members

3. Multi-tenant Row-Level Security:
   - Every domain table has gym_id UUID NOT NULL with index
   - RLS policy on every table:
     USING (gym_id = current_setting('app.current_gym_id')::uuid)
   - API middleware sets app.current_gym_id from JWT on every request
   - Super-admin role bypasses RLS via SET ROLE grwfit_admin

4. Base tables:
   - gyms (id, name, slug, subdomain, custom_domain, plan_tier,
           status, gst_no, address, phone, timezone, created_at)
   - platform_users (super admin team)
   - audit_log (id, gym_id, actor_id, actor_type, action, entity,
                entity_id, diff jsonb, ip, user_agent, created_at)

5. NestJS setup:
   - Global validation pipe (class-validator)
   - Global exception filter with consistent error format
   - Swagger at /api/v1/docs
   - Helmet, CORS, rate-limiting (60 req/min per user)
   - JWT module with refresh token rotation
   - Audit log interceptor (auto-logs every POST/PUT/DELETE)
   - Tenant middleware (sets gym_id context from JWT)

6. Frontend setup (all Next.js apps):
   - Tailwind + shadcn/ui configured from packages/ui
   - Dark mode support
   - React Query with default 5min cache
   - Auth provider with JWT refresh logic
   - Shared layout: sidebar + topbar + main content
   - English first, Hindi i18n scaffolded (next-intl)
   - Loading, error, empty states on every page

ACCEPTANCE CRITERIA
- npm run dev starts all apps
- GET /api/v1/health returns 200
- npm run db:seed creates demo data
- RLS verified: query without gym_id context returns 0 rows
- Swagger visible at localhost:3000/api/v1/docs
- All coding standards enforced (ESLint + Prettier configured)

═══════════════════════════════════════════════════════════════
MODULE 1 — AUTH (PHONE OTP FOR STAFF + MEMBERS)
═══════════════════════════════════════════════════════════════

Build the authentication system for GrwFit.

REQUIREMENTS

1. Two user types in separate tables:
   - staff_users (gym_id, phone, name, role, branch_id, is_active)
   - members (gym_id, phone, name, ...)
   Both log in via phone OTP only.

2. Auth flow:
   - POST /api/v1/auth/otp/request { phone, userType: "staff"|"member" }
     - Generates 6-digit OTP
     - Sends via WhatsApp first (Gupshup/Wati), SMS fallback (MSG91)
     - Rate limit: 3 requests per phone per hour
     - OTP valid 5 minutes, single use
   - POST /api/v1/auth/otp/verify { phone, otp, userType }
     - Returns: { accessToken (15min), refreshToken (30day), user, gymId }
   - POST /api/v1/auth/refresh { refreshToken }
   - POST /api/v1/auth/logout

3. Staff with multiple gyms:
   - Return list of gyms after OTP verify
   - POST /api/v1/auth/select-gym { gymId } → new JWT with gymId claim

4. Super Admin auth (separate):
   - POST /api/v1/admin/auth/login { email, password, totpCode }
   - Email + password + 2FA (TOTP via Google Authenticator)
   - IP allowlist check
   - Different JWT issuer: grwfit-platform

5. JWT structure:
   - Staff:    { userId, gymId, role, branchId, type: "staff" }
   - Member:   { userId, gymId, type: "member" }
   - Platform: { userId, platformRole, type: "platform" }

6. Frontend (staff app + member web):
   - Phone input with +91 prefix, Indian format validation
   - OTP input: 6 boxes, auto-advance + paste support
   - Resend OTP timer (30s countdown)
   - Gym selector screen if multi-gym staff
   - Tokens stored in httpOnly cookies — never localStorage
   - Auto-refresh on 401 response

DATABASE
   - auth_otps (phone, otp_hash, user_type, expires_at, used_at, attempts)
   - refresh_tokens (id, user_id, user_type, token_hash, expires_at, revoked_at)
   - login_history (user_id, ip, user_agent, success, created_at)

ACCEPTANCE CRITERIA
- Staff requests OTP → receives WhatsApp → logs in successfully
- Wrong OTP 3 times → phone locked 15 minutes
- Refresh token rotates on every use
- Old refresh tokens revoked on logout
- Super admin requires 2FA every login
- All auth events written to audit_log
- Cross-gym login attempt blocked

═══════════════════════════════════════════════════════════════
MODULE 2 — STAFF & ROLES (RBAC)
═══════════════════════════════════════════════════════════════

Build the role-based access control system.

REQUIREMENTS

1. Four staff roles (hardcoded permission matrix in TypeScript — NOT in DB):

   OWNER      → full access, all branches
   MANAGER    → branch-scoped, no staff mgmt, no billing
   TRAINER    → assigned members only, own commission only
   RECEPTION  → check-in, leads, collect payment; no revenue visibility

2. Permission matrix as TypeScript constant:
   Modules: dashboard, members, checkins, payments, plans,
            workout_diet, leads, reports, staff_mgmt, website_cms,
            billing, commission
   Actions: view, create, edit, delete

   PERMISSIONS = {
     owner:     { members: ['view','create','edit','delete'], ... },
     manager:   { members: ['view','create','edit'], staff_mgmt: [], ... },
     trainer:   { members: ['view'], workout_diet: ['view','create','edit'], ... },
     reception: { members: ['view','create'], checkins: ['view','create'], ... }
   }

3. Three-layer enforcement:
   a) NestJS decorator: @RequiresPermission('members', 'edit')
      - Reads role from JWT, throws 403 if not allowed
   b) Postgres RLS for trainer's assigned members:
      WHERE assigned_trainer_id = current_setting('app.current_user_id')
   c) Frontend hook: usePermission('module', 'action')
      - Hides/disables UI elements based on role

4. Staff management UI (owner only):
   - POST /api/v1/gyms/:gymId/staff
     { name, phone, role, branchId, commissionPct }
   - Sends WhatsApp invite with login link
   - PUT /api/v1/gyms/:gymId/staff/:id
   - DELETE /api/v1/gyms/:gymId/staff/:id (soft delete, is_active=false)
   - List with role badges, last login, branch, actions

5. Trainer assignment:
   - members.assigned_trainer_id FK to staff_users
   - Owner/Manager can assign/reassign
   - Trainer sees ONLY their assigned members via RLS

DATABASE
   - staff_users (id, gym_id, branch_id, phone, email, name, role,
                  commission_pct, is_active, last_login_at,
                  created_by, created_at)
   - branches (id, gym_id, name, address, phone, is_primary, created_at)

ACCEPTANCE CRITERIA
- Owner creates trainer → trainer gets WhatsApp invite
- Trainer sees ONLY their assigned members
- Reception hits /api/v1/reports → 403
- Manager cannot access other branch data via URL manipulation
- Deactivating staff immediately invalidates their refresh tokens
- Permission hook hides UI buttons correctly per role

═══════════════════════════════════════════════════════════════
MODULE 3 — MEMBERS
═══════════════════════════════════════════════════════════════

Build the Members module.

REQUIREMENTS

1. Member profile fields:
   - Basic: name, phone (+91), email, dob, gender, photo_url
   - Address: street, city, state, pincode
   - Emergency: emergency_contact_name, emergency_contact_phone
   - Health: goals (jsonb), health_notes, medical_conditions
   - Membership: current_plan_id, joined_at, expires_at,
                 status (active|expired|frozen|trial)
   - Assignment: assigned_trainer_id, branch_id, tags (jsonb)
   - System: id, gym_id, created_by, created_at

2. List view (server-side paginated):
   - Default 25/page, max 100
   - Filters: status, plan, trainer, branch, joined date, tags
   - Search: name, phone, member_id (fuzzy)
   - Sort: name, joined date, expires_at
   - Bulk: tag, assign trainer, send WhatsApp, export CSV
   - Reusable <DataTable> component — used across all modules

3. Detail view tabs:
   - Overview: plan, expiry, trainer, recent check-ins, payments
   - Attendance: calendar view, streak, monthly summary
   - Payments: history with invoice download
   - Plans: workout & diet (Trainer can edit)
   - Progress: weight chart, measurements, photo timeline
   - Notes: timestamped staff notes

4. Create member flow:
   - Quick add (reception): name, phone, plan → done in <30s
   - Full onboarding: health, goals, photo, emergency contact
   - Auto-generate QR code (member ID encoded)
   - Auto-WhatsApp welcome message with login link

5. Bulk import:
   - CSV/Excel upload with column mapping UI
   - Validate +91 phones, dedupe by phone
   - Preview before commit
   - BullMQ background job for >100 rows

6. Freeze/unfreeze:
   - PUT /api/v1/members/:id/freeze { reason, until_date }
   - Pauses expiry countdown
   - Auto-unfreezes on until_date via cron job

DATABASE
   - members (full schema above)
   - member_notes (id, gym_id, member_id, staff_id, note, created_at)
   - member_freeze_history (member_id, frozen_at, frozen_until,
                            reason, frozen_by)

PERMISSIONS
   - Reception: create + view only
   - Trainer: view assigned only (RLS enforced)
   - Manager: full CRUD in their branch
   - Owner: full CRUD all branches

ACCEPTANCE CRITERIA
- Reception adds member via quick add (name, phone, plan)
- Owner imports 500 members from CSV without timeout
- Trainer sees only their assigned members
- Photo upload works on mobile (camera + crop)
- Member QR prints on 50mm sticker
- <DataTable> is reused — not duplicated

═══════════════════════════════════════════════════════════════
MODULE 4 — CHECK-INS
═══════════════════════════════════════════════════════════════

Build the check-in system. p95 < 200ms even at 50 concurrent scans.

REQUIREMENTS

1. Three check-in methods:
   a) QR scan — receptionist scans member's QR card
   b) Biometric — face match via AWS Rekognition (Pro tier)
   c) Manual — receptionist types name or phone

2. Check-in flow:
   - POST /api/v1/gyms/:gymId/checkins
     { memberId, method, deviceId }
   - Returns within 200ms:
     { success, memberId, name, plan, expiresAt, daysLeft,
       photo, message }
   - Messages: "Welcome back!", "Expires in 3 days", "Renew now"
   - Frontend: green check + member photo + name on big screen
   - Chime sound on success

3. Validations:
   - active/trial → allow
   - expired → warn but allow (configurable per gym)
   - frozen → block with reason
   - Duplicate within 30 min → silent ignore, no duplicate row

4. Kiosk UI (front desk tablet):
   - Full-screen landscape mode
   - Large QR scanner viewfinder (html5-qrcode)
   - Manual search input below scanner
   - Last 10 check-ins as live ticker
   - Today's count + peak hour prediction

5. Reports:
   - GET /api/v1/checkins/today
   - GET /api/v1/checkins/heatmap?days=7
   - GET /api/v1/checkins/member/:memberId
   - GET /api/v1/checkins/no-shows?days=14

6. Performance:
   - Index on (gym_id, checked_in_at DESC)
   - Index on (gym_id, member_id, checked_in_at DESC)
   - Redis cache for member lookup (pre-warmed)
   - Write to DB async via BullMQ after returning response

DATABASE
   - checkins (id, gym_id, branch_id, member_id, checked_in_at,
               method, device_id, created_by)
   - Partition by month for tables >10M rows

ACCEPTANCE CRITERIA
- 50 simultaneous QR scans complete in <300ms each
- Kiosk UI works on 1080p tablet landscape
- Members get WhatsApp notification on check-in (configurable)
- No-show report returns at-risk list in <2 seconds
- Works offline 30 minutes, syncs on reconnect

═══════════════════════════════════════════════════════════════
MODULE 5 — PAYMENTS & GST INVOICING
═══════════════════════════════════════════════════════════════

Build the Payments module with full GST-compliant invoicing.

REQUIREMENTS

1. Payment recording:
   - POST /api/v1/gyms/:gymId/payments
     { memberId, planId, amount, mode, txnRef? }
   - Modes: upi, cash, card, bank_transfer, razorpay
   - Auto-extend member expires_at by plan duration
   - Auto-generate GST invoice PDF
   - Auto-WhatsApp invoice to member

2. GST invoice (mandatory):
   - Sequential number per gym per FY: GRW/2024-25/0001
   - GSTIN of gym from gyms.gst_no
   - HSN/SAC code 999794 for gym services
   - CGST 9% + SGST 9% (intrastate) OR IGST 18% (interstate)
   - Amount breakdown: base + CGST + SGST = total
   - Stored in paise, displayed in ₹

3. Invoice PDF:
   - PDFKit or Puppeteer
   - Gym logo + branding
   - Saved to Supabase Storage / S3
   - Signed URL returned + WhatsApp'd to member

4. Razorpay integration:
   - POST /api/v1/payments/razorpay/create-subscription
   - Webhook: payment.captured, subscription.activated,
              subscription.charged, payment.failed
   - Smart retry on failed payments
   - NACH/UPI auto-debit mandate

5. Cash reconciliation:
   - Daily close-of-day flow
   - Cash received vs cash in drawer
   - Variance report
   - Manager/Owner approval required

6. Refunds:
   - POST /api/v1/payments/:id/refund { amount, reason }
   - Owner/Manager only
   - Razorpay refund API or manual cash log
   - Auto-generate GST-compliant credit note

DATABASE
   - payments (id, gym_id, member_id, plan_id, amount_paise,
               gst_pct, gst_amount_paise, total_paise, mode,
               status, razorpay_payment_id, invoice_number,
               invoice_pdf_url, paid_at, created_by, created_at)
   - invoice_sequences (gym_id, fy, last_number) — atomic counter
   - refunds (id, payment_id, amount_paise, reason, status,
              refunded_at)

ACCEPTANCE CRITERIA
- Reception records cash payment quickly
- Invoice PDF generated and WhatsApp'd within 10 seconds
- Razorpay webhook verified via signature before processing
- Failed payment triggers smart retry + WhatsApp nudge
- GST report exportable for CA
- invoice_sequences uses atomic increment — no duplicate numbers

═══════════════════════════════════════════════════════════════
MODULE 6 — RENEWALS
═══════════════════════════════════════════════════════════════

Build the Renewals module — #1 revenue retention feature.

REQUIREMENTS

1. Renewals dashboard:
   - Cards: due today, due in 7 days, due in 30 days, expired
   - Potential revenue per bucket (calculated in paise, shown in ₹)
   - List: member, plan, expiry, amount, last contacted

2. Filters:
   - Branch, trainer, plan type
   - Expired buckets: <7d, 7–30d, 30–90d, >90d

3. Actions per member:
   - Remind via WhatsApp (approved template)
   - Call now (opens dialer on mobile)
   - Mark contacted (logs follow-up)
   - Auto-renew (if mandate exists)
   - Add note

4. Bulk actions:
   - Send WhatsApp to ALL due-in-7-days
   - Bulk auto-renew for mandate holders
   - Export to CSV

5. Auto-reminder engine (BullMQ cron, runs hourly):
   - 7 days before expiry → reminder
   - 3 days before expiry → reminder + 10% offer
   - 1 day before expiry → urgent reminder
   - On expiry → "We miss you" + win-back offer
   - 7 days after → final attempt
   - 30 days after → mark dormant, stop messaging
   - Owner toggles each reminder + edits templates

6. Follow-up pipeline:
   - "Needs follow-up" if contacted but not renewed
   - Auto-assigned to receptionist who created member
   - Owner sees aging: how long in follow-up per member

DATABASE
   - renewal_reminders (id, gym_id, member_id, type, sent_at,
                        channel, template_id, status)
   - renewal_follow_ups (id, gym_id, member_id, staff_id, outcome,
                         notes, follow_up_at, created_at)
   - whatsapp_templates (id, gym_id, name, meta_template_id,
                         body, variables, status)

ACCEPTANCE CRITERIA
- Dashboard loads in <1.5s with 1,000 members
- Sending WhatsApp to 100 members queues job, returns in <500ms
- Auto-renew via Razorpay mandate works end-to-end
- Receptionist logs call outcome + sets follow-up in <30 seconds
- Owner sees potential revenue per bucket in ₹

═══════════════════════════════════════════════════════════════
MODULE 7 — WHATSAPP ENGINE
═══════════════════════════════════════════════════════════════

Build the WhatsApp automation engine.

REQUIREMENTS

1. BSP integration (Gupshup or Wati — config-driven, swappable):
   - Send template messages (Meta pre-approved)
   - Send session messages (within 24h window)
   - Receive webhooks: delivered, read, replied, failed
   - Media: PDF invoices, images

2. Pre-built templates:
   - Welcome (new member)
   - Renewal reminder (7d, 3d, 1d, expired)
   - Birthday wish
   - Payment receipt + invoice
   - Class booking confirmation
   - Re-engagement ("Haven't seen you in 14 days!")
   - Custom broadcast

3. Template management UI (per gym):
   - List with Meta approval status
   - Variable mapping: {{1}} = member name, {{2}} = plan
   - Test send to owner's phone
   - Edit triggers new Meta approval flow

4. Broadcast:
   - Audience: all active, expired, by trainer, custom filter
   - Schedule: immediate or later
   - Preview count + estimated cost in ₹
   - BullMQ batches of 80/sec (BSP rate limit)
   - Delivery report: sent, delivered, read, failed, replied

5. Auto-trigger rules (config-driven in DB, not hardcoded):
   - Member created → Welcome
   - Payment success → Receipt + Invoice PDF
   - Check-in → configurable on/off
   - 14-day no check-in → Re-engagement
   - Birthday at 9am → Birthday wish
   - Plan expiry (7/3/1 days) → Renewal reminder

6. Opt-in/out:
   - Reply STOP → do_not_message = true
   - Member portal notification preferences toggle
   - Critical messages (invoices) bypass opt-out

7. Cost tracking:
   - Per message cost logged (Marketing ~₹0.90, Utility ~₹0.15)
   - Monthly usage per gym on billing screen

DATABASE
   - whatsapp_messages (id, gym_id, member_id, template_id,
                        status, sent_at, delivered_at, read_at,
                        error, cost_paise)
   - whatsapp_templates (id, gym_id, name, meta_template_id,
                         status, body, variables, category)
   - whatsapp_optouts (gym_id, member_id, opted_out_at, reason)
   - broadcast_campaigns (id, gym_id, template_id,
                          audience_filter, total, sent,
                          delivered, scheduled_for, status)
   - whatsapp_trigger_rules (id, gym_id, event, template_id,
                              is_active, config jsonb)

ACCEPTANCE CRITERIA
- Send 500 renewal reminders in <10 minutes (rate-limited)
- Delivery report updates via webhook in real-time
- Failed messages auto-retry once via SMS (MSG91)
- Opt-out respected within 5 seconds
- BSP provider swappable via config — no code change needed
- Trigger rules managed from DB — no redeploy needed

═══════════════════════════════════════════════════════════════
MODULE 8 — LEADS PIPELINE
═══════════════════════════════════════════════════════════════

Build the Leads/Inquiries pipeline.

REQUIREMENTS

1. Lead capture sources:
   - Walk-in (reception manual add)
   - Website CMS contact form (auto-import)
   - WhatsApp message to gym number (auto-create)
   - Phone call (reception logs)
   - Instagram/Meta Lead Ads webhook (Pro tier)
   - Referral from existing member

2. Pipeline stages (configurable per gym, stored in DB):
   Default: New → Trial Booked → Trial Visited → Negotiating
            → Converted / Lost

3. Kanban board UI:
   - Columns = stages (drag-drop via dnd-kit)
   - Cards: name, phone, source, age, assigned staff, next action
   - Config-driven columns — not hardcoded

4. Lead detail:
   - Contact info + source + UTM tracking
   - Activity timeline (calls, messages, visits)
   - Notes + tags
   - Convert to Member → one-click, pre-fills member form

5. Follow-up rules:
   - Auto-assign to receptionist on creation
   - SLA: respond within 1 hour during business hours
   - Auto-WhatsApp on creation: acknowledgment message
   - Overdue alerts to manager

6. Reports:
   - Conversion funnel by source
   - Time-to-convert
   - Lost reasons breakdown
   - Staff performance: leads handled, conversion %

DATABASE
   - leads (id, gym_id, branch_id, phone, name, email, source,
            source_details jsonb, stage_id, assigned_to, tags,
            status, lost_reason, created_at)
   - lead_stages (id, gym_id, name, position, color, is_default)
   - lead_activities (id, gym_id, lead_id, staff_id, type,
                      notes, created_at)

ACCEPTANCE CRITERIA
- Website form lead appears on Kanban in <5 seconds
- Reception converts lead → member in 2 clicks
- Auto-WhatsApp acknowledgment fires within 30 seconds
- Owner sees conversion funnel for last 30 days
- Pipeline stages configurable per gym — no redeploy

═══════════════════════════════════════════════════════════════
MODULE 9 — TRAINERS, COMMISSION & PLANS
═══════════════════════════════════════════════════════════════

Build trainer management, commission tracking, and workout/diet plans.

REQUIREMENTS

PART A — TRAINERS
1. Trainer profile (extends staff_users):
   - Specializations jsonb, bio, experience years, certifications
   - Photo for member-facing display
   - Commission % on signups, hourly rate for classes

2. Member assignment:
   - Owner/Manager bulk-assigns
   - Or member picks trainer at onboarding (configurable)
   - One primary trainer per member (additional specialists possible)

3. Trainer dashboard home:
   - My members count, today's classes
   - This month commission in ₹
   - Pending plan updates

PART B — COMMISSION
1. Commission rules per trainer (config in DB):
   - % of first month fee on signup
   - Or flat ₹X per signup (stored in paise)
   - Or % of class fees taught
   - Manager configures per trainer

2. Auto-calculation on payment:
   - Payment created → commission row auto-created
   - Status: pending → approved → paid
   - Owner approves monthly batch

3. Payout flow:
   - Monthly report: ₹ per trainer
   - Owner marks paid (cash/bank)
   - Or Razorpay Payouts API
   - Excel export for accountant

PART C — WORKOUT & DIET PLANS
1. Workout plans:
   - Template library with video links
   - Trainer builds per member: day1–day7
   - Each day: exercises with sets/reps/weight
   - Member sees today's plan in app

2. Diet plans:
   - Meal templates: breakfast, lunch, dinner, snacks
   - Calories + macros per meal
   - Hindi + English food names
   - Trainer customizes per member goals

3. Plan delivery:
   - Member sees in app immediately on save
   - PDF export (gym logo, member name, day-by-day)
   - WhatsApp delivery option

4. Progress tracking (member-facing):
   - Weekly weight log
   - Measurements: chest, waist, arm, thigh
   - Progress photos upload
   - Trainer sees aggregated dashboard per member

DATABASE
   - workout_plans (id, gym_id, member_id, trainer_id, name,
                    week jsonb, active, created_at)
   - workout_templates (id, gym_id, name, category,
                        exercises jsonb, is_public)
   - diet_plans (id, gym_id, member_id, trainer_id, meals jsonb,
                 calories, macros jsonb, active)
   - progress_logs (id, gym_id, member_id, weight, measurements
                    jsonb, photo_urls, notes, logged_at)
   - commissions (id, gym_id, trainer_id, member_id, payment_id,
                  amount_paise, status, paid_at)

ACCEPTANCE CRITERIA
- Trainer builds 7-day workout plan quickly
- Member opens app → sees today's workout instantly
- Commission auto-created within 5 seconds of payment
- Monthly payout report exports as Excel
- Plan PDF looks professional with gym branding

═══════════════════════════════════════════════════════════════
MODULE 10 — REPORTS & ANALYTICS
═══════════════════════════════════════════════════════════════

Build the reports module for gym owners.

REQUIREMENTS

1. Revenue Reports:
   - Daily, weekly, monthly, yearly views
   - Breakdown: by plan, branch, source (new vs renewal)
   - Comparison: this period vs last period
   - Charts: line (trend), bar (breakdown), pie (mix)
   - Export: PDF + Excel (with formulas, not just values)

2. Member Reports:
   - Active/expired/frozen counts
   - New signups by period
   - Churn + reasons
   - Cohort retention (% of month-N signups still active)
   - Demographics: age, gender

3. Attendance Reports:
   - Daily check-ins trend
   - Peak hour heatmap (hour × day grid)
   - Average frequency per member
   - No-show / at-risk list

4. Trainer Performance:
   - Members per trainer, retention rate, commission, satisfaction

5. Lead Conversion:
   - Funnel by source, time-to-convert, lost reasons

6. Filter UX (reusable filter component):
   - Date range: today/7d/30d/MTD/QTD/YTD/custom
   - Branch selector (multi-branch)
   - Compare-to toggle (vs prev period)

7. Scheduled reports:
   - Owner schedules daily/weekly email
   - BullMQ cron job for delivery

DATABASE
   - Computed live from existing tables (no separate report DB)
   - Materialized views:
     - mv_daily_revenue (gym_id, date, total_paise, count)
     - mv_member_lifecycle (gym_id, member_id, joined_at,
                            churned_at, last_active_at)
   - Refresh nightly via cron

ACCEPTANCE CRITERIA
- Revenue dashboard loads in <2 seconds (12 months data)
- Cohort retention chart renders accurately
- Excel export has formulas not just values
- Scheduled email delivers reliably
- Multi-branch owner drills into specific branch
- Reusable filter component used across all report pages

═══════════════════════════════════════════════════════════════
MODULE 11 — MEMBER PORTAL (WEB + REACT NATIVE)
═══════════════════════════════════════════════════════════════

Build the member-facing portal — web + mobile.

REQUIREMENTS

1. Two clients, one shared API client package:
   - apps/member-web (Next.js) — m.grwfit.com
   - apps/member-app (React Native, Expo Router)

2. Screens (identical on both platforms):

   A. Login → Phone OTP → Home

   B. Home
      - "Good morning, [name]!"
      - Today's workout card
      - Plan expiry countdown
      - Quick stats: streak, monthly attendance
      - Upcoming class (if booked)
      - Pay dues CTA (if pending)

   C. Onboarding (first login only, 5 steps, skippable)
      - Goals, height/weight/age, health conditions,
        photo, emergency contact

   D. My Plan
      - Today's workout: exercises, sets, reps, video links
      - Mark exercise complete → streak update
      - Diet tab: meals, calories, macros

   E. My Membership
      - Plan, expiry, days remaining
      - Renew Now CTA
      - Payment history + invoice download
      - Auto-pay status

   F. Progress
      - Weight chart, measurements, before/after photos
      - Current + longest streak, badges

   G. Class Booking
      - Calendar of upcoming classes
      - Book / cancel
      - My bookings

   H. Profile & Settings
      - Edit info, notification preferences, logout

3. Push notifications (mobile):
   - 1 hour before class
   - Plan updated by trainer
   - Payment received
   - Renewal reminder
   - Badge earned

4. Branding:
   - Gym's logo/colors prominent
   - GrwFit branding in footer only (white-label feel)

5. Offline support:
   - Today's plan viewable offline
   - Queue actions, sync on reconnect

DATABASE
   - member_devices (id, gym_id, member_id, expo_push_token,
                     platform, created_at)
   - class_bookings (id, gym_id, member_id, class_id,
                     status, booked_at)

ACCEPTANCE CRITERIA
- Member logs in via OTP
- Today's workout loads in <1 second
- Pay dues via UPI works end-to-end
- Push notification arrives within 1 minute
- Today's plan viewable offline
- Gym branding displayed correctly

═══════════════════════════════════════════════════════════════
MODULE 12 — WEBSITE CMS & CUSTOM DOMAINS
═══════════════════════════════════════════════════════════════

Build public gym websites — auto-generated, on gym's own domain.

REQUIREMENTS

1. Three starter templates (all stored in DB, not hardcoded):
   - Modern (clean, white-space)
   - Bold (dark, gym aesthetic)
   - Classic (traditional, trust-focused)
   - All mobile-responsive, LCP < 1.5s

2. CMS editor (in staff dashboard):
   - Sections: Hero, About, Plans, Trainers, Classes,
               Gallery, Testimonials, Contact, Map
   - Each section: toggle, reorder, edit — config-driven
   - Content stored as jsonb per section
   - Auto-pulls Plans + Trainers from CRM data

3. Custom domain flow:
   - Settings → Website → Connect Domain
   - Enter: www.theirgym.com
   - Backend calls Cloudflare for SaaS API
   - UI shows CNAME instructions
   - DNS verification poll every 30s
   - Auto-SSL via Cloudflare
   - Free fallback: gymname.grwfit.com

4. Routing (apps/sites):
   - Next.js middleware reads Host header
   - Looks up gym by domain → renders gym data
   - ISR for speed, on-demand revalidation on content edit

5. SEO:
   - Per-gym meta title/description (editable)
   - Open Graph image
   - LocalBusiness structured data
   - Auto sitemap.xml + robots.txt

6. "Book a free trial" form:
   - On every template
   - Submits → auto-creates Lead in CRM
   - Auto-WhatsApp confirmation to prospect

7. Analytics per gym:
   - Page views, unique visitors, lead conversions
   - Source attribution
   - Shown in gym owner dashboard

DATABASE
   - websites (id, gym_id, template_id, custom_domain,
               cloudflare_hostname_id, ssl_status,
               published_at, content jsonb, seo_meta jsonb)
   - website_analytics (gym_id, date, views,
                        unique_visitors, leads_generated)

ACCEPTANCE CRITERIA
- Content edit goes live in <30 seconds
- Custom domain + SSL works end-to-end
- Lighthouse score >90 on mobile
- Trial form submission appears in CRM instantly
- Template switch preserves all content
- Template designs driven by DB config — not hardcoded

═══════════════════════════════════════════════════════════════
MODULE 13 — SUPER ADMIN DASHBOARD
═══════════════════════════════════════════════════════════════

Build the GrwFit platform team's control center.

REQUIREMENTS

1. Separate app: apps/admin → admin.grwfit.com
   Platform roles (in DB): super_admin, cs_rep, sales, finance

2. Auth:
   - Email + password + TOTP 2FA (speakeasy)
   - IP allowlist middleware
   - Separate JWT issuer: grwfit-platform
   - All actions audit-logged

3. Screens:

   A. Overview — MRR, ARR, paying gyms, churn %, NPS
      MRR growth chart, plan mix, geographic spread,
      recent activity feed

   B. Gyms — search/filter all gyms
      Columns: name, city, plan, members, MRR, health score
      Health score: check-in frequency + payment success + tickets
      Click → gym detail + timeline + impersonate button

   C. Impersonate
      - "Login as owner" → impersonation JWT
      - Banner: "VIEWING AS Iron Forge — exit"
      - Read-only default; write requires super_admin approval
      - Auto-logout after 30 minutes
      - Every action logged with platform user identity

   D. SaaS Billing — GrwFit's own subscriptions
      Failed payments, dunning, refunds, invoice export

   E. Onboarding Pipeline
      - Trial gyms + setup checklist progress
      - Auto-nudge stuck gyms
      - Assign CS rep

   F. Support — ticket queue, SLA timer, CSAT, KB management

   G. Analytics — PostHog embedded
      Cohort retention, activation funnel, feature adoption, churn

   H. Feature Flags — PostHog or Unleash
      Toggle per % of gyms, per-gym overrides, gradual rollouts

   I. Infrastructure Health
      API uptime, p95 latency, error rate, queue depth,
      DB connections, link to Grafana

   J. Compliance
      Audit log search, DPDP data export handling,
      per-gym deletion workflow

   K. Platform Settings
      Pricing catalog, staff management, integration credentials,
      system-wide banners

4. RLS bypass:
   - Postgres role: grwfit_admin
   - SET ROLE on every super-admin query
   - Cannot be triggered by gym JWTs

DATABASE
   - platform_users (id, email, name, role, totp_secret,
                     ip_allowlist, last_login_at, is_active)
   - platform_tickets (id, gym_id, reporter, severity, status,
                       subject, conversation jsonb, created_at,
                       resolved_at, csat)
   - platform_subscriptions (id, gym_id, plan_tier, mrr_paise,
                              status, razorpay_subscription_id,
                              started_at, churned_at)
   - impersonation_sessions (id, platform_user_id, gym_id,
                              started_at, ended_at, reason,
                              actions_taken jsonb)

ACCEPTANCE CRITERIA
- Find any gym in <5 seconds via search
- Impersonate opens gym dashboard in <3 seconds with banner
- All platform actions audit-logged with IP + user agent
- 2FA required every login — no bypass
- RLS bypass only available to grwfit_admin role

═══════════════════════════════════════════════════════════════
MODULE 14 — CLASS BOOKING (PRO TIER)
═══════════════════════════════════════════════════════════════

Build the class booking system.

REQUIREMENTS

1. Class templates (stored in DB, not hardcoded):
   - Name, description, capacity, duration, trainer, equipment
   - Schedule: recurring (rrule.js) or one-off

2. Class instances:
   - Auto-generated 30 days ahead from templates via cron
   - Manager can edit/cancel individual instances

3. Member booking (in member app):
   - Browse + filter upcoming classes
   - Book → instant confirmation + push notification
   - 1-hour-before push reminder
   - Auto-check-in when QR scanned at class

4. Cancellation policy (configurable per gym in DB):
   - 2h/4h/24h cancellation window
   - Late cancel = forfeit credit
   - Waitlist: auto-promote on cancellation

5. Trainer view:
   - My classes today
   - Roster per class
   - Attendance marking (auto via check-in + manual override)

6. Capacity management:
   - Hard cap enforcement
   - Waitlist auto-promotion via BullMQ + WhatsApp notification

7. Member credits:
   - Plan can include N classes per month
   - Track usage, warn when low

DATABASE
   - class_templates (id, gym_id, name, description, capacity,
                      duration_min, trainer_id, recurrence_rule,
                      is_active)
   - class_instances (id, gym_id, template_id, starts_at,
                      ends_at, capacity, trainer_id, status)
   - class_bookings (id, gym_id, instance_id, member_id,
                     status, booked_at, attended)
   - class_waitlist (id, gym_id, instance_id, member_id,
                     position, joined_at)

ACCEPTANCE CRITERIA
- Member books class in <3 taps
- Trainer sees today's roster on tablet
- Waitlist auto-promotion fires within 60 seconds
- Over-booking prevented by capacity enforcement
- Cancellation policy auto-enforced from DB config

═══════════════════════════════════════════════════════════════
MODULE 15 — ONBOARDING WIZARD (NEW GYM SIGNUP)
═══════════════════════════════════════════════════════════════

Build new gym signup + setup wizard.

REQUIREMENTS

1. Public signup:
   - "Start 14-day free trial" CTA
   - Form: gym name, owner name, phone, email, city
   - Phone OTP verification
   - Auto-create gym + owner staff user
   - Auto-login → Setup Wizard

2. Setup wizard (5 steps, progress saved after each):

   STEP 1: Gym Profile
   - Logo upload, address, GSTIN, operating hours, timezone

   STEP 2: Membership Plans
   - Pre-filled templates: Monthly ₹1500, Quarterly ₹4000,
     Annual ₹12000 (all in paise in DB)
   - Owner adjusts, adds custom plans

   STEP 3: Add Staff
   - Add trainers (name, phone, commission %)
   - WhatsApp invite sent to each

   STEP 4: Import Members
   - CSV upload, manual one-by-one, or skip
   - CSV template downloadable
   - Background import with error highlighting

   STEP 5: First Check-in
   - Print QR codes for members (50mm sticker sheet)
   - Demo check-in flow

3. Post-wizard:
   - Welcome banner with 14-day trial countdown
   - Setup checklist sidebar (green when complete)
   - WhatsApp from CS rep

4. Trial expiry:
   - Day 7: reminder WhatsApp + email
   - Day 12: offer (configurable discount)
   - Day 14: convert or read-only downgrade
   - Day 44: auto-delete data (DPDP Act compliance)

5. Conversion:
   - Choose plan: Basic / Standard / Pro
   - Razorpay subscription + mandate setup
   - First month charged immediately

6. Onboarding analytics (in Super Admin):
   - Funnel: signup → step1 → ... → first check-in
   - Time-to-first-value
   - Activation rate per CS rep

ACCEPTANCE CRITERIA
- Owner completes wizard (skipping allowed)
- Wizard resumes from any step
- CSV import background job handles 500 members
- Trial countdown accurate
- Razorpay subscription created on conversion
- All steps progress saved — never lost on refresh

═══════════════════════════════════════════════════════════════
MODULE 16 — AUDIT LOG & COMPLIANCE
═══════════════════════════════════════════════════════════════

Build audit logging + DPDP Act 2023 compliance tools.

REQUIREMENTS

1. Audit log (auto on every write):
   - Who: actor_id, actor_type (staff/member/platform)
   - What: action (create/update/delete), entity, entity_id
   - When: created_at UTC
   - Where: ip, user_agent
   - Diff: before → after as jsonb

2. NestJS interceptor:
   - Wraps every POST/PUT/PATCH/DELETE
   - Captures before/after state
   - Writes async via BullMQ — zero perf impact on request

3. Audit log viewers:
   - Gym owner: their gym, last 90 days, search by user/action/entity
   - Super admin: all gyms, full history
   - Export to CSV

4. DPDP Act 2023 compliance:
   - Consent on signup: operational + marketing (separate)
   - Right to access: member downloads all their data
   - Right to deletion: member requests, gym approves
   - Right to portability: standard format export
   - DPO email configurable per gym

5. Member data export:
   - Profile + attendance + payments + plans + photos
   - PDF + ZIP of photos
   - Delivered within 30 days (per Act)

6. Deletion workflow:
   - Member requests in app
   - Gym owner reviews + approves
   - Soft delete: anonymize PII, set deleted_at
   - Hard delete: 30 days later via cron
   - Audit log retains the deletion action

7. Data retention:
   - Active members: indefinite
   - Inactive >2 years: archive
   - Audit logs: 7 years (Indian law)
   - Backups: 30 days

DATABASE
   - audit_log (id, gym_id, actor_id, actor_type, action,
                entity, entity_id, diff jsonb, ip,
                user_agent, created_at)
   - consents (id, gym_id, member_id, type, granted,
               granted_at, revoked_at)
   - data_export_requests (id, gym_id, member_id, status,
                           file_url, created_at, completed_at)
   - data_deletion_requests (id, gym_id, member_id, status,
                              requested_at, approved_at,
                              deleted_at, approved_by)

ACCEPTANCE CRITERIA
- Audit log adds <10ms latency to write requests
- Owner finds "who changed pricing yesterday" in <5 seconds
- Member data export generates in <2 minutes (1-year history)
- Deletion workflow completes within 30 days
- Audit log search across 1M rows returns in <2 seconds
- Retention policies enforced automatically via cron

═══════════════════════════════════════════════════════════════
MODULE 17 — MARKETING SITE (grwfit.com)
═══════════════════════════════════════════════════════════════

Build the GrwFit public marketing website.

REQUIREMENTS

1. App: apps/marketing → grwfit.com
   Next.js 14, Tailwind, shadcn/ui
   Lighthouse score >90 on mobile, LCP <1.5s

2. Pages:
   - / (Home)
   - /pricing
   - /features
   - /blog (SEO)
   - /about
   - /contact
   - /privacy-policy + /terms-of-service

3. Home page sections:
   - Hero: headline, sub-headline, "Start free trial" CTA
   - Social proof: X gyms, Y members managed, Z cities
   - Features overview (6 key features with icons)
   - How it works (3 steps)
   - Pricing preview (3 tiers)
   - Testimonials from gym owners
   - FAQ
   - Final CTA banner
   - Footer: links, social, contact

4. Pricing page:
   - 3 tiers: Basic / Standard / Pro
   - Monthly / Annual toggle (annual = 2 months free)
   - Feature comparison table
   - All prices from DB/config — never hardcoded
   - "Start free trial" → Module 15 signup

5. Blog (SEO):
   - MDX-based posts
   - Categories: gym management, fitness, business growth
   - Auto sitemap
   - Target keywords: "gym CRM India", "gym management software"

6. Lead capture:
   - "Start free trial" → Module 15 signup flow
   - "Request demo" → form → auto-creates lead in super admin CRM
   - Exit-intent popup (configurable on/off)

7. Analytics:
   - PostHog for visitor tracking
   - Conversion tracking: visitor → trial signup
   - UTM parameter capture → passed to signup

DATABASE
   - No gym_id needed (public site)
   - demo_requests (id, name, phone, email, gym_name,
                    city, created_at)
   - marketing_config (key, value) — prices, feature lists,
                       testimonials — all from DB

ACCEPTANCE CRITERIA
- Lighthouse >90 mobile
- Pricing pulled from DB — no hardcoded numbers
- "Start free trial" connects to Module 15 signup
- Demo request creates lead in super admin CRM
- Blog posts rank for target keywords (structure correct)
- UTM params captured and passed through to signup
═══════════════════════════════════════════════════════════════
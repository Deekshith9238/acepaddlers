# Ace Paddlers — Backend Implementation Plan

Booking Engine · Calendar Integration · CMS

## Decisions locked in
- **Payments:** Request-to-book first; **Razorpay added in a later phase.**
- **CMS:** Custom admin built in this stack (Drizzle/Postgres + admin UI), one deploy, fully typed.
- **Calendar:** (1) internal availability engine, (2) Google Calendar sync for staff, (3) customer "add to calendar" (.ics).
- **CMS content:** Tours & pricing, Bookings dashboard, Blog posts, Gallery & destinations — **plus admin can create a new destination from a template and it appears on the frontend as its own page** (data-driven dynamic routes).
- **Hosting (prod):** **AWS** — API on **App Runner**, DB on **RDS PostgreSQL**.
- **Build order:** **Local-first.** Build & test everything locally now; AWS deployment + IaC is a later phase.
- **Media storage (prod):** **S3.** Images served via **CloudFront**. Videos: **S3 → MediaConvert → CloudFront (HLS)**.
- **Email:** **Amazon SES** (prod).
- **WhatsApp:** **Meta WhatsApp Cloud API** (direct).
- **Calendar sync auth:** one shared ops Google account via OAuth (refresh token).
- **Customer notifications:** **email + WhatsApp.**

> **Provider abstractions** isolate all cloud services (`StorageProvider`, `Transcoder`, `Mailer`, `WhatsappClient`) so local dev runs with **no AWS account**. Swapping to AWS later is a config/implementation change, not a rewrite.

## Current state (what exists)
- Monorepo (pnpm workspaces). Contract-first pipeline already wired:
  - `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec run codegen` (Orval) → React Query hooks in `lib/api-client-react` + Zod schemas in `lib/api-zod`.
  - `artifacts/api-server` — Express 5 (only `/healthz` today).
  - `lib/db` — Drizzle + Postgres (`db`, `pool`); **schema is empty**.
  - `artifacts/ace-paddlers` — React + Vite + wouter + React Query; **all content is hardcoded** in `src/data/*.ts`; booking is a `tel:` "Call to Book" link.
- **This is greenfield.** No tables, no real API, no auth.

## The development loop (every feature follows this)
1. Add/extend tables in `lib/db/src/schema/*.ts` → `pnpm --filter @workspace/db run push`.
2. Edit `lib/api-spec/openapi.yaml` (the contract).
3. `pnpm --filter @workspace/api-spec run codegen` → regenerates hooks + Zod.
4. Implement Express handlers in `artifacts/api-server`, validating req/res with generated Zod.
5. Frontend consumes generated hooks from `@workspace/api-client-react`.
6. Tests (TDD) + typecheck + verify.

---

## Architecture overview (AWS)

```
                     ┌────────────── CloudFront ──────────────┐
 Browser ───────────►│  /            → S3 (Vite SPA: public+/admin)
                     │  /assets/img  → S3 media (images)
                     │  /assets/hls  → S3 media (HLS video)
                     │  /api/*       → ALB → ECS/App Runner (Express)
                     └─────────────────────────────────────────┘
                                          │
                Express API ──────────────┼──────────────────────────┐
                  │                        │                          │
                  ├─► RDS PostgreSQL (Drizzle)                        │
                  ├─► S3 (presigned uploads)                          │
                  ├─► MediaConvert (submit HLS jobs)  ◄── S3 event ───┘
                  ├─► SES (email)                     (Lambda kicks job)
                  ├─► WhatsApp (AWS End User Messaging / Meta Cloud API)
                  ├─► Google Calendar API (staff sync)
                  ├─► Secrets Manager / SSM (config)
                  └─► Razorpay (phase 4)
   EventBridge Scheduler ─► slot generation / housekeeping
```

- **Single Express service**, two route groups: public (`/api/*`) and admin (`/api/admin/*`, auth-gated).
- **Admin UI** lives as a code-split `/admin` section inside the existing Vite app (one build, one deploy). Login-gated.
- **Content is DB-first.** The existing `src/data/*.ts` files become the seed source, then the frontend reads from the API.
- **Frontend is static** (S3 + CloudFront); **API** runs as a container; **everything else is managed AWS.**

---

## Data model (Drizzle tables, one file each under `lib/db/src/schema/`)

1. **destinations** — `id, slug(unique), name, fullName, tagline, description, heroImage, images(jsonb[]), highlights(jsonb[]), bestTime, distance, mapEmbed, seoTitle, seoDescription, published(bool), sortOrder, createdAt, updatedAt`. Drives dynamic `/destinations/:slug` pages.
2. **tours** — `id, slug(unique), destinationId(fk), type(enum: rafting|camping|homestay|water_sports), title, tagline, description, heroImage, images(jsonb[]), priceValue, currency, duration, maxGroupSize, capacityPerSlot, minAge, maxWeight, season, difficulty, highlights/included/excluded(jsonb[]), seoTitle, seoDescription, published, createdAt, updatedAt`.
3. **availability_rules** — recurring availability: `id, tourId(fk), weekdayMask, startTime, capacity, validFrom, validTo, active`. Used to generate slots.
4. **tour_slots** — concrete bookable inventory: `id, tourId(fk), date, startTime, capacity, bookedCount, status(open|closed|full), createdAt`. Unique on `(tourId, date, startTime)`. Source of truth for booking locks.
5. **blackout_dates** — `id, tourId(fk, nullable=global), date, reason`. Closes slots.
6. **bookings** — `id, bookingRef(unique human code), tourId(fk), slotId(fk), customerName, customerEmail, customerPhone, numGuests, guestDetails(jsonb), totalAmount, currency, status(pending|confirmed|cancelled|completed), paymentStatus(unpaid|deposit|paid), googleEventId(nullable), notes, source, createdAt, updatedAt`.
7. **blog_posts** — `id, slug(unique), title, excerpt, coverImage, body(markdown), author, tags(jsonb[]), readTime, status(draft|published), publishedAt, seoTitle, seoDescription`.
8. **gallery_items** — `id, src, alt, caption, category, tall(bool), sortOrder, published`.
9. **media_assets** — `id, url, filename, mime, width, height, createdAt` (uploaded image metadata).
10. **admin_users** — `id, email(unique), passwordHash, name, role(admin|editor), active, createdAt`.
11. **admin_sessions** — `id, userId(fk), tokenHash, expiresAt` (or signed JWT; see auth).
12. **settings** — singleton/kv for integration config incl. Google Calendar OAuth refresh token, target calendarId, notification emails.

**Overbooking safety:** booking creation runs in a transaction that `SELECT … FOR UPDATE` the slot row, checks `bookedCount + numGuests <= capacity`, increments, then inserts the booking. Cancellation decrements.

---

## API surface (OpenAPI-first)

### Public (`/api`)
- `GET /destinations` · `GET /destinations/{slug}`
- `GET /tours` (filter by destination/type) · `GET /tours/{slug}`
- `GET /tours/{slug}/availability?from=&to=` → open slots with remaining capacity
- `POST /bookings` → create request-to-book (validates capacity, status=pending, emails staff + customer)
- `GET /bookings/{ref}?email=` → status + confirmation
- `GET /bookings/{ref}/calendar.ics` → customer add-to-calendar
- `GET /blog` · `GET /blog/{slug}`
- `GET /gallery`

### Admin (`/api/admin`, auth required)
- `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`
- `destinations` / `tours` / `blog` / `gallery` — full CRUD + publish toggle
- `POST /tours/{id}/rules` + slot generation; `PATCH /slots/{id}` (capacity/close); `blackouts` CRUD
- `GET /bookings` (list/filter/search) · `PATCH /bookings/{id}` (confirm/cancel → triggers email + calendar sync)
- `POST /media` (image upload)
- `GET /integrations/google/connect` · `GET /integrations/google/callback` (OAuth) · settings CRUD

---

## Calendar integration

1. **Internal availability engine** — tables 3–5 above. Slots generated from `availability_rules` (a scheduled/admin-triggered job), minus `blackout_dates`. The availability API returns open slots; bookings lock capacity transactionally.
2. **Google Calendar sync (staff)** — one-time OAuth connect in admin settings stores a refresh token (`settings`). On booking **confirm**, server creates a Calendar event (guests, tour, contact) via `googleapis` and stores `googleEventId`; on cancel/edit it updates/deletes that event.
3. **Customer add-to-calendar** — `GET /bookings/{ref}/calendar.ics` builds an iCalendar file; link included in the confirmation email. No third-party dependency.

---

## Local-first development (build & test now, no AWS needed)

Everything cloud-touching sits behind a small interface with a **local implementation** today and an **AWS implementation** later. Same API, swapped via env.

| Concern | Interface | Local (now) | AWS (later) |
|---|---|---|---|
| Object storage | `StorageProvider` | local disk dir, served at `/media/*` by Express | S3 + CloudFront |
| Video transcode | `Transcoder` | **local ffmpeg → HLS** on disk (ffmpeg already installed) | MediaConvert → S3/CloudFront |
| Image variants | (in `StorageProvider`) | Sharp in-process on upload | Lambda(Sharp) on S3 event |
| Email | `Mailer` | Mailpit/console (or Ethereal) | SES |
| WhatsApp | `WhatsappClient` | console log / Meta test number | Meta Cloud API |
| Calendar | `CalendarClient` | real Google OAuth (test calendar) | same |
| Secrets | env | `.env` | Secrets Manager |
| Scheduled jobs | runner | `node-cron`/manual trigger | EventBridge Scheduler |

**Local stack:** Postgres via Docker (`docker compose`), Express API (`pnpm --filter @workspace/api-server dev`, port 5000), Vite app (Vite dev), shared `.env`. The frontend plays HLS via **hls.js** locally and in prod identically — local HLS is produced by ffmpeg, prod by MediaConvert.

## AWS infrastructure & media pipelines (later phase)

### Compute / data
- **Frontend:** Vite build (public + `/admin`) → **S3** static bucket → **CloudFront** (SPA fallback to `index.html`).
- **API:** Dockerized Express → **ECS Fargate behind an ALB** (or **App Runner** for less ops — see sub-decisions), in private subnets.
- **Database:** **Amazon RDS for PostgreSQL** (Multi-AZ for prod) — or Aurora Serverless v2 (sub-decision). Reached via `DATABASE_URL` from Secrets Manager.
- **Config/secrets:** **Secrets Manager / SSM** for `DATABASE_URL`, Google OAuth, SES, WhatsApp, (later) Razorpay. API task assumes an **IAM role** scoped to S3, SES, MediaConvert, Secrets.
- **Scheduled jobs:** **EventBridge Scheduler** → Lambda/ECS task for slot generation from `availability_rules` and housekeeping.
- **IaC:** **AWS CDK (TypeScript)** in an `infra/` package (fits the TS monorepo) — sub-decision.

### Image pipeline (S3 + CloudFront)
1. Admin requests a **presigned S3 PUT URL** from the API → browser uploads the original directly to the **media-input bucket**.
2. S3 `ObjectCreated` event → **Lambda (Sharp)** generates web-optimized variants (e.g. 1280/1800 + webp) into the **media-output bucket**.
3. API records a `media_assets` row (URLs, dims, status). Frontend references the **CloudFront** URL.

### Video pipeline (S3 + MediaConvert + CloudFront, HLS)
1. Admin uploads the source video via presigned URL → **media-input bucket**.
2. S3 event → **Lambda** submits an **AWS Elemental MediaConvert** job (multi-rendition HLS + thumbnail/poster) → **media-output bucket** (`/hls/<id>/index.m3u8`).
3. MediaConvert completion (EventBridge) → Lambda updates `media_assets.status = ready` + stores the HLS manifest URL.
4. **CloudFront** serves HLS; frontend plays via **hls.js** (Safari plays HLS natively). The hero video migrates to this pipeline.

> Note: this replaces the manual `ffmpeg` step from the hero-video work — uploads now transcode automatically.

## Frontend changes
- Replace `src/data/*.ts` reads with generated React Query hooks (keep files only as seed input/types).
- **Dynamic destinations:** turn `Destinations.tsx` into a template; add route `/destinations/:slug` rendering from the API so admin-created destinations appear automatically. Update sitemap + per-page SEO meta from DB.
- **Booking flow** on `TourDetail`: date/slot picker (availability API) → guest count + customer form → `POST /bookings` → confirmation page with status + add-to-calendar. Replaces "Call to Book".
- **Admin app** (`/admin`, code-split, login-gated): dashboard, bookings table, and CRUD editors for tours/destinations/blog/gallery + availability manager + Google Calendar connect.

---

## Auth (default, unless you say otherwise)
- **Admin:** email + password (argon2/bcrypt hash), httpOnly signed session cookie, CSRF protection on mutations, rate-limited login. First admin seeded via script/env.
- **Customers:** guest checkout — no accounts in v1; bookings looked up by `ref` + email.

---

## Phased delivery (local-first)

- **Phase 0 — Local foundations:** Docker Postgres + `docker compose`; Drizzle schemas + push; seed existing static content into DB; OpenAPI contracts + codegen wiring; provider interfaces with local impls; admin auth + first-user seed.
- **Phase 1 — Content APIs + CMS:** public read endpoints for destinations/tours/blog/gallery; frontend migrated to hooks; **dynamic destination pages from a template**; admin CRUD for all content; **media uploads** (local disk + Sharp variants; ffmpeg→HLS for video).
- **Phase 2 — Booking engine (request-to-book):** availability model + API; transactional booking with capacity locking; confirmation page; **notifications (email + WhatsApp via local providers)**; bookings dashboard; customer .ics.
- **Phase 3 — Google Calendar sync:** OAuth connect; event create/update/delete on booking status changes.
- **Phase 4 — AWS deployment:** App Runner (API) + RDS (DB) + S3/CloudFront (frontend & images) + MediaConvert (video) + SES + Meta Cloud API; swap provider impls; IaC (CDK/Terraform — decide then); secrets, scheduler, domains.
- **Phase 5 — Payments (Razorpay):** order creation, checkout, webhook verification, payment status, refunds.
- **Phase 6 — Hardening:** validation coverage, rate limiting, tests, observability, backups, sitemap/SEO automation (incl. SPA prerender decision).

---

## Resolved decisions
- **Build order:** local-first; AWS deployment is Phase 4.
- **Prod compute:** App Runner. **Prod DB:** RDS PostgreSQL.
- **Media:** S3 + CloudFront (images); S3 + MediaConvert + CloudFront/HLS (video). Local: disk + ffmpeg→HLS.
- **Email:** SES (prod) / Mailpit (local). **WhatsApp:** Meta WhatsApp Cloud API.
- **Google sync:** shared ops account via OAuth.
- **Deferred to Phase 4:** IaC tool (CDK vs Terraform), VPC/networking, Secrets Manager wiring.

## Key risks / watch-items
- **Overbooking** under concurrency → enforced by transactional slot locking (designed above).
- **Bundle size** → admin section must be code-split so the public site stays light.
- **SEO for dynamic pages** → current app is a client-rendered SPA; for new DB-driven destination pages to rank we'll likely need **prerendering/SSG** (e.g. CloudFront + a prerender Lambda, or SSG those routes). Decide early in Phase 1.
- **SES production access** → account starts in **sandbox** (can only email verified addresses); request production access + verify domain/DKIM early.
- **WhatsApp template approval** → Meta reviews message templates (lead time); design booking templates up front.
- **MediaConvert** → per-minute transcode cost + IAM role for the service; set sensible HLS rendition ladder.
- **Secrets** → Google OAuth, SES, WhatsApp, (later) Razorpay in Secrets Manager.

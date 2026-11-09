# Ace Paddlers — guide for Claude

Ace Paddlers runs rafting, water sports, camping and homestays in Coorg and Chikmagalur
(Karnataka). This repo is the whole business system: the public site
(https://www.acepaddlers.com), online booking and payments, the admin panel, and the
email/WhatsApp notifications. Read this file before changing anything.

## Rules that are not optional

- **A push to `main` deploys to production.** Nothing else does. Never push to `main`
  (or merge into it) unless the user asks to deploy. Work on a branch; commit only when asked.
- **This repository is public on GitHub.** Never commit secrets, tokens, customer data or
  `.env` files. Secrets live in AWS Secrets Manager and in `infra/terraform/terraform.tfvars`
  (gitignored, only on the user's MacBook). Never print a secret value in output.
- **Money is in whole rupees** in the database. Razorpay amounts are in **paise** (×100).
- **Database migrations run automatically when the server boots.** A migration merged to
  `main` runs against production on the next deploy. Check it is safe on real data first.
- **Generated code is checked in.** After editing `lib/api-spec/openapi.yaml`, run codegen
  and commit the regenerated files.
- **Barapole's trip page has a hand-saved layout** (`tour:barapole-rafting`). Never reset it
  or push the default trip layout onto it without asking.
- **SEO work stays in meta tags / structured data** unless the user asks for visible page
  content (they rejected a visible "popular searches" footer).
- Git on these Macs has no global identity. Commit with
  `git -c user.name="Deekshith" -c user.email="<the email used in recent commits>" commit …`
  (copy it from `git log -1 --format='%an <%ae>'`) rather than changing git config.

## Repo map

```
artifacts/api-server     Express 5 API + serves the built site (Node, esbuild bundle)
  src/app.ts             middleware stack; /api router; SPA + SEO catch-all
  src/routes/            public routes (booking.ts, content.ts, stays.ts, enquiry.ts…)
  src/routes/admin/      admin routes (all behind requireAdmin + role capabilities)
  src/lib/booking.ts     createBooking, toBookingDetail / toPublicBookingDetail, markBookingPaidAndConfirm
  src/lib/pricing.ts     quote engine (participant types, add-ons, group tiers, coupons, charges)
  src/lib/trip-rules.ts  deposits (amountDueNow), payment deadlines, lead time
  src/lib/payments-ledger.ts  the payment ledger — source of truth for paid/due
  src/lib/notify.ts      every email + WhatsApp send
  src/lib/seo.ts         server-side meta/JSON-LD injection, sitemap
  src/lib/stays.ts       partner homestay requests
artifacts/ace-paddlers   React + Vite site and admin panel (wouter, react-query)
lib/api-spec             openapi.yaml — the API contract (source of truth)
lib/api-zod              generated Zod schemas (do not edit by hand)
lib/api-client-react     generated react-query hooks (do not edit by hand)
lib/db                   Drizzle schema (src/schema/*) + migrations (drizzle/*.sql)
infra/terraform          AWS infrastructure + deploy.sh (the server-side deploy script)
.github/workflows        ci.yml (checks) and deploy.yml (production deploy)
docs/backend-local-dev.md  original local-dev notes
scripts/src/seed.ts      STALE — imports data files that no longer exist; don't rely on it
```

## First-time setup on a new Mac

```bash
# Node 22 via nvm (the toolchain also accepts 24; typecheck is verified on 22.23.1)
nvm install 22.23.1 && nvm use 22.23.1
corepack enable            # gives you pnpm; npm/yarn are blocked by preinstall
pnpm install               # at the repo root
docker compose up -d       # Postgres 16 on localhost:5433 (container acepaddlers-postgres)
```

Local DB URL: `postgresql://postgres:postgres@localhost:5433/postgres`.
`pnpm-workspace.yaml` enforces a 1-day minimum release age for npm packages — do not disable it.

## Everyday commands

```bash
# Typecheck (what CI runs)
pnpm -w run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/ace-paddlers run typecheck

# Run API + site together (API :8080, Vite :18764)
pnpm run dev

# Build
pnpm --filter @workspace/api-server run build        # -> artifacts/api-server/dist/index.mjs
PORT=18764 BASE_PATH=/ pnpm --filter @workspace/ace-paddlers run build   # -> artifacts/ace-paddlers/dist

# API contract changed? regenerate zod + hooks, then commit the generated files
pnpm --filter @workspace/api-spec run codegen

# Schema changed? generate a migration (never use `push` against a DB you care about)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres pnpm --filter @workspace/db run generate

# Server self-checks (CI runs these; each is a plain assert script)
cd artifacts/api-server
for f in lib/stays lib/pricing middlewares/publicForms; do
  NODE_ENV=production DATABASE_URL=postgresql://unused@localhost/unused \
  node_modules/.bin/esbuild "src/$f.check.ts" --bundle --platform=node --format=cjs \
    --external:pg-native --log-level=warning --outfile=dist/check.cjs && node dist/check.cjs
done

# Local psql
docker exec -it acepaddlers-postgres psql -U postgres -d postgres
```

### Running the built server locally (with the site and an admin)

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres PORT=8091 \
PUBLIC_SITE_URL=http://localhost:8091 WEB_DIR=$PWD/artifacts/ace-paddlers/dist \
ADMIN_EMAIL=admin@local.test ADMIN_PASSWORD=<pick-one> \
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

- `ADMIN_EMAIL` + `ADMIN_PASSWORD` create the first admin on boot if missing.
- With no `RESEND_API_KEY` / `WHATSAPP_TOKEN`, emails and WhatsApp messages are **logged to
  the console instead of sent** — safe for testing.
- `WEB_DIR` must point at a real site build; SEO rendering reads its `index.html`.
- The SEO module caches `index.html`: after rebuilding the site under a running server,
  restart it (or `POST /api/admin/seo/rebuild`).
- For a throwaway test DB: `docker exec acepaddlers-postgres psql -U postgres -c "CREATE DATABASE scratch;"`
  then point `DATABASE_URL` at `/scratch`; migrations create the schema on boot. Drop it after.
- Admin API auth: `POST /api/admin/auth/login {email,password}` returns `{token}`; send
  `Authorization: Bearer <token>`.

## How the business logic works

### Booking styles (all verified end-to-end, 2026-11-09)
Set per trip in Admin → Trips:
- **Direct** (`bookingMode=direct`): customer pays online (Razorpay Standard Checkout);
  booking confirms when paid.
- **Enquiry** (`bookingMode=enquiry`): no payment taken; the team follows up. (Barapole is enquiry.)
- **Deposit** (`allowPartialDeposit` + `depositPercent`): paying the deposit confirms the
  booking; `paymentStatus` becomes `deposit` and the balance stays on the ledger. A payment
  below the deposit does not confirm. (Bhadra is live with a 50% deposit.)
- **Rate card** (Admin → trip → Prices): participant types (Adult/Child…), add-ons
  (`per_unit` / `per_person` / `per_booking`, min/max, required), group tiers (price drops at
  N+ guests), and per-trip charges/taxes applied after discount.
- **Add-ons only**: allowed only when the trip has `details.addonOnly = true`.
- **Coupons**: percent or fixed; discount never exceeds the base.
- **Stays**: a homestay trip shows rooms only when a **partner** is linked (Admin → Stays).
  Guests send a request; the partner approves on WhatsApp; then the guest pays.

Prices are always computed server-side (`lib/pricing.ts`); the booking body is a strict
allowlist, so clients cannot set totals or statuses.

### Payments
- `payments` rows are the ledger. `bookingPaymentSummary()` gives `{paid, refunded, net, due, total}`
  and is the only source of truth for what was paid. `bookings.payment_status` is
  re-derived from it.
- Paths that mark money in: Razorpay webhook (`/api/webhooks/razorpay`, HMAC-verified),
  checkout verify (`/api/bookings/:ref/verify-payment`, signature + order ownership),
  admin manual entry, Admin "Check with Razorpay" sync. All funnel into
  `markBookingPaidAndConfirm()`, which confirms and sends the confirmation.
- Any response that shows paid/due must pass the ledger net into `toBookingDetail` /
  `toPublicBookingDetail` (a missing one caused the deposit display bug fixed 2026-11-09).

### Notifications
- **Email** goes through Resend (`lib/resend.ts`, plain fetch). SES is a fallback, console
  is the local default. The Resend key is send-only: a 401 on read endpoints is normal.
  Admins edit plain-text templates (Admin → Email templates); `lib/email-layout.ts` wraps
  them in the branded HTML. Template variables include `{{amountPaid}}` / `{{amountDue}}`.
- **WhatsApp** uses Meta's Cloud API. **Free-form messages to anyone outside Meta's 24-hour
  window are accepted (HTTP 200) and then silently dropped.** Business-initiated messages
  must use an approved template — `sendWaNotification()` sends the template and falls back
  to free text. Template params cannot contain newlines.
  Approved templates: `booking_received`, `payment_confirmed`, `payment_link`,
  `trip_reminder`, `trip_itinerary`, `staff_new_booking`, `staff_new_review`,
  `staff_cart_abandoned`, `staff_form_started`, plus stay templates. A new template must be
  created at Meta (`POST /v21.0/<WABA id>/message_templates`) and approved before use.
- Staff alert recipients: env `NOTIFY_EMAILS` and `NOTIFY_PHONES` (comma-separated).
- After a payment confirms, customers get the confirmation plus `trip_itinerary`
  (map link from the trip's saved pin/address + numbered itinerary). The day-before
  reminder sends both again.

### Site, pages and SEO
- The site is a client-rendered SPA. For crawlers, `lib/seo.ts` injects per-route title,
  meta, canonical, Open Graph and one JSON-LD `@graph` into `index.html` server-side, from
  the DB. Canonical origin is `https://www.acepaddlers.com` (the bare domain only 301s).
  `sitemap.xml` is generated from the DB. Admin "Rebuild SEO" re-warms the 10-minute cache.
- **Trip pages are not stored pages**: every trip renders a default layout of live blocks
  (`lib/trip-page-template.ts`) that read the trip record. Saving a trip in the page builder
  detaches it from the template (Barapole is the one detached trip). Change all trip pages
  by editing the template, not the DB.
- Blog posts live in the `blog_posts` table. Seed content changes ship as **data-only
  migrations** (see below).

## Production

- **Server:** one EC2 instance (`i-0692edf1a559e79e3`, t2.micro, ap-south-1b), Caddy (TLS)
  in front of the app container on 127.0.0.1:8081/8082. **Database:** RDS Postgres
  (private — only reachable from inside AWS). **Region:** ap-south-1.
- **Deploy = push to `main`.** `.github/workflows/deploy.yml`: CI checks → if migrations
  changed, an RDS snapshot → previous image tagged `rollback-<date>-<time>` → build and push
  to ECR → SSM runs `infra/terraform/deploy.sh` on the server (new container on the spare
  port, health check, old one removed — no downtime) → curl `/api/healthz`.
  ~5–6 minutes. "Run workflow" on GitHub deploys any branch by hand.
- **Shipping a feature branch:** merge it into `main` and push. A merge-commit without
  touching the working tree:
  ```bash
  git fetch origin
  M=$(git commit-tree "$(git merge-tree --write-tree origin/main HEAD)" -p origin/main -p HEAD -m "Merge <branch>: <what>")
  git push origin "$M:refs/heads/main"
  ```
  (In zsh write `"$M:refs/..."` with the quotes — `$M:r` is a zsh modifier.)
- **Watch a deploy** (no `gh` needed):
  ```bash
  curl -s "https://api.github.com/repos/Deekshith9238/acepaddlers/actions/runs?branch=main&per_page=3" \
    | python3 -c "import sys,json;[print(r['id'],r['name'],r['status'],r['conclusion'],r['head_sha'][:7]) for r in json.load(sys.stdin)['workflow_runs']]"
  ```
- **Verify after deploy:** `curl https://www.acepaddlers.com/api/healthz`, then check the
  changed endpoint or page. The site's JS is code-split; to confirm new front-end code is
  live, grep the chunk files listed in the served bundle for a string you added.
- **App settings (non-secret env):** SSM parameter `/acepaddlers-prod/env`, generated by
  Terraform from `terraform.tfvars`; secrets come from Secrets Manager. `deploy.sh` reads
  both **at deploy time**, so a settings change needs `terraform apply -target=aws_ssm_parameter.app_env`
  and then a redeploy (re-run the SSM document with the current image tag:
  `aws ssm send-command --region ap-south-1 --instance-ids i-0692edf1a559e79e3 --document-name acepaddlers-prod-deploy --parameters tag=<sha7>`).
- **Rollback:** run the same SSM document with `tag=rollback-<date>-<time>`; restore the
  pre-deploy RDS snapshot only if data is the problem.
- **Terraform and AWS credentials exist only on the user's MacBook.** From the Mac mini, do
  not attempt `terraform apply`, prod DB queries or SSM commands — hand those to the user.
  (Even on the MacBook, Claude's permission checker blocks `terraform apply`, production
  log/DB reads and container access; the user runs those.)

### Data-only migration recipe (content changes)
drizzle-kit generates nothing when the schema is unchanged, so write it by hand:
1. `lib/db/drizzle/00NN_<name>.sql` — idempotent SQL (`ON CONFLICT DO NOTHING`, or update
   only rows still holding the old value, so admin edits are never overwritten).
2. Copy the previous `meta/00NN_snapshot.json` to the new number with a new `id` and
   `prevId` = the previous snapshot's `id`.
3. Add an entry to `meta/_journal.json` (next `idx`, `when` greater than the last, `tag` = file
   name without `.sql`). Keep the trailing newline.
Production is at **0035** (Bhadra rafting blog post) as of 2026-11-09.

## Testing recipes

- **Booking flow end to end, locally:** create a trip via `POST /api/admin/tours`, save a
  rate card (`PUT /api/admin/tours/:id/rate-card`), open dates
  (`POST /api/admin/tours/:id/slots/generate`), then `POST /api/quote` and
  `POST /api/bookings`. Record a payment with `POST /api/admin/bookings/:id/payments
  {kind:"payment", amount, method:"upi"}` — it confirms the booking exactly like a gateway
  payment. Customer view: `GET /api/bookings/:ref` and the page `/booking/:ref`.
- Real Razorpay signatures can't be produced locally; `verify-payment` correctly rejects
  forged ones (`invalid_signature` / `order_mismatch`).
- Prefer a throwaway database for tests and drop it afterwards.

## Known state and open items (as of 2026-11-09)

- `feat/backend-phase-0` holds commit `5efb030` (left-the-form staff alert + "pay later"
  from the booking page) that is **not on `main`**. It merges cleanly with current main.
- Admin login has **no brute-force throttle** (public forms do: `protectPublicForm`,
  20 per 15 min per IP). User chose not to fix yet.
- `X-Powered-By: Express` is exposed and CORS is wildcard — low-priority hardening.
- Booking AP-EY72QX is confirmed but has ₹0 on the ledger; it needs "Check with Razorpay"
  in admin if it was really paid.
- Saved admin email templates may still say `{{totalAmount}}` where `{{amountPaid}}` /
  `{{amountDue}}` is meant — the user edits those in Admin → Email templates.
- `/p/home` and `/p/corporate` duplicate pages exist; the user declined removing them.
- `scripts/src/seed.ts` is stale (imports removed data files).

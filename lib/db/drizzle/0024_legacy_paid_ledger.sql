-- Bookings marked paid (or refunded) by hand before the payments ledger existed
-- have no settled payment rows behind them. The ledger re-derives
-- bookings.payment_status from those rows every time a booking is opened, so
-- without this each such booking silently flips to "unpaid" the first time
-- anyone looks at it.
--
-- Each gets a placeholder entry (provider 'legacy') for what its status already
-- asserts. "Check with Razorpay" replaces the placeholder when it finds the real
-- payment, and an admin can remove it like any manual entry.
--
-- Safe to re-run: a booking that already has a settled payment row is skipped.
-- "deposit" is deliberately not backfilled — how much was taken was never
-- recorded, and a guessed amount in a money ledger is worse than none.
INSERT INTO "payments" ("booking_id", "provider", "kind", "method", "amount", "currency", "status", "received_at", "notes")
SELECT b."id", 'legacy', 'payment', 'other', b."total_amount", b."currency", 'paid', b."updated_at",
       'Marked paid by hand before payments were tracked — how it was paid was not recorded.'
FROM "bookings" b
WHERE b."payment_status" IN ('paid', 'refunded')
  AND b."total_amount" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "payments" p
    WHERE p."booking_id" = b."id" AND p."kind" = 'payment' AND p."status" = 'paid'
  );
--> statement-breakpoint
-- A booking marked refunded needs the money to go back out again as well, or
-- the placeholder above would leave it reading "paid".
INSERT INTO "payments" ("booking_id", "provider", "kind", "method", "amount", "currency", "status", "received_at", "notes")
SELECT b."id", 'legacy', 'refund', 'other', paid.amt - ref.amt, b."currency", 'paid', b."updated_at",
       'Marked refunded by hand before payments were tracked — how it was refunded was not recorded.'
FROM "bookings" b
CROSS JOIN LATERAL (
  SELECT COALESCE(SUM(p."amount"), 0) AS amt FROM "payments" p
  WHERE p."booking_id" = b."id" AND p."kind" = 'payment' AND p."status" = 'paid'
) paid
CROSS JOIN LATERAL (
  SELECT COALESCE(SUM(p."amount"), 0) AS amt FROM "payments" p
  WHERE p."booking_id" = b."id" AND p."kind" = 'refund' AND p."status" = 'paid'
) ref
WHERE b."payment_status" = 'refunded'
  AND paid.amt - ref.amt > 0;

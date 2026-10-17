import { randomInt } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, customers, bookings, enquiries } from "@workspace/db";
import type { Customer } from "@workspace/db";
import { logger } from "./logger";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function generateCustomerRef(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `AP-C-${s}`;
}

/**
 * Reduces a phone number to a comparable key. Indian numbers arrive in every
 * shape — "9481058562", "+91 94810 58562", "094810-58562", "919481058562" —
 * and all of them are the same person. We keep the last 10 digits, which is
 * the full subscriber number in India and stable across every prefix form.
 *
 * Returns null for anything too short to identify someone, so those rows keep
 * a NULL key and never collide with each other in the unique index.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  return s ? s : null;
}

/** Follows the merge pointer so callers always land on the surviving record. */
export async function resolveCustomer(id: string): Promise<Customer | null> {
  let [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  // Merge chains are short by construction, but guard against a cycle rather
  // than trusting that.
  for (let hops = 0; row?.mergedIntoId && hops < 10; hops++) {
    const next = row.mergedIntoId;
    [row] = await db.select().from(customers).where(eq(customers.id, next)).limit(1);
  }
  return row ?? null;
}

export interface CustomerIdentity {
  name: string;
  email?: string | null;
  phone?: string | null;
  salutation?: string | null;
}

/**
 * Finds the customer behind a booking/enquiry, creating them on first contact.
 * Matches on normalised phone first (always present on a booking), then on
 * e-mail for web enquiries that gave no usable number.
 *
 * Never throws: customer records are a reporting convenience, and failing to
 * attach one must never cost us the booking that was being made.
 */
export async function upsertCustomer(input: CustomerIdentity): Promise<Customer | null> {
  try {
    const phoneNormalized = normalizePhone(input.phone);
    const email = normalizeEmail(input.email);
    if (!phoneNormalized && !email) return null;

    const match = phoneNormalized
      ? eq(customers.phoneNormalized, phoneNormalized)
      : eq(sql`lower(${customers.email})`, email!);
    const [existing] = await db.select().from(customers).where(match).limit(1);

    if (existing) {
      const survivor = existing.mergedIntoId ? await resolveCustomer(existing.id) : existing;
      if (!survivor) return null;
      // Fill in blanks from the newer contact without overwriting what we have
      // — a later booking that omits an e-mail shouldn't erase the one we hold.
      const patch: Partial<Customer> = {};
      if (!survivor.email && email) patch.email = email;
      if (!survivor.phone && input.phone) patch.phone = input.phone;
      if (!survivor.phoneNormalized && phoneNormalized) patch.phoneNormalized = phoneNormalized;
      if (!survivor.salutation && input.salutation) patch.salutation = input.salutation;
      if (Object.keys(patch).length > 0) {
        const [updated] = await db
          .update(customers)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(customers.id, survivor.id))
          .returning();
        return updated ?? survivor;
      }
      return survivor;
    }

    const [created] = await db
      .insert(customers)
      .values({
        customerRef: generateCustomerRef(),
        name: input.name?.trim() || "Guest",
        email,
        phone: input.phone ?? null,
        phoneNormalized,
        salutation: input.salutation ?? null,
      })
      .returning();
    return created ?? null;
  } catch (err) {
    logger.error({ err }, "upsertCustomer failed");
    return null;
  }
}

export interface CustomerStats {
  totalBookings: number;
  totalEnquiries: number;
  lastBookingDate: string | null;
  lifetimeValue: number;
}

/** Aggregates computed on read rather than denormalised onto the row, so they
 *  can never drift out of sync with the bookings they describe. */
export async function customerStats(customerId: string): Promise<CustomerStats> {
  const [b] = await db
    .select({
      total: sql<number>`count(*)::int`,
      last: sql<string | null>`max(${bookings.createdAt})::text`,
      value: sql<number>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.paymentStatus} = 'paid'), 0)::int`,
    })
    .from(bookings)
    .where(eq(bookings.customerId, customerId));
  const [e] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(eq(enquiries.customerId, customerId));
  return {
    totalBookings: b?.total ?? 0,
    totalEnquiries: e?.total ?? 0,
    lastBookingDate: b?.last ?? null,
    lifetimeValue: b?.value ?? 0,
  };
}

/**
 * Merges `loserId` into `winnerId`: every booking and enquiry is repointed,
 * blank fields on the winner are filled from the loser, and the loser is kept
 * as a tombstone pointing at the winner so old links still resolve.
 */
export async function mergeCustomers(winnerId: string, loserId: string): Promise<Customer | null> {
  if (winnerId === loserId) return resolveCustomer(winnerId);
  return db.transaction(async (tx) => {
    const [winner] = await tx.select().from(customers).where(eq(customers.id, winnerId)).limit(1);
    const [loser] = await tx.select().from(customers).where(eq(customers.id, loserId)).limit(1);
    if (!winner || !loser) return null;

    await tx.update(bookings).set({ customerId: winnerId }).where(eq(bookings.customerId, loserId));
    await tx.update(enquiries).set({ customerId: winnerId }).where(eq(enquiries.customerId, loserId));

    const patch: Partial<Customer> = {};
    if (!winner.email && loser.email) patch.email = loser.email;
    if (!winner.phone && loser.phone) patch.phone = loser.phone;
    if (!winner.salutation && loser.salutation) patch.salutation = loser.salutation;
    const tags = Array.from(new Set([...(winner.tags ?? []), ...(loser.tags ?? [])]));
    if (tags.length !== (winner.tags ?? []).length) patch.tags = tags;

    // The unique phone index would reject the tombstone keeping its key, and
    // the winner may need to claim it.
    if (!winner.phoneNormalized && loser.phoneNormalized) patch.phoneNormalized = loser.phoneNormalized;
    await tx
      .update(customers)
      .set({ mergedIntoId: winnerId, phoneNormalized: null, updatedAt: new Date() })
      .where(eq(customers.id, loserId));

    const [updated] = await tx
      .update(customers)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(customers.id, winnerId))
      .returning();
    return updated ?? winner;
  });
}

/** Candidate duplicates: same normalised e-mail across different records.
 *  (Phone duplicates cannot exist — the unique index prevents them.) */
export async function duplicateCandidates(): Promise<{ email: string; ids: string[] }[]> {
  const rows = await db
    .select({
      email: sql<string>`lower(${customers.email})`,
      ids: sql<string[]>`array_agg(${customers.id}::text)`,
      n: sql<number>`count(*)::int`,
    })
    .from(customers)
    .where(and(isNull(customers.mergedIntoId), sql`${customers.email} is not null and ${customers.email} <> ''`))
    .groupBy(sql`lower(${customers.email})`)
    .having(sql`count(*) > 1`);
  return rows.map((r) => ({ email: r.email, ids: r.ids }));
}

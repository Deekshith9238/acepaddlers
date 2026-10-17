import { asc, eq } from "drizzle-orm";
import { db, charges as chargesTable, settings } from "@workspace/db";
import type { Charge as ChargeRow, ChargeLine } from "@workspace/db";
import { logger } from "./logger";

export const CHARGES_KEY = "charges";

export type Charge = ChargeRow;

/** IST date, matching how every other date rule in the system is evaluated. */
function todayIst(): string {
  return new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
}

/**
 * Whether a charge applies to a given tour on a given date.
 *
 * Both dimensions default to "applies": an empty tour list means every tour,
 * and an open-ended window means forever. A charge only stops applying when
 * someone has deliberately narrowed it.
 */
export function chargeApplies(
  c: ChargeRow,
  tourId: string | null,
  on: string,
  paymentMethod: string | null = null,
): boolean {
  if (!c.active) return false;
  if (c.validFrom && on < c.validFrom) return false;
  if (c.validTo && on > c.validTo) return false;
  const tours = c.tourIds ?? [];
  if (tours.length > 0 && (!tourId || !tours.includes(tourId))) return false;
  const methods = c.paymentMethods ?? [];
  // A method-scoped charge is left out until a method is actually known.
  // Including it on an unknown method would over-quote every booking that
  // ends up paying some other way, and a customer being charged a card
  // surcharge they never incurred is the worse failure.
  if (methods.length > 0 && (!paymentMethod || !methods.includes(paymentMethod))) return false;
  return true;
}

/** Every charge, including inactive and expired ones — for the admin screen. */
export async function listCharges(): Promise<ChargeRow[]> {
  return db.select().from(chargesTable).orderBy(asc(chargesTable.sortOrder), asc(chargesTable.createdAt));
}

/**
 * The charges that actually apply to one booking. Callers pass the tour so a
 * charge scoped to specific tours is honoured; passing null means "unscoped
 * charges only", which is what a generic quote gets.
 */
export async function getCharges(
  tourId: string | null = null,
  on: string = todayIst(),
  paymentMethod: string | null = null,
): Promise<ChargeRow[]> {
  const all = await listCharges();
  return all.filter((c) => chargeApplies(c, tourId, on, paymentMethod));
}

/** True when any live charge depends on how the customer pays — which is what
 *  makes the booking form ask for a method at all. */
export async function hasMethodScopedCharges(tourId: string | null = null, on: string = todayIst()): Promise<boolean> {
  const all = await listCharges();
  return all.some(
    (c) =>
      c.active &&
      (c.paymentMethods ?? []).length > 0 &&
      !(c.validFrom && on < c.validFrom) &&
      !(c.validTo && on > c.validTo) &&
      ((c.tourIds ?? []).length === 0 || (!!tourId && c.tourIds.includes(tourId))),
  );
}

/** Resolves a base rupee amount + the applicable charges into a line-item
 *  breakdown and grand total. Single source of truth for "addition of all". */
export function computeCharges(base: number, charges: ChargeRow[]): { breakdown: ChargeLine[]; total: number } {
  const breakdown: ChargeLine[] = charges.map((c) => ({
    label: c.label,
    type: c.type as "percent" | "flat",
    value: c.value,
    amount: Math.round(c.type === "percent" ? (base * c.value) / 100 : c.value),
  }));
  const total = base + breakdown.reduce((sum, c) => sum + c.amount, 0);
  return { breakdown, total };
}

export interface ChargeInput {
  id?: string | null;
  label: string;
  type: "percent" | "flat";
  value: number;
  tourIds?: string[];
  paymentMethods?: string[];
  validFrom?: string | null;
  validTo?: string | null;
  active?: boolean;
}

/** Replaces the whole charge list. Rows absent from the payload are deleted —
 *  unlike a rate card, a charge carries no history of its own (past bookings
 *  snapshot their own breakdown). */
export async function saveCharges(input: ChargeInput[]): Promise<ChargeRow[]> {
  const clean = input.filter((c) => c.label?.trim() && Number.isFinite(c.value));
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: chargesTable.id }).from(chargesTable);
    const keep = new Set(clean.map((c) => c.id).filter(Boolean) as string[]);
    for (const row of existing) {
      if (!keep.has(row.id)) await tx.delete(chargesTable).where(eq(chargesTable.id, row.id));
    }
    for (const [i, c] of clean.entries()) {
      const values = {
        label: c.label.trim(),
        type: c.type === "flat" ? "flat" : "percent",
        value: Math.max(0, Math.round(c.value)),
        tourIds: c.tourIds ?? [],
        paymentMethods: c.paymentMethods ?? [],
        validFrom: c.validFrom || null,
        validTo: c.validTo || null,
        active: c.active ?? true,
        sortOrder: i,
        updatedAt: new Date(),
      };
      if (c.id && keep.has(c.id)) {
        await tx.update(chargesTable).set(values).where(eq(chargesTable.id, c.id));
      } else {
        await tx.insert(chargesTable).values(values);
      }
    }
  });
  return listCharges();
}

export interface ChargeHealth {
  expired: { id: string; label: string; validTo: string }[];
  expiringSoon: { id: string; label: string; validTo: string; daysLeft: number }[];
  notYetActive: { id: string; label: string; validFrom: string }[];
}

/**
 * Surfaces validity problems for the admin dashboard.
 *
 * This exists because of exactly what happened on the previous platform: every
 * tax rule expired and nothing said so, and bookings ran untaxed for two years
 * before an audit noticed. Silent expiry is the failure mode worth shouting
 * about.
 */
export async function chargeHealth(on: string = todayIst()): Promise<ChargeHealth> {
  const all = await listCharges();
  const health: ChargeHealth = { expired: [], expiringSoon: [], notYetActive: [] };
  for (const c of all) {
    if (!c.active) continue;
    if (c.validTo && on > c.validTo) {
      health.expired.push({ id: c.id, label: c.label, validTo: c.validTo });
    } else if (c.validTo) {
      const days = Math.round((Date.parse(`${c.validTo}T00:00:00Z`) - Date.parse(`${on}T00:00:00Z`)) / 86_400_000);
      if (days <= 30) health.expiringSoon.push({ id: c.id, label: c.label, validTo: c.validTo, daysLeft: days });
    }
    if (c.validFrom && on < c.validFrom) {
      health.notYetActive.push({ id: c.id, label: c.label, validFrom: c.validFrom });
    }
  }
  return health;
}

/**
 * One-time move of the old settings-blob charges into the table.
 *
 * Runs on boot and is a no-op once the table has rows, so an existing
 * deployment keeps charging exactly what it charged before the change.
 */
export async function migrateLegacyCharges(): Promise<void> {
  try {
    const existing = await db.select({ id: chargesTable.id }).from(chargesTable).limit(1);
    if (existing.length > 0) return;
    const [row] = await db.select().from(settings).where(eq(settings.key, CHARGES_KEY)).limit(1);
    const legacy = Array.isArray(row?.value) ? (row.value as { label?: string; type?: string; value?: number }[]) : [];
    if (legacy.length === 0) return;
    await db.insert(chargesTable).values(
      legacy
        .filter((c) => c.label && typeof c.value === "number")
        .map((c, i) => ({
          label: String(c.label).trim(),
          type: c.type === "flat" ? "flat" : "percent",
          value: Math.max(0, Math.round(c.value!)),
          tourIds: [],
          active: true,
          sortOrder: i,
        })),
    );
    logger.info({ count: legacy.length }, "migrated legacy charges from settings into the charges table");
  } catch (err) {
    logger.error({ err }, "legacy charge migration failed");
  }
}

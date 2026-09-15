import { and, asc, eq } from "drizzle-orm";
import { db, tourParticipantTypes, tourPriceTiers, tourAddons } from "@workspace/db";
import type {
  Tour,
  TourParticipantType,
  TourPriceTier,
  TourAddon,
  ParticipantLine,
  AddonLine,
  ChargeLine,
} from "@workspace/db";
import { getCharges, computeCharges } from "./charges";

export class PricingError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export interface ParticipantSelection {
  typeId: string;
  count: number;
}
export interface AddonSelection {
  addonId: string;
  qty: number;
}

export interface RateCard {
  participantTypes: TourParticipantType[];
  tiers: TourPriceTier[];
  addons: TourAddon[];
}

/** Everything a tour charges for, in one round trip. */
/**
 * A tour's live rates.
 *
 * `variantId` narrows it to one way of doing the trip: rows scoped to that
 * variant plus the unscoped ones that apply to all of them. Passing `undefined`
 * returns everything, which is what the admin screens want and what every tour
 * without variants gets anyway. Passing `null` — a booking against a slot with
 * no variant — keeps only the unscoped rows, so a variant's private rate can
 * never be charged on a departure it doesn't belong to.
 */
export async function loadRateCard(tourId: string, variantId?: string | null): Promise<RateCard> {
  const scoped = <T extends { variantId: string | null }>(rows: T[]): T[] =>
    variantId === undefined ? rows : rows.filter((r) => r.variantId === null || r.variantId === variantId);

  const [participantTypes, tiers, addons] = await Promise.all([
    db
      .select()
      .from(tourParticipantTypes)
      .where(and(eq(tourParticipantTypes.tourId, tourId), eq(tourParticipantTypes.active, true)))
      .orderBy(asc(tourParticipantTypes.sortOrder)),
    db.select().from(tourPriceTiers).where(eq(tourPriceTiers.tourId, tourId)).orderBy(asc(tourPriceTiers.minGuests)),
    db
      .select()
      .from(tourAddons)
      .where(and(eq(tourAddons.tourId, tourId), eq(tourAddons.active, true)))
      .orderBy(asc(tourAddons.sortOrder)),
  ]);
  return { participantTypes: scoped(participantTypes), tiers, addons: scoped(addons) };
}

/**
 * The volume rate for one participant type at a given total head count, or
 * null when no band matches.
 *
 * Two rules, and the second one matters more than it looks:
 *
 * 1. A tier scoped to a participant type wins over a tour-wide one, so
 *    "children are 600 in a group of 30+" sits alongside a general group rate.
 *    A scoped tier is an explicit statement about that type and is applied
 *    exactly as written.
 * 2. A tour-wide tier only applies where it is *cheaper* than the type's own
 *    price. Volume pricing exists to reward bigger groups, so a general band
 *    must never raise a price — without this, a ₹0 infant or a discounted
 *    child rate gets swept up to the adult group rate and the family is
 *    overcharged.
 */
export function resolveTierPrice(
  tiers: TourPriceTier[],
  participantTypeId: string | null,
  totalGuests: number,
  listPrice: number,
): number | null {
  const matches = tiers.filter(
    (t) => totalGuests >= t.minGuests && (t.maxGuests == null || totalGuests <= t.maxGuests),
  );
  if (matches.length === 0) return null;
  const specific = matches.find((t) => t.participantTypeId && t.participantTypeId === participantTypeId);
  if (specific) return specific.price;
  const general = matches.find((t) => !t.participantTypeId);
  if (!general) return null;
  return general.price < listPrice ? general.price : null;
}

export interface QuoteInput {
  tour: Tour;
  rateCard: RateCard;
  /** Explicit per-type counts. Omitted for the simple "N guests" flow. */
  participants?: ParticipantSelection[];
  /** Used when `participants` is absent — priced against the default type. */
  numGuests?: number;
  addons?: AddonSelection[];
  /** Rupees already resolved by the coupon engine. */
  discountAmount?: number;
  /** How the customer intends to pay. Decides which method-scoped charges
   *  apply; null leaves all of them out. */
  paymentMethod?: string | null;
}

export interface Quote {
  participantLines: ParticipantLine[];
  addonLines: AddonLine[];
  /** Participants + add-ons, before discount and before taxes. */
  baseAmount: number;
  discountAmount: number;
  chargesBreakdown: ChargeLine[];
  totalAmount: number;
  currency: string;
  /** Total head count. */
  numGuests: number;
  /** Head count that consumes slot capacity — an infant-in-arms type may not. */
  seatsUsed: number;
}

/**
 * Prices one prospective booking. Every path that needs a number — the public
 * quote endpoint, booking creation, admin re-pricing, the WhatsApp bot — goes
 * through here, so they cannot drift apart.
 *
 * Order of operations: participants (with volume tiers) + add-ons = base;
 * the coupon discount comes off that base; taxes and fees are then computed on
 * what's left, so the customer is taxed on what they actually pay.
 */
export async function quoteBooking(input: QuoteInput): Promise<Quote> {
  const { tour, rateCard } = input;
  const types = rateCard.participantTypes;

  // ── Participants ──
  let selections: { type: TourParticipantType | null; count: number }[];
  if (input.participants && input.participants.length > 0) {
    if (types.length === 0) throw new PricingError("tour_has_no_participant_types");
    selections = input.participants
      .filter((p) => p.count > 0)
      .map((p) => {
        const type = types.find((t) => t.id === p.typeId);
        if (!type) throw new PricingError("unknown_participant_type");
        return { type, count: Math.floor(p.count) };
      });
  } else {
    const n = Math.floor(input.numGuests ?? 0);
    if (n < 1) throw new PricingError("invalid_guests");
    // No rate card, or a caller that only knows a head count: use the tour's
    // own price, or the first participant type if one is configured.
    selections = [{ type: types[0] ?? null, count: n }];
  }
  if (selections.length === 0) throw new PricingError("invalid_guests");

  const numGuests = selections.reduce((sum, s) => sum + s.count, 0);
  if (numGuests < 1) throw new PricingError("invalid_guests");
  const seatsUsed = selections.reduce(
    (sum, s) => sum + (s.type === null || s.type.occupiesSeat ? s.count : 0),
    0,
  );

  const participantLines: ParticipantLine[] = selections.map(({ type, count }) => {
    const listPrice = type ? type.price : tour.priceValue;
    const tierPrice = resolveTierPrice(rateCard.tiers, type?.id ?? null, numGuests, listPrice);
    const unitPrice = tierPrice ?? listPrice;
    return {
      typeId: type?.id ?? null,
      label: type?.label ?? "Guest",
      count,
      unitPrice,
      amount: unitPrice * count,
      ...(tierPrice != null && tierPrice !== listPrice ? { tierApplied: true } : {}),
    };
  });

  // ── Add-ons ──
  const chosen = new Map((input.addons ?? []).map((a) => [a.addonId, Math.floor(a.qty)]));
  const addonLines: AddonLine[] = [];
  for (const addon of rateCard.addons) {
    // A required add-on is charged whether or not the caller asked for it.
    const requested = chosen.get(addon.id) ?? (addon.required ? Math.max(1, addon.minQty) : 0);
    if (requested <= 0) continue;
    if (requested < addon.minQty) throw new PricingError("addon_below_min");
    if (addon.maxQty != null && requested > addon.maxQty) throw new PricingError("addon_above_max");

    const amount =
      addon.priceType === "per_person"
        ? addon.price * numGuests
        : addon.priceType === "per_booking"
          ? addon.price
          : addon.price * requested;
    addonLines.push({
      addonId: addon.id,
      label: addon.label,
      qty: addon.priceType === "per_booking" ? 1 : requested,
      unitPrice: addon.price,
      priceType: addon.priceType,
      amount,
    });
  }
  // An id that matches no active add-on is a stale client, not a free extra.
  for (const id of chosen.keys()) {
    if (!rateCard.addons.some((a) => a.id === id)) throw new PricingError("unknown_addon");
  }

  const participantsTotal = participantLines.reduce((sum, l) => sum + l.amount, 0);
  const addonsTotal = addonLines.reduce((sum, l) => sum + l.amount, 0);
  const baseAmount = participantsTotal + addonsTotal;

  // Discount never exceeds the base — a large flat coupon on a small booking
  // must not produce a negative subtotal that taxes then act on.
  const discountAmount = Math.max(0, Math.min(input.discountAmount ?? 0, baseAmount));

  // Scoped to this tour and to the chosen payment method, so a per-tour tax or
  // a card surcharge each apply only where they should.
  const charges = await getCharges(tour.id, undefined, input.paymentMethod ?? null);
  const { breakdown, total } = computeCharges(baseAmount - discountAmount, charges);

  return {
    participantLines,
    addonLines,
    baseAmount,
    discountAmount,
    chargesBreakdown: breakdown,
    totalAmount: total,
    currency: tour.currency,
    numGuests,
    seatsUsed,
  };
}

/** The pre-discount base, for coupon rules that test booking value. Cheap
 *  enough to run before the full quote and free of tax/discount interplay. */
export function quoteBaseOnly(quote: Quote): number {
  return quote.baseAmount;
}

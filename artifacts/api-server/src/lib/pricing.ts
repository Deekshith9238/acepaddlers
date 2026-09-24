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
 * 2. A tour-wide tier is Vacation Labs' slab pricing: for full-price guests
 *    it *is* the per-head rate, applied exactly as written — so "1–5 guests
 *    ₹1,500, 6+ ₹1,200" charges a couple ₹1,500 even though the base price
 *    says ₹1,200. (It used to apply only when cheaper, which silently ignored
 *    every small-group slab.) For a discounted type — a child, a ₹0 infant —
 *    it still only applies when cheaper, so a family is never swept up to
 *    the adult group rate.
 */
export function resolveTierPrice(
  tiers: TourPriceTier[],
  participantTypeId: string | null,
  totalGuests: number,
  listPrice: number,
  /** The highest list price on the trip; a guest paying it is "full price". */
  fullPrice: number = listPrice,
): number | null {
  const matches = tiers.filter(
    (t) => totalGuests >= t.minGuests && (t.maxGuests == null || totalGuests <= t.maxGuests),
  );
  if (matches.length === 0) return null;
  const specific = matches.find((t) => t.participantTypeId && t.participantTypeId === participantTypeId);
  if (specific) return specific.price;
  const general = matches.find((t) => !t.participantTypeId);
  if (!general) return null;
  return listPrice >= fullPrice || general.price < listPrice ? general.price : null;
}

export interface QuoteInput {
  tour: Tour;
  rateCard: RateCard;
  /** Explicit per-type counts. Omitted for the simple "N guests" flow. */
  participants?: ParticipantSelection[];
  /** Used when `participants` is absent — priced against the default type. */
  numGuests?: number;
  addons?: AddonSelection[];
  /**
   * Sell the add-ons alone — someone who wants the jet ski but not the trip.
   * The head count still applies (seats are taken, per-person add-ons are
   * priced by it); only the trip's own fare is left off.
   */
  addonsOnly?: boolean;
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

  // Only the trip that says so may be sold as add-ons alone: a flag on the
  // wire must never turn an ordinary trip free of charge.
  const addonsOnly =
    input.addonsOnly === true &&
    (() => {
      if ((tour.details as Record<string, unknown> | null)?.addonOnly !== true) {
        throw new PricingError("addons_only_not_allowed");
      }
      return true;
    })();

  const fullPrice = types.length ? Math.max(...types.map((t) => t.price)) : tour.priceValue;
  const participantLines: ParticipantLine[] = (addonsOnly ? [] : selections).map(({ type, count }) => {
    const listPrice = type ? type.price : tour.priceValue;
    const tierPrice = resolveTierPrice(rateCard.tiers, type?.id ?? null, numGuests, listPrice, fullPrice);
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

    /**
     * On a per-person add-on the minimum is a minimum *party*, not a quantity:
     * a banana boat that needs four people is sold to four, and two customers
     * taking it pay for four. Anything else is a per-unit count, where the
     * minimum and maximum bound what the customer may ask for.
     */
    const perPerson = addon.priceType === "per_person";
    /**
     * With the trip off the list there is no party booking it, so each extra
     * carries its own head count — a speed boat for two and a banana boat for
     * four in the same booking. With the trip on the list the party is the
     * party, and the count is the guests.
     */
    const perPersonCount = addonsOnly ? requested : numGuests;
    const billedGuests = perPerson ? Math.max(perPersonCount, addon.minQty) : numGuests;
    if (!perPerson) {
      if (requested < addon.minQty) throw new PricingError("addon_below_min");
      if (addon.maxQty != null && requested > addon.maxQty) throw new PricingError("addon_above_max");
    }

    const amount = perPerson
      ? addon.price * billedGuests
      : addon.priceType === "per_booking"
        ? addon.price
        : addon.price * requested;
    addonLines.push({
      addonId: addon.id,
      label: addon.label,
      qty: perPerson ? billedGuests : addon.priceType === "per_booking" ? 1 : requested,
      unitPrice: addon.price,
      priceType: addon.priceType,
      amount,
    });
  }
  // An id that matches no active add-on is a stale client, not a free extra.
  for (const id of chosen.keys()) {
    if (!rateCard.addons.some((a) => a.id === id)) throw new PricingError("unknown_addon");
  }

  // Add-ons alone still have to be something: no extras chosen would otherwise
  // price a booking at zero.
  if (addonsOnly && addonLines.length === 0) throw new PricingError("no_addons_selected");

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

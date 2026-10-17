import type { Tour } from "@workspace/db";
import type { RateCard } from "./pricing";

/** Wire shape for a tour's rate card. `basePrice` is the fallback used when no
 *  participant types are configured, so a client can always price a booking. */
export function serializeRateCard(tour: Tour, card: RateCard) {
  return {
    currency: tour.currency,
    basePrice: tour.priceValue,
    participantTypes: card.participantTypes.map((t) => ({
      id: t.id,
      variantId: t.variantId ?? null,
      label: t.label,
      description: t.description,
      price: t.price,
      minAge: t.minAge,
      maxAge: t.maxAge,
      occupiesSeat: t.occupiesSeat,
      sortOrder: t.sortOrder,
      active: t.active,
    })),
    tiers: card.tiers.map((t) => ({
      id: t.id,
      participantTypeId: t.participantTypeId,
      minGuests: t.minGuests,
      maxGuests: t.maxGuests,
      price: t.price,
    })),
    addons: card.addons.map((a) => ({
      id: a.id,
      variantId: a.variantId ?? null,
      label: a.label,
      description: a.description,
      price: a.price,
      priceType: a.priceType as "per_unit" | "per_person" | "per_booking",
      minQty: a.minQty,
      maxQty: a.maxQty,
      required: a.required,
      sortOrder: a.sortOrder,
      active: a.active,
    })),
  };
}

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Phone, Minus, Plus, ChevronLeft, ChevronRight, ArrowLeft, X, CheckCircle2 } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useGetAvailability, useCreateBooking, useGetBooking, useGetTour, useGetTourRateCard, useVerifyBookingPayment, useValidateCoupon, quoteBooking, type QuoteResult, type Slot, type BookingDetail } from "@workspace/api-client-react";
import { C } from "@/data/constants";
import { formatINR } from "@/lib/content";
import { fetchCharges, fetchPaymentMethods, computeCharges, type Charge, type PaymentMethodOption } from "@/lib/charges";
import { loadRazorpayCheckout } from "@/lib/razorpayCheckout";
import { track, analyticsSessionId } from "@/lib/analytics";
import type { BookingText } from "@/lib/site-config";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function parseDate(d: string): Date {
  return new Date(`${d}T00:00:00`);
}
function formatDateLong(d: string): string {
  return parseDate(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function BookingModal({
  tourSlug,
  priceValue,
  phone,
  txt,
  showSeatCount,
  callButtonLabel,
  onClose,
}: {
  tourSlug: string;
  priceValue: number;
  phone: string;
  txt: BookingText;
  showSeatCount: boolean;
  callButtonLabel: string;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  /**
   * The trip's own booking rules, straight from the trip editor.
   *
   * Everything here is enforced again on the server — this only keeps the form
   * from offering something the booking would then be refused for.
   */
  const { data: tripRules } = useGetTour(tourSlug, { query: { retry: false } } as never);
  const rules = tripRules ?? undefined;
  const { data: slots, isLoading } = useGetAvailability({ tour: tourSlug });
  // Booking mode is per-tour, so read it from the tour itself rather than
  // threading it through every parent that renders this modal.
  const { data: tour } = useGetTour(tourSlug);

  // The top of the booking funnel. Paired with booking_created, this is what
  // makes the drop-off between "opened the form" and "booked" measurable.
  // The page behind must not scroll with the popup open: on a short screen the
  // wheel would otherwise carry on past the form and move the page underneath.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    track("booking_started", { path: `/tours/${tourSlug}`, tourId: tour?.id ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourSlug, tour?.id]);
  const bookingMode = tour?.bookingMode ?? "direct";
  const create = useCreateBooking();

  // Variants are ways of doing the same trip off one calendar — Rooms, Day
  // visit, Camping. Departures belong to a variant, so the customer picks the
  // variant first and the calendar narrows to it. A trip without variants
  // behaves exactly as before.
  const { data: rateCard } = useGetTourRateCard(tourSlug);
  const variants = useMemo(() => (rateCard?.variants ?? []).filter((v) => v.active), [rateCard]);
  const [variantId, setVariantId] = useState<string | null>(null);
  useEffect(() => {
    if (variants.length > 0 && !variantId) setVariantId(variants[0].id);
  }, [variants, variantId]);

  /** Cheapest configured rate for a variant, for the "from" line on its card. */
  const variantPrice = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of variants) {
      const prices = (rateCard?.participantTypes ?? [])
        .filter((t) => t.active && t.variantId === v.id)
        .map((t) => t.price);
      if (prices.length > 0) m.set(v.id, Math.min(...prices));
    }
    return m;
  }, [variants, rateCard]);

  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [monthInitialized, setMonthInitialized] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string>("");
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cphone, setCphone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  // Only asked for when a live charge actually depends on it — otherwise the
  // form is unchanged and the customer picks their method inside Razorpay.
  const [payMethods, setPayMethods] = useState<PaymentMethodOption[]>([]);
  const [payMethodRequired, setPayMethodRequired] = useState(false);
  const [payMethod, setPayMethod] = useState<string | null>(null);
  // Guards the "started filling" alert so it fires at most once per visit to
  // this form, however much the visitor edits their details afterwards.
  const intentSent = useRef(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const validateCoupon = useValidateCoupon();
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentMethods(tourSlug).then(({ methods, required }) => {
      setPayMethods(methods);
      setPayMethodRequired(required);
      // Default to the first option so a total is always concrete; the
      // customer can change it and the price follows.
      if (required && methods.length > 0) setPayMethod((m) => m ?? methods[0].key);
    });
  }, [tourSlug]);

  /**
   * Tells the team someone is part-way through the form.
   *
   * Debounced rather than fired per keystroke: a phone number typed one digit
   * at a time would otherwise send a dozen alerts, each with a half-finished
   * number. Waits until they pause, requires both a name and a plausible
   * number, and only ever fires once.
   */
  useEffect(() => {
    if (intentSent.current) return;
    const cleanName = name.trim();
    const digits = cphone.replace(/\D/g, "");
    if (cleanName.length < 2 || digits.length < 10) return;

    const timer = setTimeout(() => {
      if (intentSent.current) return;
      intentSent.current = true;
      // Fire-and-forget: this must never delay or interfere with the booking.
      fetch(`${(import.meta.env.VITE_API_URL as string) || ""}/api/booking-intent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerName: cleanName, customerPhone: cphone.trim(), tourSlug }),
        keepalive: true,
      }).catch(() => undefined);
    }, 2500);
    return () => clearTimeout(timer);
  }, [name, cphone, tourSlug]);

  // Re-priced whenever the method changes, because that is exactly what a
  // method-scoped charge keys off.
  useEffect(() => {
    fetchCharges(tourSlug, payMethod).then(setCharges);
  }, [tourSlug, payMethod]);

  // Once a booking exists, poll it until it's paid — a background safety net
  // in case the Checkout `handler` never fires in this tab (e.g. the browser
  // lost JS context during a mobile UPI app-switch); the webhook confirms it
  // server-side regardless, and this picks that up without a page refresh.
  const { data: booking } = useGetBooking(bookingRef ?? "", {
    query: {
      enabled: !!bookingRef,
      refetchInterval: (query: { state: { data?: { paymentStatus?: string } } }) =>
        query.state.data?.paymentStatus === "unpaid" ? 4000 : false,
    },
  } as never);

  const available: Slot[] = useMemo(
    () => (variants.length > 0 ? (slots ?? []).filter((s) => s.variantId === variantId) : (slots ?? [])),
    [slots, variants.length, variantId],
  );

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of available) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [available]);

  useEffect(() => {
    if (monthInitialized || available.length === 0) return;
    const earliest = [...available].sort((a, b) => a.date.localeCompare(b.date))[0];
    setViewMonth(startOfMonth(parseDate(earliest.date)));
    setMonthInitialized(true);
  }, [available, monthInitialized]);

  useEffect(() => {
    setSlotId("");
  }, [variantId]);

  const dayOfSlots = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];
  const selected = available.find((s) => s.id === slotId);
  /**
   * Three limits, and the tightest wins: the seats left on the departure, the
   * trip's maximum party size, and a sane default when nothing is picked yet.
   * Minimum party size raises the floor rather than the ceiling — a trip that
   * needs four people should open the form at four, not make someone click.
   */
  /* Calendar or a plain list of departures — a per-trip choice in the editor. */
  const asList = rules?.departureDisplay === "list";
  const minGuests = Math.max(1, rules?.minParticipants ?? 1);
  const maxGuests = Math.min(
    selected ? selected.remaining : 8,
    rules?.maxParticipants ?? Number.POSITIVE_INFINITY,
  );

  const unitPrice = (variantId ? variantPrice.get(variantId) : undefined) ?? priceValue;
  /* A trip with a four-person minimum should open at four. Only ever raises:
     someone who has already chosen six must not be knocked back down. */
  useEffect(() => {
    setGuests((g) => (g < minGuests ? minGuests : g));
  }, [minGuests]);

  // Once a departure is picked, the server prices the booking — the same code
  // that charges it — so group rates, per-type prices, the coupon and fees
  // shown here are exactly what gets billed. This used to be worked out here
  // as base price × guests, which never saw a group rate: six guests on a
  // "6+ at ₹1,200" trip were shown the full price.
  /**
   * Priced extras the trip sells, narrowed to the chosen variant — the same
   * rows the admin's Addons tab saves. A required one is charged whether or
   * not it is asked for, so it is shown as included rather than as a choice.
   */
  const addons = useMemo(
    () =>
      (rateCard?.addons ?? [])
        .filter((a) => a.active && (a.variantId == null || a.variantId === variantId))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [rateCard, variantId],
  );
  /** Booking-form choices made per trip in the editor's Addons tab. */
  const tripDetails = (rules?.details ?? {}) as Record<string, unknown>;
  const addonColumns = Math.min(4, Math.max(1, Number(tripDetails.addonColumns) || 1));
  const addonOnlyAllowed = tripDetails.addonOnly === true;
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  /** True when the customer is buying extras alone — no seat on the trip itself. */
  const [addonsOnly, setAddonsOnly] = useState(false);
  // Switching variant can take an add-on off the table; a selection the server
  // no longer recognises fails the whole quote, so drop it.
  useEffect(() => {
    setAddonQty((q) => {
      const kept = Object.fromEntries(Object.entries(q).filter(([id]) => addons.some((a) => a.id === id)));
      return Object.keys(kept).length === Object.keys(q).length ? q : kept;
    });
  }, [addons]);
  useEffect(() => {
    if (!addonOnlyAllowed || addons.length === 0) setAddonsOnly(false);
  }, [addonOnlyAllowed, addons.length]);
  const addonQtyOf = (a: (typeof addons)[number]): number =>
    a.required ? Math.max(1, a.minQty) : (addonQty[a.id] ?? 0);
  const addonSelections = useMemo(
    () => addons.flatMap((a) => {
      const qty = a.required ? Math.max(1, a.minQty) : (addonQty[a.id] ?? 0);
      return qty > 0 ? [{ addonId: a.id, qty }] : [];
    }),
    [addons, addonQty],
  );

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  useEffect(() => {
    if (!slotId) { setQuote(null); return; }
    let live = true;
    // Extras alone with nothing chosen is not a booking; leave the last quote
    // rather than asking the server to price nothing.
    if (addonsOnly && addonSelections.length === 0) { setQuote(null); return; }
    quoteBooking({ slotId, numGuests: guests, addons: addonSelections, addonsOnly, couponCode: appliedCode, paymentMethod: payMethod })
      .then((q) => { if (live) setQuote(q); })
      .catch(() => { if (live) setQuote(null); });
    return () => { live = false; };
  }, [slotId, guests, addonSelections, addonsOnly, appliedCode, payMethod]);

  // Until then (or if the quote fails), a local estimate — including the
  // trip-wide group rate for this head count, as the server applies it to a
  // full-price guest, so the number doesn't jump when a time is picked.
  const groupTier = (rateCard?.tiers ?? []).find(
    (t) => !t.participantTypeId && guests >= t.minGuests && (t.maxGuests == null || guests <= t.maxGuests),
  );
  const estimateUnit = groupTier ? groupTier.price : unitPrice;
  // Priced the way the server prices them, so the total doesn't jump once a
  // departure is picked and the real quote arrives.
  const localAddonLines = useMemo(
    () => addons.flatMap((a) => {
      const qty = a.required ? Math.max(1, a.minQty) : (addonQty[a.id] ?? 0);
      if (qty <= 0) return [];
      const amount = a.priceType === "per_person" ? a.price * guests
        : a.priceType === "per_booking" ? a.price
        : a.price * qty;
      return [{ label: a.label, amount }];
    }),
    [addons, addonQty, guests],
  );
  const localBase = (addonsOnly ? 0 : estimateUnit * guests) + localAddonLines.reduce((sum, l) => sum + l.amount, 0);
  // Charges are computed on the base after any discount, matching how the
  // server prices the booking.
  const localBreakdown = useMemo(() => computeCharges(Math.max(0, localBase - discount), charges), [localBase, discount, charges]);
  const lines = quote?.participantLines ?? [];
  const shownUnit = lines.length === 1 ? lines[0].unitPrice : estimateUnit;
  const groupRateApplied = quote ? lines.some((l) => l.tierApplied) : !!groupTier && groupTier.price !== unitPrice;
  const baseAmount = quote?.baseAmount ?? localBase;
  const shownAddonLines = quote ? quote.addonLines : localAddonLines;
  // The guests row must not swallow the extras: base minus what the add-ons cost.
  const participantsAmount = baseAmount - shownAddonLines.reduce((sum, l) => sum + l.amount, 0);
  const shownDiscount = quote ? quote.discountAmount : discount;
  const breakdown = quote?.chargesBreakdown ?? localBreakdown;
  const total = quote?.totalAmount ?? Math.max(0, localBase - discount) + localBreakdown.reduce((sum, c) => sum + c.amount, 0);

  /**
   * The form is as wide as its add-on grid needs. A one-column trip keeps the
   * narrow popup it has always had, and the calendar step never widens — only
   * the step that actually shows the add-ons.
   */
  const shellWidth =
    selectedDate && addons.length > 0
      ? ({ 1: "max-w-md", 2: "max-w-2xl", 3: "max-w-4xl", 4: "max-w-5xl" }[addonColumns] ?? "max-w-md")
      : "max-w-md";

  const COUPON_MESSAGES: Record<string, string> = {
    not_found: "We don't recognise that code.",
    inactive: "That code isn't active any more.",
    not_yet_valid: "That code isn't valid yet.",
    expired: "That code has expired.",
    usage_limit_reached: "That code has been fully claimed.",
    customer_limit_reached: "You've already used that code.",
    tour_not_eligible: "That code doesn't apply to this trip.",
    weekday_not_eligible: "That code only applies to certain days — try another date.",
    too_late: "That code needs to be booked further in advance.",
    below_minimum: "Your booking is below the minimum for that code.",
  };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code || !slotId) return;
    setCouponMsg(null);
    validateCoupon.mutate(
      { data: { code, slotId, numGuests: guests } },
      {
        onSuccess: (r) => {
          if (r.ok && r.discount > 0) {
            setAppliedCode(r.code ?? code);
            setDiscount(r.discount);
            setCouponMsg(null);
          } else {
            setAppliedCode(null);
            setDiscount(0);
            setCouponMsg(COUPON_MESSAGES[r.reason ?? ""] ?? "That code can't be used for this booking.");
          }
        },
        onError: () => setCouponMsg("Couldn't check that code — please try again."),
      },
    );
  };

  const removeCoupon = () => {
    setAppliedCode(null);
    setDiscount(0);
    setCouponInput("");
    setCouponMsg(null);
  };

  // A code priced against 2 guests on a Tuesday may be worth a different amount
  // — or nothing at all — once either changes. Drop it rather than show a stale
  // saving the server won't honour.
  useEffect(() => {
    if (!appliedCode) return;
    setAppliedCode(null);
    setDiscount(0);
    setCouponMsg("Your discount code needs re-applying after that change.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId, guests]);

  const pickDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    const daySlots = slotsByDate.get(dateKey) ?? [];
    setSlotId(daySlots.length === 1 ? daySlots[0].id : "");
    setError(null);
  };
  const backToCalendar = () => {
    setSelectedDate(null);
    setSlotId("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!slotId) {
      setError("Please pick a time slot.");
      return;
    }
    create.mutate(
      {
        data: {
          slotId,
          customerName: name,
          customerEmail: email,
          customerPhone: cphone,
          numGuests: guests,
          addons: addonSelections,
          addonsOnly,
          couponCode: appliedCode,
          paymentMethod: payMethod,
          // The booking event is recorded server-side; passing our session id
          // is what lets it join up with this visitor's pageviews.
          analyticsSessionId: analyticsSessionId(),
        },
      },
      {
        onSuccess: (b) => {
          if (b.razorpayOrderId && b.razorpayKeyId) {
            setBookingRef(b.bookingRef);
          } else {
            navigate(`/booking/${b.bookingRef}`);
            onClose();
          }
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status;
          setError(status === 409 ? "Sorry, that slot just filled up. Pick another date." : "Could not complete booking. Please try again.");
        },
      },
    );
  };

  const inputCls = "w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2";

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = startOfDay(new Date());

  // Portalled to <body>: the booking box that opens this is `sticky`, which
  // traps a child's z-index inside it — sections further down the page then
  // painted over the popup.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(6,18,28,0.6)" }} onClick={onClose}>
      {/* Never taller than the screen: the title stays put and the form itself
          scrolls, so a short laptop screen shows the same popup a big one does. */}
      <div className={`flex w-full ${shellWidth} max-h-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-[max-width] duration-300`} onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ backgroundColor: C.deepOcean }}>
          <span className="text-white font-semibold" style={{ fontFamily: "var(--app-font-serif)" }}>
            {bookingRef ? "Payment" : "Book your spot"}
          </span>
          <button onClick={onClose} className="text-white/70 hover:text-white shrink-0" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {bookingRef ? (
            <PayScreen
              bookingRef={bookingRef}
              booking={booking}
              phone={phone}
              customerName={name}
              customerEmail={email}
              customerPhone={cphone}
              onDone={() => {
                navigate(`/booking/${bookingRef}`);
                onClose();
              }}
            />
          ) : isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-cyan-300/40 border-t-cyan-500 animate-spin" />
            </div>
          ) : (
            <>
            {variants.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#5a8ea8" }}>
                  Choose how you'd like to do it
                </label>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(variants.length, 3)}, minmax(0, 1fr))` }}>
                  {variants.map((v) => {
                    const active = v.id === variantId;
                    const from = variantPrice.get(v.id);
                    return (
                      <button type="button" key={v.id}
                        onClick={() => { setVariantId(v.id); setSelectedDate(null); }}
                        className="rounded-lg border px-3 py-2 text-left transition-colors"
                        style={{ borderColor: active ? C.riverTeal : C.mutedBorder, backgroundColor: active ? C.riverTeal + "12" : "white" }}>
                        <div className="text-sm font-semibold" style={{ color: C.text }}>{v.label}</div>
                        {from != null && <div className="text-xs" style={{ color: "#5a8ea8" }}>from {formatINR(from)}</div>}
                      </button>
                    );
                  })}
                </div>
                {variants.find((v) => v.id === variantId)?.description && (
                  <p className="text-xs mt-2" style={{ color: "#5a8ea8" }}>
                    {variants.find((v) => v.id === variantId)!.description}
                  </p>
                )}
              </div>
            )}
            {available.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "#2e5a74" }}>{txt.noAvailability}</p>
              <a href={`tel:${phone}`}
                className="flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-semibold no-underline"
                style={{ backgroundColor: C.riverTeal, color: "white" }}>
                <Phone className="w-4 h-4" /> {callButtonLabel}
              </a>
            </div>
          ) : !selectedDate ? (
            asList ? (
              /**
               * The list alternative to the calendar, chosen per trip.
               *
               * A calendar is right for a trip that runs most days — you pick
               * when *you* want to go. It is wrong for one that runs eight
               * times a season, where the customer is choosing from a short
               * set of fixed departures and a month grid of mostly-dead cells
               * hides how few there are.
               */
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#5a8ea8" }}>
                  Choose a departure
                </label>
                <div className="space-y-1.5">
                  {[...slotsByDate.keys()].sort().map((key) => {
                    const daySlots = slotsByDate.get(key) ?? [];
                    const seats = daySlots.reduce((n, sl) => n + sl.remaining, 0);
                    return (
                      <button type="button" key={key} onClick={() => pickDate(key)}
                        className="w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors"
                        style={{ borderColor: C.mutedBorder, color: C.text }}>
                        <span className="text-sm font-semibold">{format(parseISO(key), "EEE, d MMM yyyy")}</span>
                        <span className="text-xs" style={{ color: "#5a8ea8" }}>
                          {daySlots.length > 1 ? `${daySlots.length} times` : daySlots[0]?.startTime}
                          {showSeatCount && (rules?.showSeatsAvailable ?? true) ? ` · ${seats} left` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#5a8ea8" }}>
                Choose a date
              </label>
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  className="w-7 h-7 rounded-full border flex items-center justify-center" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}
                  aria-label="Previous month">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold" style={{ color: C.text }}>{format(viewMonth, "MMMM yyyy")}</span>
                <button type="button" onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="w-7 h-7 rounded-full border flex items-center justify-center" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}
                  aria-label="Next month">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAY_LABELS.map((w, i) => (
                  <div key={i} className="text-center text-[11px] font-semibold" style={{ color: "#8aabb8" }}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const inMonth = isSameMonth(day, viewMonth);
                  const hasSlots = inMonth && slotsByDate.has(key);
                  const isPast = isBefore(day, today) && !isSameDay(day, today);
                  const disabled = !hasSlots || isPast;
                  return (
                    <button type="button" key={key} disabled={disabled} onClick={() => pickDate(key)}
                      className="aspect-square rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 transition-colors"
                      style={{
                        color: !inMonth ? "#cbd5e1" : disabled ? "#b7c9d3" : C.text,
                        backgroundColor: hasSlots && !isPast ? C.riverTeal + "12" : "transparent",
                        cursor: disabled ? "default" : "pointer",
                        fontWeight: hasSlots && !isPast ? 600 : 400,
                      }}>
                      {day.getDate()}
                      {hasSlots && !isPast && <span className="w-1 h-1 rounded-full" style={{ backgroundColor: C.riverTeal }} />}
                    </button>
                  );
                })}
              </div>
            </div>
            )
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <button type="button" onClick={backToCalendar}
                  className="flex items-center gap-1.5 text-xs font-semibold mb-3" style={{ color: C.riverTeal }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Change date
                </button>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#5a8ea8" }}>
                  {formatDateLong(selectedDate)} — choose a time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {dayOfSlots.map((s) => {
                    const active = s.id === slotId;
                    return (
                      <button type="button" key={s.id}
                        onClick={() => { setSlotId(s.id); setGuests((g) => Math.min(g, s.remaining)); }}
                        className="rounded-lg border px-3 py-2 text-left transition-colors"
                        style={{ borderColor: active ? C.riverTeal : C.mutedBorder, backgroundColor: active ? C.riverTeal + "12" : "white" }}>
                        <div className="text-sm font-semibold" style={{ color: C.text }}>{s.startTime}</div>
                        {/* Each of these is its own toggle in the trip editor:
                            "12 left" reassures, "3 booked" creates urgency,
                            and a trip may want either, both or neither. */}
                        {showSeatCount && (rules?.showSeatsAvailable ?? true) && (
                          <div className="text-xs" style={{ color: "#5a8ea8" }}>{s.remaining} left</div>
                        )}
                        {rules?.showSeatsBooked && s.bookedCount > 0 && (
                          <div className="text-xs" style={{ color: "#5a8ea8" }}>{s.bookedCount} booked</div>
                        )}
                        {/* A departure is guaranteed once enough people have
                            booked to meet the trip's minimum party size; until
                            then the trip can offer to say how many more are
                            needed. Both are opt-in, because "2 more needed"
                            reads as doubt on a trip that always runs. */}
                        {(() => {
                          const min = rules?.minParticipants ?? 0;
                          if (min <= 0) return null;
                          const short = min - s.bookedCount;
                          if (short <= 0) {
                            return rules?.showGuaranteedDeparture
                              ? <div className="text-xs font-semibold" style={{ color: "#0f8a5f" }}>Departure guaranteed</div>
                              : null;
                          }
                          return rules?.showSeatsToGuarantee
                            ? <div className="text-xs" style={{ color: "#b45309" }}>{short} more to guarantee</div>
                            : null;
                        })()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#5a8ea8" }}>
                  Guests
                </label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setGuests((g) => Math.max(minGuests, g - 1))}
                    className="w-9 h-9 rounded-full border flex items-center justify-center" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-semibold w-8 text-center" style={{ color: C.text }}>{guests}</span>
                  <button type="button" onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                    className="w-9 h-9 rounded-full border flex items-center justify-center" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
                    <Plus className="w-4 h-4" />
                  </button>
                  {/* Two different facts: the trip's party-size rule always
                      applies, while the seats-left hint is a display choice. */}
                  {rules?.minParticipants != null && rules.minParticipants > 1 && (
                    <span className="text-xs ml-1" style={{ color: "#5a8ea8" }}>min {rules.minParticipants}</span>
                  )}
                  {selected && showSeatCount && Number.isFinite(maxGuests) && (
                    <span className="text-xs ml-1" style={{ color: "#5a8ea8" }}>max {maxGuests}</span>
                  )}
                </div>
              </div>

              {addons.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#5a8ea8" }}>
                    Add-ons
                  </label>
                  {addonOnlyAllowed && (
                    <div className="mb-2 grid grid-cols-2 gap-2">
                      {[
                        { only: false, label: "Trip + extras" },
                        { only: true, label: "Only add-ons" },
                      ].map((opt) => (
                        <button key={String(opt.only)} type="button" onClick={() => setAddonsOnly(opt.only)}
                          className="rounded-xl px-3 py-2.5 text-sm font-medium border transition-colors"
                          style={addonsOnly === opt.only
                            ? { borderColor: C.riverTeal, backgroundColor: C.riverTeal + "12", color: C.text }
                            : { borderColor: C.mutedBorder, color: "#5a8ea8" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="ace-addon-grid grid gap-2" style={{ gridTemplateColumns: `repeat(${addonColumns}, minmax(0, 1fr))` }}>
                    {addons.map((a) => {
                      const qty = addonQtyOf(a);
                      const step = Math.max(1, a.minQty);
                      const ceiling = a.maxQty ?? 99;
                      const unitNote = a.priceType === "per_person" ? "per person" : a.priceType === "per_unit" ? "each" : "per booking";
                      return (
                        <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5"
                          style={{ borderColor: qty > 0 ? C.riverTeal : C.mutedBorder, backgroundColor: qty > 0 ? C.riverTeal + "0d" : "transparent" }}>
                          {!a.required && a.priceType !== "per_unit" && (
                            <input type="checkbox" className="h-4 w-4 shrink-0" checked={qty > 0}
                              aria-label={a.label}
                              onChange={(e) => setAddonQty((q) => ({ ...q, [a.id]: e.target.checked ? step : 0 }))} />
                          )}
                          <div className="min-w-[8rem] flex-1">
                            <div className="text-sm font-semibold" style={{ color: C.text }}>{a.label}</div>
                            {a.description && <div className="text-xs" style={{ color: "#5a8ea8" }}>{a.description}</div>}
                            <div className="text-xs" style={{ color: "#5a8ea8" }}>
                              {formatINR(a.price)} {unitNote}{a.required && " · included"}
                            </div>
                          </div>
                          {!a.required && a.priceType === "per_unit" && (
                            <div className="ml-auto flex items-center gap-2 shrink-0">
                              <button type="button" aria-label={`One less ${a.label}`}
                                onClick={() => setAddonQty((q) => ({ ...q, [a.id]: qty - 1 < step ? 0 : qty - 1 }))}
                                className="w-8 h-8 rounded-full border flex items-center justify-center"
                                style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-5 text-center text-sm font-semibold" style={{ color: C.text }}>{qty}</span>
                              <button type="button" aria-label={`One more ${a.label}`}
                                onClick={() => setAddonQty((q) => ({ ...q, [a.id]: Math.min(ceiling, qty === 0 ? step : qty + 1) }))}
                                className="w-8 h-8 rounded-full border flex items-center justify-center"
                                style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <input className={inputCls} style={{ borderColor: C.mutedBorder }} placeholder="Full name"
                value={name} onChange={(e) => setName(e.target.value)} required />
              <input className={inputCls} style={{ borderColor: C.mutedBorder }} type="email" placeholder="Email"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className={inputCls} style={{ borderColor: C.mutedBorder }} placeholder="Phone (WhatsApp)"
                value={cphone} onChange={(e) => setCphone(e.target.value)} required />

              {payMethodRequired && payMethods.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: C.text }}>
                    How would you like to pay?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {payMethods.map((m) => {
                      const on = payMethod === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setPayMethod(m.key)}
                          className="rounded-xl px-3 py-2.5 text-sm font-medium border transition-colors"
                          style={
                            on
                              ? { borderColor: C.riverTeal, backgroundColor: C.riverTeal + "12", color: C.text }
                              : { borderColor: C.mutedBorder, color: "#5a8ea8" }
                          }>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "#5a8ea8" }}>
                    Fees can differ by payment method, so the total below reflects your choice.
                  </p>
                </div>
              )}

              {/* Discount code */}
              <div>
                {appliedCode ? (
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                    <span style={{ color: "#047857" }}>
                      <strong className="font-mono">{appliedCode}</strong> applied — you save {formatINR(shownDiscount)}
                    </span>
                    <button type="button" onClick={removeCoupon} className="text-xs font-semibold" style={{ color: "#047857" }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input className={inputCls} style={{ borderColor: C.mutedBorder }} placeholder="Discount code (optional)"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponMsg(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }} />
                    <button type="button" onClick={applyCoupon}
                      disabled={!couponInput.trim() || !slotId || validateCoupon.isPending}
                      className="shrink-0 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
                      style={{ border: `1px solid ${C.mutedBorder}`, color: C.text }}>
                      {validateCoupon.isPending ? "…" : "Apply"}
                    </button>
                  </div>
                )}
                {couponMsg && <p className="mt-1 text-xs" style={{ color: "#b45309" }}>{couponMsg}</p>}
                {!slotId && couponInput && !appliedCode && (
                  <p className="mt-1 text-xs" style={{ color: "#5a8ea8" }}>Pick a date and time first.</p>
                )}
              </div>

              {/* Price breakdown */}
              <div className="rounded-lg p-3 space-y-1.5 text-sm" style={{ backgroundColor: C.muted }}>
                {!addonsOnly && (
                <div className="flex justify-between" style={{ color: "#2e5a74" }}>
                  <span>
                    {formatINR(shownUnit)} × {guests} guest{guests > 1 ? "s" : ""}
                    {groupRateApplied && <span className="ml-1 text-xs font-semibold" style={{ color: "#047857" }}>group rate</span>}
                  </span>
                  <span>{formatINR(participantsAmount)}</span>
                </div>
                )}
                {shownAddonLines.map((l, i) => (
                  <div key={i} className="flex justify-between" style={{ color: "#2e5a74" }}>
                    <span>{l.label}</span>
                    <span>{formatINR(l.amount)}</span>
                  </div>
                ))}
                {shownDiscount > 0 && (
                  <div className="flex justify-between" style={{ color: "#047857" }}>
                    <span>Discount ({appliedCode})</span>
                    <span>−{formatINR(shownDiscount)}</span>
                  </div>
                )}
                {breakdown.map((c, i) => (
                  <div key={i} className="flex justify-between" style={{ color: "#2e5a74" }}>
                    <span>{c.label}</span>
                    <span>{formatINR(c.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-1.5 border-t" style={{ color: C.text, borderColor: C.mutedBorder }}>
                  <span>Total</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              {addonsOnly && addonSelections.length === 0 && (
                <p className="text-sm" style={{ color: "#b45309" }}>Pick at least one add-on to continue.</p>
              )}

              <button type="submit" disabled={create.isPending || !slotId || (addonsOnly && addonSelections.length === 0)}
                className="flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-semibold no-underline disabled:opacity-60"
                style={{ backgroundColor: C.riverTeal, color: "white" }}>
                {create.isPending ? "Requesting…" : txt.ctaLabel}
              </button>
              <p className="text-xs text-center" style={{ color: "#8aabb8" }}>
                {bookingMode === "enquiry"
                  ? txt.disclaimer
                  : "Pay instantly by UPI, card, or netbanking on the next screen."}
              </p>
            </form>
            )}
            </>
          )}

        </div>
      </div>
    </div>,
    document.body,
  );
}

function PayScreen({
  bookingRef,
  booking,
  phone,
  customerName,
  customerEmail,
  customerPhone,
  onDone,
}: {
  bookingRef: string;
  booking: BookingDetail | undefined;
  phone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onDone: () => void;
}) {
  const verify = useVerifyBookingPayment();
  const [verifiedBooking, setVerifiedBooking] = useState<BookingDetail | null>(null);
  const [opening, setOpening] = useState(false);
  const [dismissedOnce, setDismissedOnce] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const current = verifiedBooking ?? booking;

  const openCheckout = async () => {
    if (!current?.razorpayOrderId || !current?.razorpayKeyId) return;
    setCheckoutError(null);
    setOpening(true);
    try {
      await loadRazorpayCheckout();
    } catch {
      setOpening(false);
      setCheckoutError("Couldn't load the payment window. Check your connection and try again.");
      return;
    }
    setOpening(false);
    const rzp = new window.Razorpay!({
      key: current.razorpayKeyId,
      amount: current.totalAmount * 100,
      currency: current.currency,
      name: "Ace Paddlers",
      description: `${current.tourTitle ?? "Booking"} — ${bookingRef}`,
      order_id: current.razorpayOrderId,
      prefill: { name: customerName, email: customerEmail, contact: customerPhone },
      // Restrict checkout to the method the price was quoted for. Without this
      // the customer could switch inside Razorpay and pay a total that no
      // longer matches the fee we charged them.
      ...(current.paymentMethod
        ? {
            method: {
              upi: current.paymentMethod === "upi",
              card: current.paymentMethod === "card",
              netbanking: current.paymentMethod === "netbanking",
              wallet: current.paymentMethod === "wallet",
            },
          }
        : {}),
      handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        verify.mutate(
          {
            ref: bookingRef,
            data: {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            },
          },
          { onSuccess: (b) => setVerifiedBooking(b) },
        );
      },
      modal: {
        ondismiss: () => setDismissedOnce(true),
      },
    });
    rzp.open();
  };

  if (!current) {
    return (
      <div className="py-8 flex justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-cyan-300/40 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  if (current.paymentStatus === "paid") {
    return (
      <div className="py-6 flex flex-col items-center text-center gap-3">
        <CheckCircle2 className="w-12 h-12" style={{ color: "#16a34a" }} />
        <div className="text-lg font-semibold" style={{ color: C.text }}>Payment received — you're confirmed!</div>
        <p className="text-sm" style={{ color: "#5a8ea8" }}>Reference: {current.bookingRef}</p>
        <button type="button" onClick={onDone}
          className="rounded-full px-6 py-2.5 font-semibold mt-2"
          style={{ backgroundColor: C.riverTeal, color: "white" }}>
          View my booking
        </button>
      </div>
    );
  }

  if (!current.razorpayOrderId || !current.razorpayKeyId) {
    return (
      <div className="py-6 flex flex-col items-center text-center gap-3">
        <p className="text-sm" style={{ color: "#2e5a74" }}>
          We couldn't open payment for this booking — no worries, we'll reach out by call/WhatsApp instead.
        </p>
        <a href={`tel:${phone}`}
          className="rounded-full px-6 py-2.5 font-semibold"
          style={{ backgroundColor: C.riverTeal, color: "white" }}>
          Call us
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: C.deepOcean }}>
        {current.currency} {current.totalAmount.toLocaleString("en-IN")}
      </div>
      <p className="text-sm" style={{ color: "#5a8ea8" }}>
        {dismissedOnce ? "Payment not completed — you can try again below." : "Pay securely by UPI, card, or netbanking."}
      </p>
      {checkoutError && <p className="text-sm text-red-600">{checkoutError}</p>}
      <button type="button" onClick={openCheckout} disabled={opening || verify.isPending}
        className="rounded-full px-8 py-3.5 font-semibold w-full disabled:opacity-60"
        style={{ backgroundColor: C.riverTeal, color: "white" }}>
        {opening ? "Opening…" : verify.isPending ? "Confirming…" : dismissedOnce ? "Try again" : `Pay ${current.currency} ${current.totalAmount.toLocaleString("en-IN")} now`}
      </button>
      <p className="text-xs" style={{ color: "#8aabb8" }}>Reference: {current.bookingRef} — this page updates automatically once paid.</p>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Phone, ShieldCheck, Check, Minus, Plus } from "lucide-react";
import { useGetAvailability, useCreateBooking, type Slot } from "@workspace/api-client-react";
import { C } from "@/data/constants";

function formatDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export default function BookingWidget({
  tourSlug,
  price,
  phone = "+919480987672",
}: {
  tourSlug: string;
  price: string;
  phone?: string;
}) {
  const [, navigate] = useLocation();
  const { data: slots, isLoading } = useGetAvailability({ tour: tourSlug });
  const create = useCreateBooking();

  const [slotId, setSlotId] = useState<string>("");
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cphone, setCphone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const available: Slot[] = slots ?? [];
  const selected = available.find((s) => s.id === slotId);
  const maxGuests = selected ? selected.remaining : 8;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!slotId) {
      setError("Please pick a date.");
      return;
    }
    create.mutate(
      { data: { slotId, customerName: name, customerEmail: email, customerPhone: cphone, numGuests: guests } },
      {
        onSuccess: (b) => navigate(`/booking/${b.bookingRef}`),
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status;
          setError(status === 409 ? "Sorry, that slot just filled up. Pick another date." : "Could not complete booking. Please try again.");
        },
      },
    );
  };

  const inputCls = "w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2";

  return (
    <div className="sticky top-28 rounded-2xl overflow-hidden border shadow-xl"
      style={{ borderColor: C.mutedBorder, boxShadow: "0 8px 40px rgba(13,58,94,0.14)" }}>
      <div className="p-6" style={{ backgroundColor: C.deepOcean }}>
        <div className="text-white/70 text-sm mb-1">Starting from</div>
        <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{price}</div>
        <div className="text-white/60 text-sm">per person</div>
      </div>

      <div className="p-6 bg-white">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-cyan-300/40 border-t-cyan-500 animate-spin" />
          </div>
        ) : available.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "#2e5a74" }}>
              No dates open online right now — call us and we'll set you up.
            </p>
            <a href={`tel:${phone}`}
              className="flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-semibold no-underline"
              style={{ backgroundColor: C.riverTeal, color: "white" }}>
              <Phone className="w-4 h-4" /> Call to Book
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {/* Date / slot picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#5a8ea8" }}>
                Choose a date
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                {available.map((s) => {
                  const active = s.id === slotId;
                  return (
                    <button type="button" key={s.id}
                      onClick={() => { setSlotId(s.id); setGuests((g) => Math.min(g, s.remaining)); }}
                      className="rounded-lg border px-3 py-2 text-left transition-colors"
                      style={{
                        borderColor: active ? C.riverTeal : C.mutedBorder,
                        backgroundColor: active ? C.riverTeal + "12" : "white",
                      }}>
                      <div className="text-sm font-semibold" style={{ color: C.text }}>{formatDate(s.date)}</div>
                      <div className="text-xs" style={{ color: "#5a8ea8" }}>{s.startTime} · {s.remaining} left</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guests */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#5a8ea8" }}>
                Guests
              </label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  className="w-9 h-9 rounded-full border flex items-center justify-center" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-semibold w-8 text-center" style={{ color: C.text }}>{guests}</span>
                <button type="button" onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                  className="w-9 h-9 rounded-full border flex items-center justify-center" style={{ borderColor: C.mutedBorder, color: C.riverTeal }}>
                  <Plus className="w-4 h-4" />
                </button>
                {selected && <span className="text-xs ml-1" style={{ color: "#5a8ea8" }}>max {maxGuests}</span>}
              </div>
            </div>

            {/* Customer */}
            <input className={inputCls} style={{ borderColor: C.mutedBorder }} placeholder="Full name"
              value={name} onChange={(e) => setName(e.target.value)} required />
            <input className={inputCls} style={{ borderColor: C.mutedBorder }} type="email" placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className={inputCls} style={{ borderColor: C.mutedBorder }} placeholder="Phone (WhatsApp)"
              value={cphone} onChange={(e) => setCphone(e.target.value)} required />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={create.isPending}
              className="flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-semibold no-underline disabled:opacity-60"
              style={{ backgroundColor: C.riverTeal, color: "white" }}>
              {create.isPending ? "Requesting…" : "Request to Book"}
            </button>
            <p className="text-xs text-center" style={{ color: "#8aabb8" }}>
              No payment now — we'll confirm by call / WhatsApp.
            </p>
          </form>
        )}

        <div className="pt-4 mt-4 space-y-3" style={{ borderTop: `1px solid ${C.muted}` }}>
          {[
            { icon: <ShieldCheck className="w-4 h-4" />, text: "NOLS certified guides" },
            { icon: <ShieldCheck className="w-4 h-4" />, text: "Zero accidents on record" },
            { icon: <Check className="w-4 h-4" />, text: "All safety gear provided" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm" style={{ color: "#2e5a74" }}>
              <span style={{ color: C.riverTeal }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

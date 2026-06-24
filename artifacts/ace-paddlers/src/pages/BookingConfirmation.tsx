import { Link, useParams } from "wouter";
import { CheckCircle, Calendar, Clock, Users, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import PageMeta from "@/components/PageMeta";
import { useGetBooking } from "@workspace/api-client-react";
import { C } from "@/data/constants";

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

export default function BookingConfirmation() {
  const { ref } = useParams<{ ref: string }>();
  const { data: booking, isLoading } = useGetBooking(ref);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!booking) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-20 px-6 text-center">
          <h1 className="text-4xl" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>Booking Not Found</h1>
          <p style={{ color: "#5a8ea8" }}>We couldn't find a booking with that reference.</p>
          <Link href="/tours" className="no-underline" style={{ color: C.riverTeal }}>← Browse tours</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageMeta title={`Booking ${booking.bookingRef} | Ace Paddlers`} description="Your booking request with Ace Paddlers." url={`/booking/${booking.bookingRef}`} />
      <section className="pt-40 pb-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: C.riverTeal }} />
            <h1 className="text-4xl mb-2" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>Request received!</h1>
            <p style={{ color: "#5a8ea8" }}>
              Reference <span className="font-bold" style={{ color: C.deepOcean }}>{booking.bookingRef}</span> — our team will confirm by call / WhatsApp shortly.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-lg" style={{ borderColor: C.mutedBorder }}>
            <h2 className="text-xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>{booking.tourTitle}</h2>
            <div className="space-y-3 text-sm" style={{ color: "#2e5a74" }}>
              <Row icon={<Calendar className="w-4 h-4" />} label="Date" value={formatDate(booking.date)} />
              <Row icon={<Clock className="w-4 h-4" />} label="Time" value={booking.startTime ?? "—"} />
              <Row icon={<Users className="w-4 h-4" />} label="Guests" value={String(booking.numGuests)} />
            </div>
            <div className="flex items-center justify-between mt-5 pt-5" style={{ borderTop: `1px solid ${C.muted}` }}>
              <span className="text-sm" style={{ color: "#5a8ea8" }}>Estimated total</span>
              <span className="text-2xl font-bold" style={{ color: C.deepOcean }}>{booking.currency} {booking.totalAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-3">
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide"
                style={{ backgroundColor: C.riverTeal + "18", color: C.riverTeal }}>
                {booking.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <a href={`/api/bookings/${booking.bookingRef}/calendar.ics`}
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold no-underline border-2"
              style={{ borderColor: C.riverTeal, color: C.riverTeal }}>
              <Calendar className="w-4 h-4" /> Add to calendar
            </a>
            <Link href="/tours"
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold no-underline"
              style={{ backgroundColor: C.riverTeal, color: "white" }}>
              Browse more <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2" style={{ color: "#5a8ea8" }}>{icon}{label}</span>
      <span className="font-medium" style={{ color: C.text }}>{value}</span>
    </div>
  );
}

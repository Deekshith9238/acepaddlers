import PageMeta from "@/components/PageMeta";
import EditablePage from "@/builder/EditablePage";
import { useBusiness } from "@/lib/useBusiness";
import { telHref, waHref } from "@/lib/site-config";
import { C } from "@/data/constants";

function DataDeletionContent() {
  const biz = useBusiness();
  return (
    <>
      <PageMeta
          title="Data Deletion Instructions | Ace Paddlers"
          description="How to request deletion of your personal information held by Ace Paddlers, including data collected via our website or WhatsApp Business messaging."
          url="/data-deletion"
        />
        <section className="pt-32 pb-20 px-6" style={{ backgroundColor: C.bg }}>
          <div className="max-w-3xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-bold mb-3 block" style={{ color: C.riverTeal }}>Legal</span>
            <h1 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>
              Data Deletion Instructions
            </h1>

            <div className="space-y-4 text-sm leading-relaxed mb-10" style={{ color: "#2e5a74" }}>
              <p>
                If you've booked a trip with Ace Paddlers, messaged us on WhatsApp, or contacted us through our
                website, you can ask us to delete the personal information we hold about you at any time.
              </p>
              <p>This includes any name, email address, phone number, guest details, or message history associated with you.</p>
            </div>

            <div className="rounded-2xl border bg-white p-6 mb-10" style={{ borderColor: C.mutedBorder }}>
              <h2 className="text-lg font-semibold mb-3" style={{ color: C.secondary }}>How to request deletion</h2>
              <ol className="list-decimal pl-5 space-y-2 text-sm" style={{ color: "#2e5a74" }}>
                <li>
                  Email us at{" "}
                  <a href="mailto:info@acepaddlers.com" className="underline" style={{ color: C.riverTeal }}>info@acepaddlers.com</a>{" "}
                  with the subject line "Data Deletion Request", or send us a WhatsApp message at{" "}
                  <a href={waHref(biz)} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: C.riverTeal }}>
                    {biz.phones[0]}
                  </a>.
                </li>
                <li>Include the name, phone number, or email address you used when booking or messaging us, so we can find your records.</li>
                <li>
                  We will confirm your request and delete your personal information from our systems within 30 days,
                  except where we're required to keep certain records for legal, accounting, or tax purposes (in which
                  case we'll let you know what we retain and why).
                </li>
              </ol>
            </div>

            <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#2e5a74" }}>
              <h2 className="text-lg font-semibold mb-1" style={{ color: C.secondary }}>What gets deleted</h2>
              <p>
                Your name, contact details, guest/booking details, and message history with us. Payment records are
                processed by our payment partner Razorpay and are subject to their own retention and deletion
                policies as a regulated payment provider.
              </p>
            </div>

            <p className="mt-10 text-sm" style={{ color: "#8aabb8" }}>
              See our <a href="/privacy-policy" className="underline" style={{ color: C.riverTeal }}>Privacy Policy</a> for more on how we handle your information.
            </p>
          </div>
        </section>
    </>
  );
}

/**
 * A published builder layout wins; the hand-built version below is the
 * fallback until someone publishes one. Same arrangement as every other
 * marketing page, so this one is editable without a deploy.
 */
export default function DataDeletion() {
  return <EditablePage slug="data-deletion"><DataDeletionContent /></EditablePage>;
}

import PageMeta from "@/components/PageMeta";
import EditablePage from "@/builder/EditablePage";
import { useBusiness } from "@/lib/useBusiness";
import { telHref } from "@/lib/site-config";
import { C } from "@/data/constants";

const UPDATED = "15 October 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "var(--app-font-serif)", color: C.secondary }}>{title}</h2>
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#2e5a74" }}>{children}</div>
      </div>
    </>
  );
}

function PrivacyPolicyContent() {
  const biz = useBusiness();
  return (
    <>
      <PageMeta
          title="Privacy Policy | Ace Paddlers"
          description="How Ace Paddlers collects, uses, and protects your personal information when you book a rafting, camping, or homestay experience with us."
          url="/privacy-policy"
        />
        <section className="pt-32 pb-20 px-6" style={{ backgroundColor: C.bg }}>
          <div className="max-w-3xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-bold mb-3 block" style={{ color: C.riverTeal }}>Legal</span>
            <h1 className="text-4xl md:text-5xl mb-3" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>Privacy Policy</h1>
            <p className="text-sm mb-12" style={{ color: "#8aabb8" }}>Last updated: {UPDATED}</p>

            <Section title="Protecting Consumer Privacy">
              <p>
                At Ace Paddlers, we strongly believe in protecting consumer privacy. That's why we only ask you for
                information related to the services we provide. We do not sell or rent your personal information.
                We share it with service providers where needed to arrange and support your booking, as described below.
                This privacy policy describes what information we collect from
                you, how it is used and what security measures we take to protect it.
              </p>
            </Section>

            <Section title="Cookies, Storage & Analytics">
              <p>
                Essential cookies and browser storage support sign-in, security, and your privacy preferences.
                Your analytics choice is saved in local storage as ap_cookie_consent_v1. Optional first-party analytics
                starts only when you choose Allow analytics. It records page paths, referring sites, campaign information,
                and booking or enquiry events. The session identifier (ap_sid) and attribution (ap_attr) stay in
                session storage for the tab. Choose Essential only to decline, or use Cookie settings in the footer
                to change your choice and clear this tab’s analytics identifiers. We also process IP addresses in
                server logs and to protect forms against abuse.
              </p>
              <p>Interactive maps load only when you request them. Maps, sign-in, payments, and externally hosted fonts
                or images connect to their respective providers, which receive connection information and may use
                their own storage or cookies. Their privacy notices apply to those services.</p>
            </Section>

            <Section title="Bookings & Payments">
              <p>
                When you book a tour on our website, we require contact information, such as your name and e-mail
                address and, in some cases, partial or full postal address or telephone number. This information is
                used to respond to your request and arrange your trip. We may share necessary information with
                guides, accommodation partners, payment, hosting, email, and WhatsApp service providers supporting
                your booking. If you select the optional booking-help checkbox, we may contact you to help complete
                an unfinished booking. Otherwise, booking contact details are sent when you submit the form.
              </p>
              <p>
                At the time of booking, we may also ask you for payment. Online payments are processed securely by
                our payment partner — your card, UPI, or bank details are entered directly with the payment gateway
                and are not stored on our servers. We retain payment references and status to manage your booking.
              </p>
            </Section>

            <Section title="Online Security">
              <p>
                We use access controls and encrypted connections to protect information. No online service can
                guarantee absolute security. We retain information as needed to provide services, handle support
                and disputes, and meet applicable record-keeping obligations. Contact us about retention or deletion
                of your records.
              </p>
            </Section>

            <Section title="Your Rights & Data Deletion">
              <p>
                You can ask us, at any time, to see what personal information we hold about you, correct it, or
                delete it. To make a request, contact us at{" "}
                <a href="mailto:info@acepaddlers.com" className="underline" style={{ color: C.riverTeal }}>info@acepaddlers.com</a>{" "}
                or call/WhatsApp{" "}
                <a href={telHref(biz.phones[0] ?? "")} className="underline" style={{ color: C.riverTeal }}>{biz.phones[0]}</a>.
                Full instructions for requesting deletion of your data are on our{" "}
                <a href="/data-deletion" className="underline" style={{ color: C.riverTeal }}>Data Deletion</a> page.
              </p>
            </Section>

            <Section title="All Rights Reserved">
              <p>
                No content on our website may be used or reproduced for any commercial purposes. Ace Paddlers
                reserves the right to amend this privacy policy at any time.
              </p>
            </Section>

            <Section title="Contact Us">
              <p>
                Ace Paddlers, T. Shettigeri, Virajpet, Kodagu — 571218, Karnataka, India.<br />
                Email: <a href="mailto:info@acepaddlers.com" className="underline" style={{ color: C.riverTeal }}>info@acepaddlers.com</a>{" "}
                · Phone/WhatsApp: <a href={telHref(biz.phones[0] ?? "")} className="underline" style={{ color: C.riverTeal }}>{biz.phones[0]}</a>
              </p>
              <p className="text-xs" style={{ color: "#8aabb8" }}>
                See also our <a href="/terms-and-conditions" className="underline" style={{ color: C.riverTeal }}>Terms & Conditions</a> and <a href="/cancellation-policy" className="underline" style={{ color: C.riverTeal }}>Cancellation Policy</a>.
              </p>
            </Section>
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
export default function PrivacyPolicy() {
  return <EditablePage slug="privacy"><PrivacyPolicyContent /></EditablePage>;
}

import PageMeta from "@/components/PageMeta";
import EditablePage from "@/builder/EditablePage";
import { useBusiness } from "@/lib/useBusiness";
import { telHref, waHref } from "@/lib/site-config";
import { C } from "@/data/constants";

const UPDATED = "July 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>{title}</h2>
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
                information related to the services we provide. We never sell, rent, share, trade or give away any of
                your personal information to anyone. This privacy policy describes what information we collect from
                you, how it is used and what security measures we take to protect it.
              </p>
            </Section>

            <Section title="IP Addresses & Cookies">
              <p>
                In order for us to provide an attractive and easy-to-navigate website, we must occasionally use our
                visitors' IP addresses for purposes such as optimising our use of search engines or diagnosing
                problems with our server. Furthermore, to better tailor our website and product offerings to our
                customers, we may use analytics tools to collect information on how visitors navigate our website.
                Cookies are used to collect aggregated data that allows us to see the origins of web traffic, amount
                of visitors, visitors' operating systems, browser types, etc. This data does not personally identify
                you in any way. You can choose not to accept cookies by disabling them in the settings of your web
                browser.
              </p>
            </Section>

            <Section title="Bookings & Payments">
              <p>
                When you book a tour on our website, we require contact information, such as your name and e-mail
                address and, in some cases, partial or full postal address or telephone number. This information is
                only used to contact you with information about your tour. In rare cases, we may need to share your
                contact information with tour guides who are responsible for the booked tour. Otherwise, we do not
                sell or share this information with any third parties.
              </p>
              <p>
                At the time of booking, we may also ask you for payment. Online payments are processed securely by
                our payment partner — your card, UPI, or bank details are entered directly with the payment gateway
                and are never stored on our servers. We use the utmost level of online security to safeguard your
                personal data.
              </p>
            </Section>

            <Section title="Online Security">
              <p>
                Our website is protected by the utmost level of online security, meaning your personal data is safe
                with us. All transactions on the site are secured with industry-standard encryption, and any data we
                gather from users is securely stored and safeguarded by the best firewalls available.
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
                See also our <a href="/cancellation-policy" className="underline" style={{ color: C.riverTeal }}>Cancellation Policy</a>.
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

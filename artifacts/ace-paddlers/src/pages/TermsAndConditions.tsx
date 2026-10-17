import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import { C } from "@/data/constants";

export default function TermsAndConditions() {
  return <>
    <PageMeta title="Terms & Conditions | Ace Paddlers" url="/terms-and-conditions"
      description="Terms for using the Ace Paddlers website, requesting bookings, payments, participation, cancellations, and contacting our team." />
    <section className="pt-32 pb-20 px-6" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-3xl mx-auto space-y-8 text-sm leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_a]:underline">
        <div>
          <h1 className="text-4xl md:text-5xl mb-3" style={{ fontFamily: "var(--app-font-serif)" }}>Terms & Conditions</h1>
          <p>Last updated: 15 October 2026</p>
        </div>
        <section><h2>Using this website</h2>
          <p>These terms apply to your use of the Ace Paddlers website and booking requests. Please read the trip details and these terms before submitting a request. Contact us if anything is unclear.</p>
        </section>
        <section><h2>Bookings and payments</h2>
          <p>Provide accurate contact and guest details and check the dates, participant requirements, inclusions, and total price before submitting. A request or enquiry is subject to availability and confirmation. Follow the confirmation and payment instructions for your booking; an unpaid request does not guarantee a confirmed place. Online payments are processed by Razorpay.</p>
        </section>
        <section><h2>Participation and safety</h2>
          <p>Review the age, health, fitness, and other requirements shown for your activity. Tell our team about relevant requirements before booking. Follow the guides’ instructions, use the safety equipment provided, and arrive at the agreed time. Activities depend on weather, river conditions, and operational safety; the team may change or stop an activity when necessary. See our <Link href="/safety">safety information</Link>.</p>
        </section>
        <section><h2>Changes, cancellations, and refunds</h2>
          <p>Our <Link href="/cancellation-policy">Cancellation Policy</Link> explains cancellation charges, changes, and refund arrangements. Review it together with the conditions displayed for your trip. Contact us with your booking reference to request a change or cancellation.</p>
        </section>
        <section><h2>Responsible use and content</h2>
          <p>Do not misuse the website, submit false bookings, send spam, attempt unauthorised access, or interfere with its operation. Website photographs, text, and branding may not be reproduced commercially without permission from the rights holder.</p>
        </section>
        <section><h2>Your information</h2>
          <p>Our <Link href="/privacy-policy">Privacy Policy</Link> explains how we use information provided through this website. You can change optional analytics preferences using Cookie settings in the footer.</p>
        </section>
        <section><h2>Questions and updates</h2>
          <p>For questions about these terms or a booking, <Link href="/contact">contact Ace Paddlers</Link> or email <a href="mailto:info@acepaddlers.com">info@acepaddlers.com</a>. Updated website terms will be published here with a revised date. Nothing in these terms limits rights that apply under applicable law.</p>
        </section>
      </div>
    </section>
  </>;
}

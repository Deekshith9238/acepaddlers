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

const CANCELLATION_CHARGES = [
  { when: "From the booking date till 30 days prior to the departure date", charge: "30% of the package cost" },
  { when: "From 30 days to 15 days prior to the departure date", charge: "50% of the package cost" },
  { when: "From 15 days to 7 days prior to the departure date", charge: "75% of the package cost" },
  { when: "Within 5 days prior to the departure date", charge: "100% of the package cost" },
];

const CHANGE_COMPENSATION = [
  { when: "Before 12 days prior to the departure date", comp: "Deposits only" },
  { when: "Before 7 days prior to the departure date", comp: "100% of the tour cost" },
  { when: "Before 4 days prior to the departure date", comp: "100% of the tour cost + 1.25% of tour cost" },
  { when: "Before 2 days prior to the departure date", comp: "100% of the tour cost + 3.50% of tour cost" },
];

function CancellationPolicyContent() {
  const biz = useBusiness();
  return (
    <>
      <PageMeta
          title="Cancellation Policy | Ace Paddlers"
          description="Ace Paddlers cancellation and refund policy — cancellation charges, changes made by us before travel, circumstances beyond our control, and how to raise a complaint."
          url="/cancellation-policy"
        />
        <section className="pt-32 pb-20 px-6" style={{ backgroundColor: C.bg }}>
          <div className="max-w-3xl mx-auto">
            <span className="uppercase tracking-widest text-xs font-bold mb-3 block" style={{ color: C.riverTeal }}>Legal</span>
            <h1 className="text-4xl md:text-5xl mb-3" style={{ fontFamily: "var(--app-font-serif)", color: C.text }}>Cancellation Policy</h1>
            <p className="text-sm mb-12" style={{ color: "#8aabb8" }}>Last updated: {UPDATED}</p>

            <Section title="Cancellation By You">
              <p>
                The lead name on the booking must give notice to cancel the tour in writing or mail at our office and
                we shall refund the tour cost after deducting cancellation charges as under.
              </p>
              <p>
                In order to cover our expected loss from the cancellation of the booking there is a set scale of
                charges which must be paid by you or anyone travelling with you:
              </p>
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: C.mutedBorder }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: C.muted }}>
                      <th className="text-left font-semibold px-4 py-3" style={{ color: C.text }}>Cancellation period</th>
                      <th className="text-left font-semibold px-4 py-3" style={{ color: C.text }}>Charge</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {CANCELLATION_CHARGES.map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: C.muted }}>
                        <td className="px-4 py-3">{r.when}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: C.deepOcean }}>{r.charge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Changes Made By Us Before Travel">
              <p>
                We reserve the right to make any change in your tour program due to unexpected conditions. If you do
                not want to accept a significant change, which we will tell you about before you depart, we will (if
                we are able to do so) offer you an alternative tour of equivalent or closely similar standard and
                price at no extra cost, or a less expensive tour, in which case we will refund the difference in
                price. If you do not wish to take the alternative we offer you, you can choose a different tour
                offered for sale by us and pay, or receive a refund of, any price difference. Or, if you prefer, you
                can cancel your tour and receive a full refund of deposits which you have paid to us, except for any
                amendment charges of ₹1,500.
              </p>
              <p>
                Unless the change is a result of circumstances such as fighting, disturbance, terrorist movement,
                natural tragedy, fire, or bad weather conditions, we will pay you compensation as follows:
              </p>
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: C.mutedBorder }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: C.muted }}>
                      <th className="text-left font-semibold px-4 py-3" style={{ color: C.text }}>When we notify you</th>
                      <th className="text-left font-semibold px-4 py-3" style={{ color: C.text }}>Compensation</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {CHANGE_COMPENSATION.map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: C.muted }}>
                        <td className="px-4 py-3">{r.when}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: C.deepOcean }}>{r.comp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Circumstances Beyond Our Control">
              <p>
                We cannot pay any compensation, reimburse expenses, or cover losses for any amount or otherwise accept
                responsibility if, as a result of circumstances beyond our control, we have to change your tour after
                booking, or we cannot supply your tour as we had agreed, or you suffer any loss or damage of any
                description. When we refer to circumstances beyond our control, we mean any event that we could not
                foresee or avoid, even after taking all reasonable care. Such circumstances will usually include, but
                are not limited to, war, threat of war, airport closures, epidemic, natural or nuclear disaster,
                terrorist activity, civil unrest, industrial dispute, bad weather or any other sudden orders or
                notices by government authorities.
              </p>
            </Section>

            <Section title="Your Responsibility">
              <p>
                We want all our customers to have an enjoyable, carefree holiday. But you must remember that you are
                responsible for your actions and the effect they may have on others. If we, or another person in
                authority, believe your actions could upset, annoy or disturb other customers or our own staff, or
                put them in any risk or danger, or damage property, or you are unfit to travel, we may end your tour
                and terminate your contract. You and your travelling party will be prevented from using your booked
                accommodation, transport, and any other travel arrangements forming part of your booking and we will
                not be liable for any refund, compensation or any other costs you have to pay. Alternatively, at our
                discretion, you may be permitted to continue with your tour but may have additional terms of carriage
                imposed upon you.
              </p>
              <p>
                In addition to the above and the effect your actions may have on others, you must particularly also
                bear in mind that you are responsible for your safety, and that you are responsible for the condition
                of the property you occupy. We are not responsible for any accidents which occur in or around
                irresponsible behaviour, or for any accidents which occur anywhere on properties because of glass,
                china or the like which you have broken and/or have left in a way in which injury can result.
              </p>
              <p>
                We expect that you will enjoy your holiday with us. We appreciate that you may well drink alcohol as
                part of your enjoyment. You must, however, do so responsibly and we will have no liability to you for
                any injury, loss or damage you suffer as a result of your judgment being impaired wholly or partly by
                alcohol.
              </p>
              <p>
                We will hold you and the members of your travelling party jointly and individually liable for any
                damage to the accommodation, furniture, apparatus or other materials located within the accommodation,
                together with any legal costs we incur in pursuing a claim. It is your duty to report any breakages,
                defects or damage to an appropriate person immediately.
              </p>
              <p>
                If your behaviour or the behaviour of any members of your travelling party causes any diversion, we
                and/or the carrier will hold you and those members jointly and individually liable for all costs
                incurred as a result of that diversion. We cannot accept liability for the behaviour of others in
                your accommodation, or for any facilities/services withdrawn as a result of their action.
              </p>
            </Section>

            <Section title="If You Have A Complaint">
              <p>
                We aim to provide the best tour possible. However, if you are not satisfied please complain as soon
                as possible to the relevant person (for example, the accommodation management or transport supplier).
                If they cannot help, you must tell your tour representative and we will do everything reasonably
                possible to sort the problem out. If you are still not satisfied, or if you do not have the services
                of a representative, you must contact us at{" "}
                <a href="mailto:info@acepaddlers.com" className="underline" style={{ color: C.riverTeal }}>info@acepaddlers.com</a>{" "}
                or <a href={telHref(biz.phones[0] ?? "")} className="underline" style={{ color: C.riverTeal }}>{biz.phones[0]}</a>.
                No complaints or refund requests for the same will be entertained after the tour ends.
              </p>
              <p className="text-xs" style={{ color: "#8aabb8" }}>
                See also our <a href="/privacy-policy" className="underline" style={{ color: C.riverTeal }}>Privacy Policy</a>.
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
export default function CancellationPolicy() {
  return <EditablePage slug="cancellation"><CancellationPolicyContent /></EditablePage>;
}

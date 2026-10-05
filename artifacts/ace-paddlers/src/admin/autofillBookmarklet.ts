/**
 * The Autofill bookmark: dragged to the bookmarks bar once, clicked on a
 * partner's booking page to fill in the guest's details.
 *
 * It runs on the partner's site, not ours, so it is one self-contained string:
 * no imports, nothing from this bundle. It finds its code in the page link
 * (#ap-fill=CODE, put there by "Book at partner"), in this tab's memory, or by
 * asking; fetches the details for that code; and fills fields the way a
 * password manager does — by what each field is called, labelled or typed as —
 * so it works on any booking page, not one hard-coded site.
 *
 * It never touches dates, rooms, passwords or payment: dates and rooms are
 * pickers that differ on every site, and paying is the admin's to do.
 */
const SOURCE = `(async function(){
  var API = "__API__";
  var m = location.hash.match(/ap-fill=([A-Za-z0-9]{6})/);
  var code = (m && m[1]) || (function(){ try { return sessionStorage.getItem("apFill"); } catch (e) { return null; } })()
    || prompt("Ace Paddlers autofill code (shown next to Book at partner):");
  if (!code) return;
  code = code.trim().toUpperCase();
  try { sessionStorage.setItem("apFill", code); } catch (e) {}
  var d;
  try { d = await (await fetch(API + "/api/autofill/" + code)).json(); }
  catch (e) { alert("Autofill couldn't reach Ace Paddlers from this page. Use Copy details in the admin instead."); return; }
  if (d.error) {
    try { sessionStorage.removeItem("apFill"); } catch (e) {}
    alert(d.error === "expired" ? "This autofill code has expired. Click Book at partner again for a new one."
      : d.error === "not_bookable" ? "This stay is already booked at the partner, or not paid yet."
      : "Autofill code not found.");
    return;
  }
  function put(el, v) {
    var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
    if (desc && desc.set) desc.set.call(el, v); else el.value = v;
    ["input", "change", "blur"].forEach(function(t){ el.dispatchEvent(new Event(t, { bubbles: true })); });
  }
  var rules = [
    [/first.?name|fname|given/i, d.firstName],
    [/last.?name|lname|surname|family/i, d.lastName],
    [/e-?mail/i, d.email],
    [/phone|mobile|contact.?(no|num)|whatsapp|\\btel\\b/i, d.phone],
    [/request|note|comment|remark|message|special|instruction/i, d.notes],
    [/name/i, d.fullName]
  ];
  var filled = 0;
  document.querySelectorAll("input, textarea").forEach(function(el){
    if (el.disabled || el.readOnly || el.value) return;
    if (/^(hidden|checkbox|radio|submit|button|date|number|password|search|file)$/.test(el.type)) return;
    var label = (el.labels && el.labels[0] && el.labels[0].textContent) || "";
    var key = [el.name, el.id, el.placeholder, el.getAttribute("aria-label"), el.getAttribute("autocomplete"), label].join(" ");
    if (/card|cvv|cvc|expiry|upi|otp|coupon|promo/i.test(key)) return;
    var v = el.type === "email" ? d.email : el.type === "tel" ? d.phone : null;
    for (var i = 0; !v && i < rules.length; i++) if (rules[i][0].test(key)) v = rules[i][1];
    if (v) { put(el, v); filled++; }
  });
  var book = "\\n\\nBook: " + d.rooms + ", " + d.checkIn + " to " + d.checkOut + ", " + d.guests + " guest(s).";
  alert(filled
    ? "Filled " + filled + " field(s) for " + d.ref + " (" + d.fullName + "). Check them before you continue." + book
    : "No guest-detail fields on this page yet. Choose the dates and rooms first, then click Autofill again on the guest-details step." + book);
})();`;

/** The bookmark's link, pointed at whichever site the admin is using. */
export function autofillBookmarklet(apiOrigin: string): string {
  return `javascript:${encodeURIComponent(SOURCE.replace("__API__", apiOrigin))}`;
}

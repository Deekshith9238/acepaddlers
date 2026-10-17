// Run: pnpm exec esbuild src/middlewares/publicForms.check.ts --bundle --platform=node --format=cjs --outfile=/tmp/public-forms-check.cjs && node /tmp/public-forms-check.cjs
import assert from "node:assert/strict";
import express from "express";
import { PublicBookingBody, PublicContactBody, PublicEnquiryBody, protectPublicForm } from "./publicForms";

const contact = { customerName: "  River Guest  ", customerEmail: "guest@example.com", customerPhone: "+91 98765 43210" };
assert.equal(PublicContactBody.parse(contact).customerName, "River Guest");
for (const patch of [{ customerName: "  " }, { customerEmail: "invalid" }, { customerPhone: "abc1234567" }, { customerPhone: "123" }]) {
  assert.equal(PublicContactBody.safeParse({ ...contact, ...patch }).success, false);
}
const booking = { ...contact, slotId: "11111111-1111-4111-8111-111111111111", numGuests: 2 };
assert.equal(PublicBookingBody.safeParse(booking).success, true);
for (const numGuests of [0, -1, 1.5, 1001]) assert.equal(PublicBookingBody.safeParse({ ...booking, numGuests }).success, false);
assert.equal(PublicEnquiryBody.safeParse({ customerName: "Guest", customerEmail: contact.customerEmail }).success, true);
assert.equal(PublicEnquiryBody.safeParse({ customerName: "Guest" }).success, false);
assert.equal(PublicEnquiryBody.safeParse({ ...contact, preferredDate: "2026-02-30" }).success, false);
assert.equal(PublicEnquiryBody.safeParse({ ...contact, message: "x".repeat(5001) }).success, false);

async function check() {
const app = express();
app.set("trust proxy", ["loopback", "uniquelocal"]);
app.use(express.json());
app.post(["/enquiries", "/bookings", "/stays", "/booking-intent"], protectPublicForm, (_req, res) => { res.sendStatus(204); });
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`;
const submit = (path = "/enquiries", ip = "198.51.100.1", body = {}) => fetch(base + path, {
  method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": ip }, body: JSON.stringify(body),
});
try {
  assert.equal((await submit("/enquiries", "198.51.100.2", { website: "spam" })).status, 400);
  for (let n = 0; n < 20; n++) assert.equal((await submit()).status, 204);
  for (const path of ["/enquiries", "/bookings", "/stays", "/booking-intent"]) {
    const response = await submit(path);
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get("retry-after")) > 0);
  }
  assert.equal((await submit("/bookings", "198.51.100.3")).status, 204);
  assert.equal((await submit("/enquiries", "203.0.113.9, 198.51.100.1")).status, 429);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
console.log("publicForms.check ok");
}
void check().catch((err) => { console.error(err); process.exitCode = 1; });

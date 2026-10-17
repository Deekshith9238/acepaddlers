// Self-check for group-rate (slab) resolution. Run from artifacts/api-server:
//   node_modules/.bin/esbuild src/lib/pricing.check.ts --bundle --platform=node --format=cjs --external:pg-native --outfile=dist/pricing.check.cjs && node dist/pricing.check.cjs
import assert from "node:assert/strict";
import { resolveTierPrice } from "./pricing";

const tier = (min: number, max: number | null, price: number, participantTypeId: string | null = null) =>
  ({ id: "x", tourId: "t", participantTypeId, minGuests: min, maxGuests: max, price, createdAt: new Date() });
const slabs = [tier(1, 5, 1500), tier(6, null, 1200)];

// VL slabs apply exactly to full-price guests, even above the base price.
assert.equal(resolveTierPrice(slabs, null, 2, 1200), 1500);
assert.equal(resolveTierPrice(slabs, null, 8, 1200), 1200);
// Adult (full price 1300) in a small group pays the slab.
assert.equal(resolveTierPrice(slabs, "adult", 3, 1300, 1300), 1500);
// Child (800) is never raised to the slab; infant (0) stays free.
assert.equal(resolveTierPrice(slabs, "child", 3, 800, 1300), null);
assert.equal(resolveTierPrice(slabs, "infant", 8, 0, 1300), null);
// ...but gets a slab that is cheaper than their own price.
assert.equal(resolveTierPrice([tier(1, null, 700)], "child", 3, 800, 1300), 700);
// A type-specific tier wins, exactly as written.
assert.equal(resolveTierPrice([...slabs, tier(1, null, 900, "child")], "child", 3, 800, 1300), 900);
// No matching band → list price.
assert.equal(resolveTierPrice([tier(10, null, 1000)], null, 2, 1200), null);
console.log("pricing.check ok");

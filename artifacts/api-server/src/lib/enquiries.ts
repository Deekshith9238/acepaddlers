import { randomInt } from "node:crypto";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, enquiries, tours, destinations, adminUsers } from "@workspace/db";
import type { Enquiry } from "@workspace/db";
import { upsertCustomer } from "./customers";
import { logger } from "./logger";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateEnquiryRef(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `AP-E-${s}`;
}

export const ENQUIRY_STATUSES = ["new", "active", "won", "lost", "archived", "spam"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export interface CreateEnquiryInput {
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  company?: string | null;
  tourSlug?: string | null;
  destinationSlug?: string | null;
  preferredDate?: string | null;
  numGuests?: number | null;
  message?: string | null;
  source?: string | null;
  extra?: Record<string, unknown>;
}

/** Shape returned to the admin UI — the enquiry plus the names behind its ids. */
export interface EnquiryDetail {
  id: string;
  enquiryRef: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  company: string | null;
  tourId: string | null;
  tourTitle: string | null;
  destinationId: string | null;
  destinationName: string | null;
  preferredDate: string | null;
  numGuests: number | null;
  message: string | null;
  extra: Record<string, unknown>;
  source: string;
  status: EnquiryStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  internalNotes: string | null;
  tags: string[];
  convertedBookingId: string | null;
  createdAt: string;
  updatedAt: string;
}

function row2detail(r: {
  enquiry: Enquiry;
  tourTitle: string | null;
  destinationName: string | null;
  assigneeName: string | null;
}): EnquiryDetail {
  const e = r.enquiry;
  return {
    id: e.id,
    enquiryRef: e.enquiryRef,
    customerId: e.customerId,
    customerName: e.customerName,
    customerEmail: e.customerEmail,
    customerPhone: e.customerPhone,
    company: e.company,
    tourId: e.tourId,
    tourTitle: r.tourTitle,
    destinationId: e.destinationId,
    destinationName: r.destinationName,
    preferredDate: e.preferredDate,
    numGuests: e.numGuests,
    message: e.message,
    extra: e.extra,
    source: e.source,
    status: e.status as EnquiryStatus,
    assigneeId: e.assigneeId,
    assigneeName: r.assigneeName,
    internalNotes: e.internalNotes,
    tags: e.tags,
    convertedBookingId: e.convertedBookingId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<Enquiry> {
  // Resolve the optional tour/destination by slug so public forms never have to
  // know internal ids.
  let tourId: string | null = null;
  let destinationId: string | null = null;
  if (input.tourSlug) {
    const [t] = await db.select({ id: tours.id }).from(tours).where(eq(tours.slug, input.tourSlug)).limit(1);
    tourId = t?.id ?? null;
  }
  if (input.destinationSlug) {
    const [d] = await db
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.slug, input.destinationSlug))
      .limit(1);
    destinationId = d?.id ?? null;
  }

  const customer = await upsertCustomer({
    name: input.customerName,
    email: input.customerEmail,
    phone: input.customerPhone,
  });

  const [row] = await db
    .insert(enquiries)
    .values({
      enquiryRef: generateEnquiryRef(),
      customerId: customer?.id ?? null,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      company: input.company?.trim() || null,
      tourId,
      destinationId,
      preferredDate: input.preferredDate || null,
      numGuests: input.numGuests ?? null,
      message: input.message?.trim() || null,
      extra: input.extra ?? {},
      source: input.source || "website",
      status: "new",
    })
    .returning();
  logger.info({ enquiryRef: row.enquiryRef, source: row.source }, "enquiry created");
  return row;
}

export interface ListEnquiriesFilter {
  status?: string;
  source?: string;
  assigneeId?: string;
  tourId?: string;
  q?: string;
}

export async function listEnquiries(filter: ListEnquiriesFilter = {}): Promise<EnquiryDetail[]> {
  const where: SQL[] = [];
  // "new & active" is the working queue — the tab the team lives in.
  if (filter.status === "open") {
    where.push(sql`${enquiries.status} in ('new','active')`);
  } else if (filter.status) {
    where.push(eq(enquiries.status, filter.status as EnquiryStatus));
  }
  if (filter.source) where.push(eq(enquiries.source, filter.source));
  // "unassigned" is the useful half of this filter — the leads nobody has
  // picked up. A uuid column can't take that string, so it becomes IS NULL.
  if (filter.assigneeId === "unassigned") where.push(isNull(enquiries.assigneeId));
  else if (filter.assigneeId) where.push(eq(enquiries.assigneeId, filter.assigneeId));
  if (filter.tourId) where.push(eq(enquiries.tourId, filter.tourId));
  if (filter.q) {
    const like = `%${filter.q}%`;
    const term = or(
      ilike(enquiries.customerName, like),
      ilike(enquiries.customerEmail, like),
      ilike(enquiries.customerPhone, like),
      ilike(enquiries.enquiryRef, like),
      ilike(enquiries.company, like),
      ilike(enquiries.message, like),
    );
    if (term) where.push(term);
  }

  const rows = await db
    .select({
      enquiry: enquiries,
      tourTitle: tours.title,
      destinationName: destinations.name,
      assigneeName: adminUsers.name,
    })
    .from(enquiries)
    .leftJoin(tours, eq(tours.id, enquiries.tourId))
    .leftJoin(destinations, eq(destinations.id, enquiries.destinationId))
    .leftJoin(adminUsers, eq(adminUsers.id, enquiries.assigneeId))
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(enquiries.createdAt));

  return rows.map(row2detail);
}

export async function getEnquiry(id: string): Promise<EnquiryDetail | null> {
  const [row] = await db
    .select({
      enquiry: enquiries,
      tourTitle: tours.title,
      destinationName: destinations.name,
      assigneeName: adminUsers.name,
    })
    .from(enquiries)
    .leftJoin(tours, eq(tours.id, enquiries.tourId))
    .leftJoin(destinations, eq(destinations.id, enquiries.destinationId))
    .leftJoin(adminUsers, eq(adminUsers.id, enquiries.assigneeId))
    .where(eq(enquiries.id, id))
    .limit(1);
  return row ? row2detail(row) : null;
}

/** Counts per pipeline stage, for the tab badges. */
export async function enquiryCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: enquiries.status, n: sql<number>`count(*)::int` })
    .from(enquiries)
    .groupBy(enquiries.status);
  const out: Record<string, number> = {};
  for (const s of ENQUIRY_STATUSES) out[s] = 0;
  for (const r of rows) out[r.status] = r.n;
  out.open = (out.new ?? 0) + (out.active ?? 0);
  return out;
}

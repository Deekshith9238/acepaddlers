import DOMPurify from "dompurify";
import { loadFontsUsedIn } from "@/lib/typography";

/** Stored rich text, sanitized for rendering. Handles both HTML (from
 *  RichTextField) and legacy plain text saved before that field existed
 *  (rendered as \n\n-separated paragraphs). */
export function richTextHtml(body: string | undefined): string {
  const raw = body ?? "";
  const html = isHtml(raw)
    ? raw
    : raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("");
  if (typeof document !== "undefined") loadFontsUsedIn(html);
  return DOMPurify.sanitize(html, { ADD_ATTR: ["data-align", "data-width", "style"] });
}

export const isHtml = (s: string): boolean => /^\s*</.test(s);

/** Rich text as plain words, for schema descriptions and previews. */
export const richTextPlain = (s: string | undefined): string =>
  (s ?? "").replace(/<\/(p|h\d|li|div)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/**
 * A free-text itinerary as HTML. Rich text (from the editor) passes through;
 * older plain text is converted the way people actually pasted it: text
 * copied out of Vacation Labs arrives as "- " bullets hard-wrapped mid-sentence,
 * so dash lines become list items with following lines joined back on, and
 * text with no dashes becomes paragraphs.
 */
export function itineraryHtml(text: string | undefined): string {
  const raw = text ?? "";
  if (isHtml(raw)) return raw;
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const bullet = /^[-•*–]\s+/;
  if (lines.some((l) => bullet.test(l))) {
    const items: string[] = [];
    const lead: string[] = [];
    for (const line of lines) {
      if (!line) continue;
      if (bullet.test(line)) items.push(line.replace(bullet, ""));
      else if (items.length) items[items.length - 1] += " " + line;
      else lead.push(line);
    }
    return (lead.length ? `<p>${esc(lead.join(" "))}</p>` : "") + `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }
  return raw.split(/\n\s*\n/).map((p) => p.split("\n").map((l) => l.trim()).join(" ").trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
}

/**
 * Inclusions, exclusions and highlights stay lists (one item per bullet, so
 * the trip page keeps its tick / cross icons), but each item may now carry
 * formatting. Items saved before the editor are plain text.
 */
export const listItemHtml = (item: string): string =>
  DOMPurify.sanitize(isHtml(item) ? item : esc(item), { ADD_ATTR: ["style"] });

/** Stored items → one bullet list for the editor. */
export const linesToListHtml = (items: string[]): string =>
  items.length ? `<ul>${items.map((i) => `<li>${isHtml(i) ? i : `<p>${esc(i)}</p>`}</li>`).join("")}</ul>` : "";

/** Editor HTML → stored items: each bullet (or stray paragraph) is one item. */
export function listHtmlToLines(html: string): string[] {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild!;
  const nodes = root.querySelectorAll(":scope > ul > li, :scope > ol > li, :scope > p, :scope > h2, :scope > h3");
  return [...nodes].filter((n) => n.textContent?.trim()).map((n) => n.innerHTML.trim());
}

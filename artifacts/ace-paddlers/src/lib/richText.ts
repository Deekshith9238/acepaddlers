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
  return pairFloats(DOMPurify.sanitize(html, { ADD_ATTR: ["data-align", "data-width", "style"] }));
}

/**
 * A picture placed beside its text, kept beside *that* text.
 *
 * The editor writes a wrapped image as a CSS float, which lets whatever follows
 * flow around it. The editing box is narrow, so each caption fills the space
 * and the next picture starts below — on the page the column is far wider, the
 * same words take fewer lines, and the following headings ride up beside the
 * previous picture, one pair out of step with the next.
 *
 * So each floated image and the text that follows it (up to the next image)
 * becomes one block that contains its float (`display: flow-root`). Inside it
 * the picture floats exactly as in the editor — text beside it, and whatever
 * the blank lines push past its bottom runs full width underneath — while the
 * next picture always starts a fresh block, so its heading cannot ride up. On
 * a phone the picture stops floating — see index.css.
 */
function pairFloats(html: string): string {
  if (typeof document === "undefined" || !/float\s*:/i.test(html)) return html;
  const root = document.createElement("div");
  root.innerHTML = html;
  const isFloating = (el: Element) =>
    el.tagName === "IMG" && /float\s*:\s*(left|right)/i.test(el.getAttribute("style") ?? "");

  for (const img of [...root.children].filter(isFloating)) {
    const row = document.createElement("div");
    row.className = "ace-float-row";
    img.replaceWith(row);
    row.appendChild(img);
    let next = row.nextElementSibling;
    while (next && !isFloating(next)) {
      const take = next;
      next = next.nextElementSibling;
      row.appendChild(take);
    }
  }
  return root.innerHTML;
}

export const isHtml = (s: string): boolean => /^\s*</.test(s);

/**
 * Rich text for an inline spot (a heading, a FAQ question): sanitized, with a
 * single unstyled paragraph unwrapped so short text stays truly inline, and
 * any other block turned into a block-like span — the element it sits in is
 * often an <h2> or <p>, where a nested <p> is invalid HTML.
 */
export function richTextInline(html: string | undefined): string {
  const raw = (html ?? "").trim();
  if (!raw) return "";
  const clean = richTextHtml(raw);
  const single = clean.match(/^<p>([\s\S]*)<\/p>$/);
  if (single && !single[1].includes("<p")) return single[1];
  return clean
    .replace(/<(?:p|h2|h3|div|ul|ol|li)(\s[^>]*)?>/g, (_m, attrs: string | undefined) => {
      const style = /style="([^"]*)"/.exec(attrs ?? "")?.[1] ?? "";
      return `<span style="display:block;${style}">`;
    })
    .replace(/<\/(?:p|h2|h3|div|ul|ol|li)>/g, "</span>");
}

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

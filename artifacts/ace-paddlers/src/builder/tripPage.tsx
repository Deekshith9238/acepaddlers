import { createContext, useContext } from "react";

/**
 * The trip a builder page belongs to.
 *
 * A trip's page is that trip's page, so a live section on it should not have to
 * be told which trip to read — Vacation Labs never asked, and people kept
 * publishing sections with an empty "Trip slug" that then rendered nothing at
 * all on the live site, with no sign anything was wrong.
 *
 * The slug box stays, for the one case it is actually for: showing a *different*
 * trip's content on some other page. An explicit slug always wins.
 */
const TripPageContext = createContext<string>("");

/**
 * Same value, readable outside React.
 *
 * Puck resolves a block's settings-panel fields through `resolveFields`, which
 * is a plain function with no access to context. It needs the page's trip to
 * build the "Edit this trip →" link.
 */
let currentPageTripSlug = "";
export const getPageTripSlug = (): string => currentPageTripSlug;

export function TripPageProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  currentPageTripSlug = slug;
  return <TripPageContext.Provider value={slug}>{children}</TripPageContext.Provider>;
}

/** The trip this block should read: its own setting, else the page's trip. */
export function useTripSlug(explicit?: string): string {
  const fromPage = useContext(TripPageContext);
  return (explicit ?? "").trim() || fromPage;
}

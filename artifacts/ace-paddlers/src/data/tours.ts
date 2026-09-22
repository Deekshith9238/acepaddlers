/** Tour types are admin-managed (Admin → Tour Types), so this is an open
 *  string rather than a fixed union — a new activity type must not need a
 *  code change to exist. */
export type TourType = string;

export interface RapidGrade {
  grade: string;
  title: string;
  desc: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface Tour {
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  price: string;
  priceValue: number;
  duration: string;
  location: string;
  type: TourType;
  img: string;
  heroImg: string;
  tagline: string;
  description: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  difficulty?: "Easy" | "Moderate" | "Challenging";
  groupSize?: string;
  minAge?: string;
  maxWeight?: string;
  season?: string;
  stretchLength?: string;
  rapidGrades?: RapidGrade[];
  activities?: string[];
  faqs?: FAQ[];

  /**
   * Everything below is set in the trip editor and was, until now, invisible
   * to the site: `adaptTour` dropped it on the way from the API to the page.
   * Optional throughout, because the hand-written seed trips in this file
   * predate all of it and a trip that has never been opened in the editor
   * still has to render.
   */
  advertisedPrice?: number;
  showAdvertisedPrice?: boolean;
  priceLabelPosition?: "before" | "after" | "none";
  /** The label's own words ("Starting from", "Per Person"); empty = each spot's default wording. */
  priceLabel?: string;
  showGroupRates?: boolean;
  /** This trip's own trust badges; absent = the site-wide ones. */
  trustBadges?: string[];
  terms?: string;
  itinerary?: ItineraryDay[];
  itineraryText?: string;
  shortAddress?: string;
  detailedAddress?: string;
  directions?: string;
  latitude?: string;
  longitude?: string;
  /** Custom nouns, e.g. { participant: "Paddler" }. */
  labels?: Record<string, string>;
  minParticipants?: number;
  maxParticipants?: number;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface ItineraryDay {
  title?: string;
  /** `text` is the editor's old name for `title`; read, never written. */
  items?: { title?: string; description?: string | null; time?: string | null; text?: string | null }[];
}

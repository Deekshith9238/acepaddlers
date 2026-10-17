/**
 * Gallery types and the filter list.
 *
 * The images themselves come from the database via `/api/gallery`. Only the
 * category list is still declared here, because it is the set of filters the
 * page offers rather than content.
 */
export type GalleryCategory = "All" | "Rafting" | "Camping" | "Homestay" | "Destinations";

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  caption: string;
  category: Exclude<GalleryCategory, "All">;
  tall?: boolean;
}

export const CATEGORIES: GalleryCategory[] = ["All", "Rafting", "Camping", "Homestay", "Destinations"];

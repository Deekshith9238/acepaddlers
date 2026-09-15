// Config-driven admin: one entry per content type wires its fields, list
// columns and the generated CRUD hooks. The generic List/Form components read
// these so all four resources share one implementation.
import {
  useListAdminDestinations, useCreateDestination, useUpdateDestination, useDeleteDestination,
  useListAdminTours, useCreateTour, useUpdateTour, useDeleteTour,
  useListAdminBlogPosts, useCreateBlogPost, useUpdateBlogPost, useDeleteBlogPost,
  useListAdminGallery, useCreateGalleryItem, useUpdateGalleryItem, useDeleteGalleryItem,
  useListAdminTourTypes, useCreateTourType, useUpdateTourType, useDeleteTourType,
  useListAdminTourCategories, useCreateTourCategory, useUpdateTourCategory, useDeleteTourCategory,
} from "@workspace/api-client-react";

export type FieldType =
  | "text" | "textarea" | "number" | "select" | "dynamicSelect" | "tags" | "bool" | "toggle" | "json" | "date" | "media" | "mediaList";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  /** For type "dynamicSelect": which admin-managed lookup to populate the dropdown from. */
  optionsSource?: "tourTypes" | "tourCategories";
  /** For type "toggle": the two string values the switch flips between, and
   *  the human-readable caption shown for each. */
  toggle?: {
    onValue: string;
    offValue: string;
    onLabel: string;
    offLabel: string;
    onHelp: string;
    offHelp: string;
  };
  required?: boolean;
  help?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ResourceConfig {
  key: string;
  label: string;
  singular: string;
  listColumns: { field: string; label: string }[];
  fields: FieldDef[];
  hooks: {
    useList: () => any;
    useCreate: () => any;
    useUpdate: () => any;
    useDelete: () => any;
  };
}

const STATUS: FieldDef = { name: "status", label: "Status", type: "select", options: ["draft", "published"] };

export const RESOURCES: Record<string, ResourceConfig> = {
  destinations: {
    key: "destinations",
    label: "Destinations",
    singular: "Destination",
    listColumns: [
      { field: "name", label: "Name" },
      { field: "slug", label: "Slug" },
      { field: "status", label: "Status" },
    ],
    fields: [
      { name: "slug", label: "Slug", type: "text", required: true, help: "URL: /destinations/<slug>" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "fullName", label: "Full name", type: "text" },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "heroImage", label: "Hero image", type: "media" },
      { name: "images", label: "Images", type: "mediaList", help: "Upload multiple — the page banner rotates through them" },
      { name: "highlights", label: "Highlights", type: "tags", help: "One per line" },
      { name: "bestTime", label: "Best time to visit", type: "text" },
      { name: "distance", label: "Distance", type: "text" },
      { name: "mapEmbed", label: "Map embed", type: "textarea" },
      { name: "seoTitle", label: "SEO title", type: "text" },
      { name: "seoDescription", label: "SEO description", type: "textarea" },
      STATUS,
      { name: "sortOrder", label: "Sort order", type: "number" },
    ],
    hooks: {
      useList: useListAdminDestinations,
      useCreate: useCreateDestination,
      useUpdate: useUpdateDestination,
      useDelete: useDeleteDestination,
    },
  },
  tours: {
    key: "tours",
    label: "Tours",
    singular: "Tour",
    listColumns: [
      { field: "title", label: "Title" },
      { field: "type", label: "Type" },
      { field: "priceValue", label: "Price" },
      { field: "status", label: "Status" },
    ],
    fields: [
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "type", label: "Type", type: "dynamicSelect", optionsSource: "tourTypes", required: true, help: "Manage the list under Tour Types" },
      { name: "category", label: "Category", type: "dynamicSelect", optionsSource: "tourCategories", help: "Which destination section this appears in — manage the list under Tour Categories" },
      { name: "destinationId", label: "Destination ID", type: "text", help: "Optional — links to a destination" },
      { name: "location", label: "Location", type: "text" },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "heroImage", label: "Hero image", type: "media" },
      { name: "images", label: "Images", type: "mediaList", help: "Upload multiple — the tour banner rotates through them" },
      { name: "priceValue", label: "Price (₹, whole rupees)", type: "number", required: true },
      { name: "currency", label: "Currency", type: "text" },
      { name: "duration", label: "Duration", type: "text" },
      { name: "details.groupSize", label: "Group size", type: "text", help: "Shown on the tour page, e.g. “Up to 8 per raft”" },
      { name: "capacityPerSlot", label: "Capacity per slot", type: "number", help: "Bookable seats per time slot" },
      {
        name: "bookingMode",
        label: "Booking mode",
        type: "toggle",
        toggle: {
          onValue: "direct",
          offValue: "enquiry",
          onLabel: "Direct booking",
          offLabel: "Enquiry only",
          onHelp: "Customers pay online straight away (UPI / card / netbanking) and this tour's bookings confirm automatically once payment succeeds.",
          offHelp: "Customers submit a request and pay nothing online. Bookings arrive as “pending” for your team to confirm — you can send a payment link later from the Bookings page.",
        },
      },
      { name: "minAge", label: "Min age", type: "number" },
      { name: "maxWeightKg", label: "Max weight (kg)", type: "number" },
      { name: "season", label: "Season", type: "text" },
      { name: "difficulty", label: "Difficulty", type: "text" },
      { name: "highlights", label: "Highlights", type: "tags", help: "One per line" },
      { name: "included", label: "Included", type: "tags", help: "One per line" },
      { name: "excluded", label: "Excluded", type: "tags", help: "One per line" },
      { name: "details", label: "Details (JSON)", type: "json", help: "rapidGrades, faqs, activities, etc." },
      { name: "seoTitle", label: "SEO title", type: "text" },
      { name: "seoDescription", label: "SEO description", type: "textarea" },
      STATUS,
      { name: "sortOrder", label: "Sort order", type: "number" },
    ],
    hooks: {
      useList: useListAdminTours,
      useCreate: useCreateTour,
      useUpdate: useUpdateTour,
      useDelete: useDeleteTour,
    },
  },
  blog: {
    key: "blog",
    label: "Blog",
    singular: "Blog post",
    listColumns: [
      { field: "title", label: "Title" },
      { field: "slug", label: "Slug" },
      { field: "status", label: "Status" },
    ],
    fields: [
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "excerpt", label: "Excerpt", type: "textarea" },
      { name: "coverImage", label: "Cover image", type: "media" },
      { name: "body", label: "Body (Markdown)", type: "textarea" },
      { name: "author", label: "Author", type: "text" },
      { name: "tags", label: "Tags", type: "tags", help: "One per line" },
      { name: "readTime", label: "Read time", type: "text" },
      STATUS,
      { name: "publishedAt", label: "Published date", type: "date" },
      { name: "seoTitle", label: "SEO title", type: "text" },
      { name: "seoDescription", label: "SEO description", type: "textarea" },
    ],
    hooks: {
      useList: useListAdminBlogPosts,
      useCreate: useCreateBlogPost,
      useUpdate: useUpdateBlogPost,
      useDelete: useDeleteBlogPost,
    },
  },
  gallery: {
    key: "gallery",
    label: "Gallery",
    singular: "Gallery item",
    listColumns: [
      { field: "caption", label: "Caption" },
      { field: "category", label: "Category" },
      { field: "published", label: "Published" },
    ],
    fields: [
      { name: "src", label: "Image", type: "media", required: true },
      { name: "alt", label: "Alt text", type: "text" },
      { name: "caption", label: "Caption", type: "text" },
      { name: "category", label: "Category", type: "select", required: true, options: ["Rafting", "Camping", "Homestay", "Destinations"] },
      { name: "tall", label: "Tall (portrait)", type: "bool" },
      { name: "sortOrder", label: "Sort order", type: "number" },
      { name: "published", label: "Published", type: "bool" },
    ],
    hooks: {
      useList: useListAdminGallery,
      useCreate: useCreateGalleryItem,
      useUpdate: useUpdateGalleryItem,
      useDelete: useDeleteGalleryItem,
    },
  },
  tourTypes: {
    key: "tourTypes",
    label: "Tour Types",
    singular: "Tour type",
    listColumns: [
      { field: "label", label: "Label" },
      { field: "slug", label: "Slug" },
      { field: "sortOrder", label: "Sort order" },
    ],
    fields: [
      { name: "label", label: "Label", type: "text", required: true, help: "Shown to visitors, e.g. “Trekking”" },
      { name: "slug", label: "Slug", type: "text", required: true, help: "Lowercase, underscores only — used internally, e.g. “trekking”. Avoid changing this once tours use it." },
      { name: "sortOrder", label: "Sort order", type: "number" },
    ],
    hooks: {
      useList: useListAdminTourTypes,
      useCreate: useCreateTourType,
      useUpdate: useUpdateTourType,
      useDelete: useDeleteTourType,
    },
  },
  tourCategories: {
    key: "tourCategories",
    label: "Tour Categories",
    singular: "Tour category",
    listColumns: [
      { field: "label", label: "Label" },
      { field: "slug", label: "Slug" },
      { field: "sortOrder", label: "Sort order" },
    ],
    fields: [
      { name: "label", label: "Label", type: "text", required: true, help: "Shown in admin, e.g. “Package”" },
      { name: "slug", label: "Slug", type: "text", required: true, help: "Lowercase, underscores only — used internally. Avoid changing this once tours use it." },
      { name: "sortOrder", label: "Sort order", type: "number" },
    ],
    hooks: {
      useList: useListAdminTourCategories,
      useCreate: useCreateTourCategory,
      useUpdate: useUpdateTourCategory,
      useDelete: useDeleteTourCategory,
    },
  },
};

/** Convert an API row into flat form values keyed by field name. */
export function rowToForm(fields: FieldDef[], row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    // Fields named "details.key" read/write a nested key inside the details JSON.
    const v = f.name.startsWith("details.")
      ? row?.details?.[f.name.slice("details.".length)]
      : row?.[f.name];
    switch (f.type) {
      case "json":
        out[f.name] = JSON.stringify(v ?? {}, null, 2);
        break;
      case "date":
        out[f.name] = v ? String(v).slice(0, 10) : "";
        break;
      case "tags":
      case "mediaList":
        out[f.name] = Array.isArray(v) ? v : [];
        break;
      case "bool":
        out[f.name] = Boolean(v);
        break;
      case "number":
        out[f.name] = v ?? "";
        break;
      default:
        out[f.name] = v ?? "";
    }
  }
  return out;
}

/**
 * Convert flat form values back into an API input body. Throws on bad JSON.
 * Empty optional scalar fields are omitted (so DB defaults apply and we never
 * send null to a NOT-NULL-with-default column); arrays/bools/json always sent.
 */
export function formToInput(fields: FieldDef[], values: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  // Structured "details.key" fields are collected here and merged onto the
  // details JSON object at the end (so both the raw JSON field and the friendly
  // fields can coexist; the structured fields win on conflict).
  const detailsOverlay: Record<string, any> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.name.startsWith("details.")) {
      const key = f.name.slice("details.".length);
      if (v !== "" && v != null) detailsOverlay[key] = v;
      continue;
    }
    switch (f.type) {
      case "json":
        out[f.name] = v && String(v).trim() ? JSON.parse(v) : {};
        break;
      case "tags":
      case "mediaList":
        out[f.name] = Array.isArray(v) ? v : [];
        break;
      case "bool":
        out[f.name] = Boolean(v);
        break;
      case "date":
        if (v) out[f.name] = new Date(v).toISOString();
        break;
      case "number":
        if (v !== "" && v != null) out[f.name] = Number(v);
        break;
      default:
        if (v !== "" && v != null) out[f.name] = v;
    }
  }
  if (Object.keys(detailsOverlay).length > 0) {
    out.details = { ...(out.details ?? {}), ...detailsOverlay };
  }
  return out;
}

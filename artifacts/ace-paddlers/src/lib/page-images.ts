import { useEffect, useState } from "react";

export type PageImagesMap = Record<string, string[]>;

export const PAGE_IMAGE_KEYS = [
  { key: "home", label: "Home" },
  { key: "about", label: "About Us" },
  { key: "tours", label: "All Tours" },
  { key: "experiences", label: "Experiences" },
  { key: "destinations", label: "Destinations" },
  { key: "gallery", label: "Gallery" },
  { key: "blog", label: "Blog" },
  { key: "contact", label: "Contact" },
  { key: "safety", label: "Safety" },
  { key: "corporate", label: "Corporate Groups" },
] as const;

const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Public hero image map for the storefront. Falls back to {} on error. */
export async function fetchPageImages(): Promise<PageImagesMap> {
  try {
    const res = await fetch(`${baseUrl()}/api/page-images`);
    if (!res.ok) return {};
    const data = await res.json();
    return data && typeof data === "object" ? (data as PageImagesMap) : {};
  } catch {
    return {};
  }
}

export async function fetchAdminPageImages(): Promise<PageImagesMap> {
  const res = await fetch(`${baseUrl()}/api/admin/page-images`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load page images.");
  return (await res.json()) as PageImagesMap;
}

export async function saveAdminPageImages(map: PageImagesMap): Promise<PageImagesMap> {
  const res = await fetch(`${baseUrl()}/api/admin/page-images`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(map),
  });
  if (!res.ok) throw new Error("Failed to save page images.");
  return (await res.json()) as PageImagesMap;
}

/** Admin-configured hero images for one page key (empty array until loaded / if unset). */
export function usePageImages(key: string): string[] {
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    fetchPageImages().then((map) => setImages(map[key] ?? []));
  }, [key]);
  return images;
}

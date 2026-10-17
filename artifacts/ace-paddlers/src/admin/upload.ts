export interface UploadedMedia {
  id: string;
  kind: "image" | "video";
  url: string | null;
  hlsUrl: string | null;
  posterUrl: string | null;
}

/**
 * Upload a file to the admin media endpoint (multipart). Sends the bearer
 * token so it works cross-origin, matching the rest of the admin API client.
 */
export async function uploadMedia(file: File): Promise<UploadedMedia> {
  const fd = new FormData();
  fd.append("file", file);
  const baseUrl = import.meta.env.VITE_API_URL || "";
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${baseUrl}/api/admin/media`, {
    method: "POST",
    body: fd,
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    if (res.status === 415) throw new Error("Unsupported file type.");
    throw new Error("Upload failed.");
  }
  return res.json();
}

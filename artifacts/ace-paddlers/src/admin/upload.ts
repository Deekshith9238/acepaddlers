export interface UploadedMedia {
  id: string;
  kind: "image" | "video";
  url: string | null;
  hlsUrl: string | null;
  posterUrl: string | null;
}

/** Upload a file to the admin media endpoint (multipart). Cookie auth via same-origin. */
export async function uploadMedia(file: File): Promise<UploadedMedia> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/media", { method: "POST", body: fd });
  if (!res.ok) {
    if (res.status === 415) throw new Error("Unsupported file type.");
    throw new Error("Upload failed.");
  }
  return res.json();
}

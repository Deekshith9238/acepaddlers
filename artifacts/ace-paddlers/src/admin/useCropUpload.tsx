import { useState } from "react";
import ImageCropper from "./ImageCropper";

/**
 * Crop an image that is already uploaded: pick it, adjust it, and the cropped
 * copy is uploaded in its place.
 *
 * Cropping deliberately does not happen while uploading — dropping twenty
 * photos in should just upload twenty photos. You crop one when you choose to.
 */
export function useCropExisting(onCropped: (file: File) => void | Promise<void>) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch the stored image back so it can be re-cropped at full resolution. */
  const startCrop = async (url: string) => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(url, { cache: "reload" });
      if (!res.ok) throw new Error("Couldn't open that image.");
      const blob = await res.blob();
      const name = (url.split("/").pop() || "image.jpg").split("?")[0];
      setFile(new File([blob], name, { type: blob.type || "image/jpeg" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that image.");
    } finally {
      setBusy(false);
    }
  };

  const cropper = file ? (
    <ImageCropper
      file={file}
      onCancel={() => setFile(null)}
      onDone={async (cropped) => {
        setFile(null);
        setBusy(true);
        try {
          await onCropped(cropped);
        } finally {
          setBusy(false);
        }
      }}
    />
  ) : null;

  return { startCrop, cropper, cropBusy: busy, cropError: error };
}

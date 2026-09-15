import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { db, mediaAssets } from "@workspace/db";
import { storage } from "./storage";

export interface UploadInput {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export class UnsupportedMediaError extends Error {
  constructor() {
    super("unsupported_media_type");
  }
}

/** Store + process an uploaded file, returning the media_assets row. */
export async function processUpload(file: UploadInput) {
  const id = randomUUID();

  if (file.mimetype.startsWith("image/")) {
    const meta = await sharp(file.buffer).metadata();
    const optimized = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    const key = `img/${id}.jpg`;
    await storage.save(key, optimized);
    const [row] = await db
      .insert(mediaAssets)
      .values({
        kind: "image",
        status: "ready",
        url: storage.publicUrl(key),
        storageKey: key,
        filename: file.originalname,
        mime: "image/jpeg",
        width: meta.width ?? null,
        height: meta.height ?? null,
      })
      .returning();
    return row;
  }

  if (file.mimetype.startsWith("video/")) {
    // Store the original file directly and serve it via an HTML5 <video> tag —
    // same flow as images. (HLS/MediaConvert transcoding is a later phase.)
    const ext = (path.extname(file.originalname) || ".mp4").toLowerCase();
    const key = `video/${id}${ext}`;
    await storage.save(key, file.buffer);
    const [row] = await db
      .insert(mediaAssets)
      .values({
        kind: "video",
        status: "ready",
        url: storage.publicUrl(key),
        storageKey: key,
        filename: file.originalname,
        mime: file.mimetype,
      })
      .returning();
    return row;
  }

  throw new UnsupportedMediaError();
}

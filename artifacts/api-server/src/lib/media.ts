import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { writeFile, rm } from "node:fs/promises";
import sharp from "sharp";
import { db, mediaAssets } from "@workspace/db";
import { storage } from "./storage";
import { transcoder } from "./transcoder";

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
    const tmp = path.join(os.tmpdir(), `${id}-source`);
    await writeFile(tmp, file.buffer);
    try {
      const { hlsKey, posterKey } = await transcoder.toHls(tmp, `video/${id}`);
      const [row] = await db
        .insert(mediaAssets)
        .values({
          kind: "video",
          status: "ready",
          hlsUrl: storage.publicUrl(hlsKey),
          posterUrl: storage.publicUrl(posterKey),
          storageKey: `video/${id}`,
          filename: file.originalname,
          mime: file.mimetype,
        })
        .returning();
      return row;
    } finally {
      await rm(tmp, { force: true });
    }
  }

  throw new UnsupportedMediaError();
}

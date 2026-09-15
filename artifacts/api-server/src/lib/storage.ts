import path from "node:path";
import os from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Object storage abstraction. The local implementation writes to disk and
 * serves under `/media`; the S3 implementation puts objects to the media
 * bucket and returns their public URLs. Callers only depend on this interface.
 */
export interface StorageProvider {
  /** Persist bytes at `key` (a relative path like "img/abc.jpg"). */
  save(key: string, data: Buffer): Promise<void>;
  /** Absolute filesystem path for `key` (used by the transcoder to write HLS). */
  pathFor(key: string): string;
  /** Public URL the browser can load `key` from. */
  publicUrl(key: string): string;
  /** Ensure a directory (relative key prefix) exists. */
  ensureDir(prefix: string): Promise<string>;
}

const MEDIA_ROOT = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.resolve(process.cwd(), ".media");

const PUBLIC_PREFIX = "/media";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
};

function contentTypeFor(key: string): string {
  return CONTENT_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}

class LocalStorageProvider implements StorageProvider {
  async save(key: string, data: Buffer): Promise<void> {
    const full = this.pathFor(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  pathFor(key: string): string {
    return path.join(MEDIA_ROOT, key);
  }

  publicUrl(key: string): string {
    return `${PUBLIC_PREFIX}/${key}`;
  }

  async ensureDir(prefix: string): Promise<string> {
    const dir = path.join(MEDIA_ROOT, prefix);
    await mkdir(dir, { recursive: true });
    return dir;
  }
}

/**
 * Stores objects in the media S3 bucket. Credentials come from the ambient
 * environment (the ECS task role on AWS). `pathFor`/`ensureDir` return local
 * scratch paths under the temp dir — only used by the ffmpeg transcoder, which
 * isn't wired to S3 yet (video would need MediaConvert).
 */
class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    private readonly region: string,
    private readonly publicBase: string,
  ) {
    this.client = new S3Client({ region });
  }

  async save(key: string, data: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentTypeFor(key),
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  pathFor(key: string): string {
    return path.join(os.tmpdir(), "ace-media", key);
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }

  async ensureDir(prefix: string): Promise<string> {
    const dir = path.join(os.tmpdir(), "ace-media", prefix);
    await mkdir(dir, { recursive: true });
    return dir;
  }
}

function createStorage(): StorageProvider {
  const bucket = process.env.MEDIA_BUCKET;
  if (bucket) {
    const region = process.env.AWS_REGION ?? "us-east-1";
    const publicBase =
      process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/+$/, "") ??
      `https://${bucket}.s3.${region}.amazonaws.com`;
    return new S3StorageProvider(bucket, region, publicBase);
  }
  return new LocalStorageProvider();
}

export const storage: StorageProvider = createStorage();
export const mediaRoot = MEDIA_ROOT;
export const mediaPublicPrefix = PUBLIC_PREFIX;

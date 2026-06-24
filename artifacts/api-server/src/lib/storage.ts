import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

/**
 * Object storage abstraction. The local implementation writes to disk and
 * serves under `/media`; the AWS implementation (Phase 4) will put to S3 and
 * return CloudFront URLs. Callers only depend on this interface.
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

export const storage: StorageProvider = new LocalStorageProvider();
export const mediaRoot = MEDIA_ROOT;
export const mediaPublicPrefix = PUBLIC_PREFIX;

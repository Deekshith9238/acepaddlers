import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, mediaAssets } from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { processUpload, UnsupportedMediaError } from "../../lib/media";
import { mediaUsageCounts } from "../../lib/media-usage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("content"));

router.get("/media", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const kind = typeof req.query.kind === "string" ? req.query.kind : "";
  const where: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const term = or(ilike(mediaAssets.filename, like), ilike(mediaAssets.url, like));
    if (term) where.push(term);
  }
  if (kind === "image" || kind === "video") where.push(eq(mediaAssets.kind, kind));

  const rows = await db
    .select()
    .from(mediaAssets)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(mediaAssets.createdAt));

  // "In use" is what makes deletion safe — the old platform showed this and
  // it's the difference between confidently clearing out 400 stale photos and
  // never touching the library at all.
  const usage = await mediaUsageCounts(rows.map((r) => r.url ?? "").filter(Boolean));
  res.json(
    rows.map((m) => ({
      id: m.id,
      kind: m.kind,
      status: m.status,
      url: m.url,
      hlsUrl: m.hlsUrl,
      posterUrl: m.posterUrl,
      filename: m.filename,
      mime: m.mime,
      width: m.width,
      height: m.height,
      usageCount: m.url ? (usage.get(m.url) ?? 0) : 0,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

router.post("/media", upload.single("file"), async (req, res) => {
  const f = req.file;
  if (!f) {
    res.status(400).json({ error: "no_file" });
    return;
  }
  try {
    const row = await processUpload({
      buffer: f.buffer,
      mimetype: f.mimetype,
      originalname: f.originalname,
    });
    res.status(201).json(row);
  } catch (e) {
    if (e instanceof UnsupportedMediaError) {
      res.status(415).json({ error: "unsupported_type" });
      return;
    }
    throw e;
  }
});

async function deleteAsset(req: Request<{ id: string }>, res: Response, force: boolean): Promise<void> {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, req.params.id)).limit(1);
  if (!asset) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  // Refuse to delete something still referenced by a tour, page or post
  // unless the caller has seen the count and insisted.
  if (asset.url && !force) {
    const usage = await mediaUsageCounts([asset.url]);
    const n = usage.get(asset.url) ?? 0;
    if (n > 0) {
      res.status(409).json({ error: "in_use", usageCount: n });
      return;
    }
  }
  await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
  res.status(204).end();
}

router.delete("/media/:id", (req, res) => void deleteAsset(req, res, false));
// Separate route rather than a ?force flag: the destructive variant should be
// impossible to trigger by accident from a stale client.
router.delete("/media/:id/force", (req, res) => void deleteAsset(req, res, true));

export default router;

import { Router, type IRouter } from "express";
import multer from "multer";
import { desc, eq } from "drizzle-orm";
import { db, mediaAssets } from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { processUpload, UnsupportedMediaError } from "../../lib/media";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

const router: IRouter = Router();
router.use(requireAdmin);

router.get("/media", async (_req, res) => {
  const rows = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
  res.json(rows);
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

router.delete("/media/:id", async (req, res) => {
  const [row] = await db
    .delete(mediaAssets)
    .where(eq(mediaAssets.id, req.params.id))
    .returning({ id: mediaAssets.id });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

export default router;

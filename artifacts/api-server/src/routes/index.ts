import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import adminAuthRouter from "./admin/auth";
import adminContentRouter from "./admin/content";
import adminMediaRouter from "./admin/media";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contentRouter);
router.use("/admin", adminAuthRouter);
router.use("/admin", adminContentRouter);
router.use("/admin", adminMediaRouter);

export default router;

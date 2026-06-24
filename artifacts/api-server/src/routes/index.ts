import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import bookingRouter from "./booking";
import adminAuthRouter from "./admin/auth";
import adminContentRouter from "./admin/content";
import adminMediaRouter from "./admin/media";
import adminBookingRouter from "./admin/booking";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contentRouter);
router.use(bookingRouter);
router.use("/admin", adminAuthRouter);
router.use("/admin", adminContentRouter);
router.use("/admin", adminMediaRouter);
router.use("/admin", adminBookingRouter);

export default router;

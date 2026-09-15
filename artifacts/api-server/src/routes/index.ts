import { Router, type IRouter } from "express";
import { invalidateOnWrite } from "../middlewares/invalidateOnWrite";
import healthRouter from "./health";
import contentRouter from "./content";
import bookingRouter from "./booking";
import webhooksRouter from "./webhooks";
import enquiryRouter from "./enquiry";
import themeRouter from "./theme";
import adminAuthRouter from "./admin/auth";
import adminContentRouter from "./admin/content";
import adminMediaRouter from "./admin/media";
import adminBookingRouter from "./admin/booking";
import adminIntegrationsRouter from "./admin/integrations";
import adminPagesRouter from "./admin/pages";
import adminThemeRouter from "./admin/theme";
import adminEmailTemplatesRouter from "./admin/email-templates";
import adminWhatsAppTemplatesRouter from "./admin/whatsapp-templates";
import adminPaymentsRouter from "./admin/payments";
import adminSeoRouter from "./admin/seo";
import adminTourLookupsRouter from "./admin/tour-lookups";
import adminEnquiriesRouter from "./admin/enquiries";
import adminCustomersRouter from "./admin/customers";
import adminCouponsRouter from "./admin/coupons";
import adminReviewsRouter from "./admin/reviews";
import adminRateCardRouter from "./admin/rate-card";
import adminTourEditorRouter from "./admin/tour-editor";
import adminOperationsRouter from "./admin/operations";
import adminAgentsRouter from "./admin/agents";
import firebaseRouter from "./firebase";
import agentAuthRouter from "./agent/auth";
import agentPortalRouter from "./agent/portal";
import adminReportsRouter from "./admin/reports";
import trackRouter from "./track";
import searchRouter from "./search";
import bookingIntentRouter from "./booking-intent";
import adminUsersRouter from "./admin/users";
import adminChargesRouter from "./admin/charges";
import adminRedirectsRouter from "./admin/redirects";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contentRouter);
router.use(bookingRouter);
router.use(webhooksRouter);
router.use(enquiryRouter);
router.use(trackRouter);
router.use(searchRouter);
router.use(bookingIntentRouter);
router.use(themeRouter);
// Any successful admin write drops the public render cache, so the site
// reflects an edit immediately instead of up to ten minutes later.
// Before every guarded /admin router: these two endpoints are how a session is
// obtained, so they must not sit behind one that already requires it.
router.use(firebaseRouter);

router.use("/admin", invalidateOnWrite);

router.use("/admin", adminAuthRouter);
router.use("/admin", adminContentRouter);
router.use("/admin", adminMediaRouter);
router.use("/admin", adminBookingRouter);
router.use("/admin", adminIntegrationsRouter);
router.use("/admin", adminPagesRouter);
router.use("/admin", adminThemeRouter);
router.use("/admin", adminEmailTemplatesRouter);
router.use("/admin", adminWhatsAppTemplatesRouter);
router.use("/admin", adminPaymentsRouter);
router.use("/admin", adminSeoRouter);
router.use("/admin", adminTourLookupsRouter);
router.use("/admin", adminEnquiriesRouter);
router.use("/admin", adminCustomersRouter);
router.use("/admin", adminCouponsRouter);
router.use("/admin", adminReviewsRouter);
router.use("/admin", adminRateCardRouter);
router.use("/admin", adminTourEditorRouter);
router.use("/admin", adminOperationsRouter);
router.use("/admin", adminAgentsRouter);

// The agent portal is its own realm, mounted well away from /admin: nothing
// under /agent consults an admin session, and nothing under /admin consults an
// agent one.
router.use("/agent", agentAuthRouter);
router.use("/agent", agentPortalRouter);
router.use("/admin", adminReportsRouter);
router.use("/admin", adminUsersRouter);
router.use("/admin", adminChargesRouter);
router.use("/admin", adminRedirectsRouter);

export default router;

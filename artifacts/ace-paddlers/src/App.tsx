import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fetchTheme, applyTheme } from "@/lib/theme";
import { fetchTypography, applyTypography } from "@/lib/typography";
import { track } from "@/lib/analytics";
import Layout from "@/components/Layout";
import { CurrentTourProvider } from "@/components/CurrentTourContext";
import AdminLayout from "@/admin/AdminLayout";
import Home from "@/pages/Home";

// Code-split: Home loads eagerly (landing page); the rest load on demand.
const NotFound = lazy(() => import("@/pages/not-found"));
const Tours = lazy(() => import("@/pages/Tours"));
const TourDetail = lazy(() => import("@/pages/TourDetail"));
const Experiences = lazy(() => import("@/pages/Experiences"));
const About = lazy(() => import("@/pages/About"));
const Destinations = lazy(() => import("@/pages/Destinations"));
const DestinationDetail = lazy(() => import("@/pages/DestinationDetail"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const Safety = lazy(() => import("@/pages/Safety"));
const Contact = lazy(() => import("@/pages/Contact"));
const Corporate = lazy(() => import("@/pages/Corporate"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const BookingConfirmation = lazy(() => import("@/pages/BookingConfirmation"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const CancellationPolicy = lazy(() => import("@/pages/CancellationPolicy"));
const DataDeletion = lazy(() => import("@/pages/DataDeletion"));
const CustomPage = lazy(() => import("@/pages/CustomPage"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminList = lazy(() => import("@/pages/admin/AdminList"));
const AdminForm = lazy(() => import("@/pages/admin/AdminForm"));
const AdminBookings = lazy(() => import("@/pages/admin/AdminBookings"));
const AdminBookingDetail = lazy(() => import("@/pages/admin/AdminBookingDetail"));
const AdminAgents = lazy(() => import("@/pages/admin/AdminAgents"));
const AdminAgentDetail = lazy(() => import("@/pages/admin/AdminAgentDetail"));
const AgentLogin = lazy(() => import("@/pages/agent/AgentLogin"));
const AgentSetPassword = lazy(() => import("@/pages/agent/AgentSetPassword"));
const AgentPortal = lazy(() => import("@/pages/agent/AgentPortal"));
const AdminAvailability = lazy(() => import("@/pages/admin/AdminAvailability"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminGallery = lazy(() => import("@/pages/admin/AdminGallery"));
const AdminPages = lazy(() => import("@/pages/admin/AdminPages"));
const AdminPageEditor = lazy(() => import("@/pages/admin/AdminPageEditor"));
const AdminTheme = lazy(() => import("@/pages/admin/AdminTheme"));
const AdminEmailTemplates = lazy(() => import("@/pages/admin/AdminEmailTemplates"));
const AdminWhatsAppTemplates = lazy(() => import("@/pages/admin/AdminWhatsAppTemplates"));
const AdminPayments = lazy(() => import("@/pages/admin/AdminPayments"));
const AdminNavigation = lazy(() => import("@/pages/admin/AdminNavigation"));
const AdminPageImages = lazy(() => import("@/pages/admin/AdminPageImages"));
const AdminEnquiries = lazy(() => import("@/pages/admin/AdminEnquiries"));
const AdminCustomers = lazy(() => import("@/pages/admin/AdminCustomers"));
const AdminCoupons = lazy(() => import("@/pages/admin/AdminCoupons"));
const AdminTripEditor = lazy(() => import("@/pages/admin/AdminTripEditor"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminCharges = lazy(() => import("@/pages/admin/AdminCharges"));
const AdminRedirects = lazy(() => import("@/pages/admin/AdminRedirects"));
const AdminMedia = lazy(() => import("@/pages/admin/AdminMedia"));
const SearchPage = lazy(() => import("@/pages/Search"));

const queryClient = new QueryClient();
import { setAuthTokenGetter } from "@workspace/api-client-react";
/**
 * Two credential realms share one client, so the token is chosen by the URL
 * being called, not by which page happens to be open. An admin token must never
 * reach /api/agent, and an agent token must never reach /api/admin.
 */
setAuthTokenGetter((url) =>
  localStorage.getItem(url.startsWith("/api/agent") || url.includes("/api/agent/") ? "agent_token" : "admin_token"),
);

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#061218" }}>
      <div className="w-10 h-10 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin" />
    </div>
  );
}

/** Fires one pageview per route change. Admin routes are excluded — internal
 *  usage isn't traffic, and counting it would distort every conversion rate. */
function PageTracker() {
  const [location] = useLocation();
  useEffect(() => {
    if (location.startsWith("/admin")) return;
    track("pageview", { path: location });
  }, [location]);
  return null;
}

/**
 * Routing is split into three groups so the page chrome survives navigation.
 *
 * Previously every page rendered its own <Layout>/<AdminLayout>, so changing
 * route unmounted the header, footer and sidebar and mounted fresh ones — the
 * whole shell flashed on every click and read as a full page reload, even
 * though the document never actually reloaded. Hoisting the chrome above the
 * inner <Switch> keeps those nodes mounted and only swaps the page body.
 */
function PublicRoutes() {
  return (
    <CurrentTourProvider>
      <Layout>
        <Suspense fallback={<PageFallback />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/tours" component={Tours} />
            <Route path="/search" component={SearchPage} />
            <Route path="/tours/:slug" component={TourDetail} />
            <Route path="/experiences" component={Experiences} />
            <Route path="/about" component={About} />
            <Route path="/destinations" component={Destinations} />
            <Route path="/destinations/:slug" component={DestinationDetail} />
            <Route path="/gallery" component={Gallery} />
            <Route path="/safety" component={Safety} />
            <Route path="/contact" component={Contact} />
            <Route path="/corporate-groups" component={Corporate} />
            <Route path="/blog" component={Blog} />
            <Route path="/blog/:slug" component={BlogPost} />
            <Route path="/booking/:ref" component={BookingConfirmation} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/cancellation-policy" component={CancellationPolicy} />
            <Route path="/data-deletion" component={DataDeletion} />
            <Route path="/p/:slug" component={CustomPage} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </Layout>
    </CurrentTourProvider>
  );
}

function AdminRoutes() {
  return (
    <AdminLayout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/bookings" component={AdminBookings} />
          <Route path="/admin/bookings/:id" component={AdminBookingDetail} />
          <Route path="/admin/agents" component={AdminAgents} />
          <Route path="/admin/agents/:id" component={AdminAgentDetail} />
          <Route path="/admin/enquiries" component={AdminEnquiries} />
          <Route path="/admin/customers" component={AdminCustomers} />
          <Route path="/admin/coupons" component={AdminCoupons} />
          {/* Superseded by the trip editor; kept so old links still work. */}
          <Route path="/admin/rate-card/:tourId">
            {(p) => <Redirect to={`/admin/tours/${p.tourId}/prices`} />}
          </Route>
          <Route path="/admin/reports" component={AdminReports} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/charges" component={AdminCharges} />
          <Route path="/admin/redirects" component={AdminRedirects} />
          <Route path="/admin/media" component={AdminMedia} />
          <Route path="/admin/payments" component={AdminPayments} />
          <Route path="/admin/availability" component={AdminAvailability} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/gallery" component={AdminGallery} />
          <Route path="/admin/pages" component={AdminPages} />
          <Route path="/admin/pages/:slug" component={AdminPageEditor} />
          <Route path="/admin/theme" component={AdminTheme} />
          <Route path="/admin/email-templates" component={AdminEmailTemplates} />
          <Route path="/admin/whatsapp-templates" component={AdminWhatsAppTemplates} />
          <Route path="/admin/navigation" component={AdminNavigation} />
          <Route path="/admin/page-images" component={AdminPageImages} />
          {/* Trips get the tabbed editor; /new still uses the plain create form,
              because there is nothing to configure until the trip exists. */}
          <Route path="/admin/tours/new" component={AdminForm} />
          <Route path="/admin/tours/:id/:tab" component={AdminTripEditor} />
          <Route path="/admin/tours/:id" component={AdminTripEditor} />
          <Route path="/admin/:resource/new" component={AdminForm} />
          <Route path="/admin/:resource/:id" component={AdminForm} />
          <Route path="/admin/:resource" component={AdminList} />
        </Switch>
      </Suspense>
    </AdminLayout>
  );
}

/**
 * The agent portal: its own routes, its own chrome, its own credentials.
 *
 * Rendered outside both the public layout and the admin layout so an agent can
 * never end up inside admin navigation, and so the two personas never share a
 * screen.
 */
function AgentRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/agent/login" component={AgentLogin} />
        <Route path="/agent/set-password" component={AgentSetPassword} />
        <Route path="/agent" component={AgentPortal} />
        <Route><AgentPortal /></Route>
      </Switch>
    </Suspense>
  );
}

function Router() {
  const [location] = useLocation();
  const isAdmin = location === "/admin" || location.startsWith("/admin/");
  const isAgent = location === "/agent" || location.startsWith("/agent/");
  // Login has no session yet, so it renders outside the admin chrome.
  const isAdminLogin = location === "/admin/login";

  return (
    <>
      <PageTracker />
      {isAdminLogin ? (
        <Suspense fallback={<PageFallback />}>
          <AdminLogin />
        </Suspense>
      ) : isAgent ? (
        <AgentRoutes />
      ) : isAdmin ? (
        <AdminRoutes />
      ) : (
        <PublicRoutes />
      )}
    </>
  );
}

function App() {
  // Load the saved colour theme + typography and apply them on first paint.
  useEffect(() => {
    fetchTheme().then(applyTheme);
    fetchTypography().then(applyTypography);
  }, []);

  // Image download protection on the public site: block right-click save and
  // drag-to-save on images. Admin pages are exempt (the gallery layout editor
  // and builder rely on dragging). Deterrent only — not DRM.
  useEffect(() => {
    const isAdmin = () => window.location.pathname.startsWith("/admin");
    const blockOnImages = (e: Event) => {
      if (!isAdmin() && (e.target as HTMLElement)?.tagName === "IMG") e.preventDefault();
    };
    document.addEventListener("contextmenu", blockOnImages);
    document.addEventListener("dragstart", blockOnImages);
    return () => {
      document.removeEventListener("contextmenu", blockOnImages);
      document.removeEventListener("dragstart", blockOnImages);
    };
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;

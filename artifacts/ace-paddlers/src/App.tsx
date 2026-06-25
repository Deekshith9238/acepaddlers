import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminList = lazy(() => import("@/pages/admin/AdminList"));
const AdminForm = lazy(() => import("@/pages/admin/AdminForm"));
const AdminBookings = lazy(() => import("@/pages/admin/AdminBookings"));
const AdminAvailability = lazy(() => import("@/pages/admin/AdminAvailability"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminGallery = lazy(() => import("@/pages/admin/AdminGallery"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#061218" }}>
      <div className="w-10 h-10 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tours" component={Tours} />
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
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/bookings" component={AdminBookings} />
        <Route path="/admin/availability" component={AdminAvailability} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/gallery" component={AdminGallery} />
        <Route path="/admin/:resource/new" component={AdminForm} />
        <Route path="/admin/:resource/:id" component={AdminForm} />
        <Route path="/admin/:resource" component={AdminList} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
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

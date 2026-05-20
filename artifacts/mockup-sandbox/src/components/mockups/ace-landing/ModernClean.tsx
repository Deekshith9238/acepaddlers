import React from "react";
import { ArrowRight, MapPin, Star, Phone, Mail, CheckCircle2, Waves, Tent, Home, Shield, Users, Award, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ModernClean() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');
        
        .font-display { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="h-8 w-8 text-blue-600" />
              <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Ace Paddlers
              </span>
            </div>
            
            <nav className="hidden space-x-8 md:flex">
              {['Tours', 'Homestays', 'Rafting', 'About', 'Contact'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="font-body text-sm font-medium text-slate-600 transition-colors hover:text-blue-600"
                >
                  {item}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-4 md:flex">
              <div className="flex flex-col text-right">
                <span className="font-body text-xs font-semibold text-slate-500 uppercase tracking-wider">Book Now</span>
                <a href="tel:+919480987672" className="font-display font-bold text-slate-900 hover:text-blue-600 transition-colors">
                  +91 9480987672
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/rafting-overhead.png" 
            alt="White water rafting" 
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
        </div>
        
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-4 inline-flex items-center rounded-full bg-white/20 px-4 py-1.5 font-body text-sm font-medium text-white backdrop-blur-md">
              <Star className="mr-2 h-4 w-4 text-yellow-400 fill-yellow-400" /> 
              South India's Pioneer in Adventure Tourism
            </span>
            <h1 className="mb-6 font-display text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Thrill & Safety in the <span className="text-blue-400">Western Ghats</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl font-body text-lg text-slate-200 sm:text-xl">
              Experience heart-racing white water rafting, serene eco homestays, and unforgettable camping under the stars in Karnataka.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" className="h-14 bg-blue-600 px-8 text-lg font-semibold hover:bg-blue-700">
                Explore Tours <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 border-white bg-white/10 px-8 text-lg font-semibold text-white backdrop-blur-md hover:bg-white hover:text-slate-900">
                View Homestays
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust/Stats Bar */}
      <section className="border-b border-slate-200 bg-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { icon: Award, label: "Experience", value: "20+ Years" },
              { icon: Users, label: "Happy Travelers", value: "87,000+" },
              { icon: Shield, label: "Certification", value: "NOLS Certified" },
              { icon: Globe, label: "Safety", value: "Intl. Standards" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <stat.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900">{stat.value}</h3>
                <p className="font-body text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Experiences */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Choose Your Adventure
            </h2>
            <p className="mt-4 font-body text-lg text-slate-600">
              From adrenaline-pumping rapids to peaceful forest retreats.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "River Rafting",
                price: "1,200",
                icon: Waves,
                desc: "Navigate the thrilling rapids of Bhadra and Barpole rivers with expert guides.",
                image: "/__mockup/images/rafting-overhead.png"
              },
              {
                title: "Eco Homestays",
                price: "1,500",
                icon: Home,
                desc: "Experience traditional hospitality and nature discovery in rural Karnataka.",
                image: "/__mockup/images/luxury-homestay.png"
              },
              {
                title: "Riverside Camping",
                price: "1,500",
                icon: Tent,
                desc: "Stargaze by the bonfire and wake up to breathtaking views of the landscape.",
                image: "/__mockup/images/western-ghats-sunset.png"
              }
            ].map((feature, i) => (
              <div key={i} className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-xl hover:shadow-blue-900/5 hover:ring-blue-100">
                <div className="relative h-64 overflow-hidden">
                  <img src={feature.image} alt={feature.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                  <div className="absolute bottom-6 left-6">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-display text-2xl font-bold text-white">{feature.title}</h3>
                  </div>
                </div>
                <div className="p-8">
                  <p className="mb-6 font-body text-slate-600">{feature.desc}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-body text-xs font-semibold uppercase tracking-wider text-slate-500">Starting From</p>
                      <p className="font-display text-2xl font-bold text-slate-900">₹{feature.price}</p>
                    </div>
                    <Button variant="ghost" className="rounded-full px-6 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                      Explore
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Tours Grid */}
      <section className="bg-slate-900 py-24 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Popular Tour Packages
              </h2>
              <p className="mt-4 font-body text-lg text-slate-400">
                Carefully crafted itineraries for the perfect getaway.
              </p>
            </div>
            <Button variant="outline" className="h-12 border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
              View All Packages
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Barpole Rafting", price: "1,200", duration: "1 Hour", loc: "South Coorg" },
              { name: "Bhadra Rafting", price: "1,200", duration: "1 Hour", loc: "Chikmagalur" },
              { name: "Camp Karle", price: "1,500", duration: "Overnight", loc: "Hassan" },
              { name: "Lake Lounge Homestay", price: "2,250", duration: "Overnight", loc: "Bekke Sodlur" },
              { name: "Misty Coorg Homestay", price: "1,750", duration: "Overnight", loc: "Badagarakeri" },
              { name: "Thithimathi Heritage Stay", price: "2,500", duration: "Overnight", loc: "Thithimathi" },
            ].map((tour, i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl bg-slate-800 p-1 transition-all hover:bg-slate-700">
                <div className="flex h-full flex-col justify-between rounded-xl bg-slate-900 p-6">
                  <div>
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center rounded-md bg-slate-800 px-2.5 py-1 font-body text-xs font-medium text-slate-300">
                        {tour.duration}
                      </span>
                      <span className="inline-flex items-center font-body text-xs font-medium text-slate-400">
                        <MapPin className="mr-1 h-3 w-3" /> {tour.loc}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold">{tour.name}</h3>
                  </div>
                  <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
                    <div>
                      <p className="font-body text-xs font-medium text-slate-400">Price per person</p>
                      <p className="font-display text-xl font-bold text-blue-400">₹{tour.price}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white transition-colors group-hover:bg-blue-600">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations / About */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <img src="/__mockup/images/western-ghats-sunset.png" alt="Western Ghats" className="rounded-3xl object-cover shadow-2xl" />
            </div>
            <div>
              <h2 className="mb-6 font-display text-4xl font-bold text-slate-900">
                Explore the Beauty of Karnataka
              </h2>
              <div className="space-y-8">
                <div>
                  <h3 className="mb-3 font-display text-2xl font-bold text-slate-900">Chikmagalur Adventure Packages</h3>
                  <p className="font-body leading-relaxed text-slate-600">
                    Discover magnificent hills, cascading waterfalls, and lush coffee plantations just five hours from Bangalore. Perfect for a weekend getaway featuring trekking through Mullayanagiri and rafting in the pristine rivers.
                  </p>
                </div>
                <div>
                  <h3 className="mb-3 font-display text-2xl font-bold text-slate-900">Coorg Adventure Packages</h3>
                  <p className="font-body leading-relaxed text-slate-600">
                    Known as the "adventure capital of Karnataka", Coorg offers diverse mountain topography and dense forests. Experience the thrill of river rafting and trekking in this beautiful Western Ghats destination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20 text-white">
        <div className="container mx-auto px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-6 font-display text-4xl font-bold sm:text-5xl">Ready for the Adrenaline Rush?</h2>
          <p className="mx-auto mb-10 max-w-2xl font-body text-xl text-blue-100">
            Book your next adventure with the pioneers of South Indian adventure tourism.
          </p>
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Button size="lg" className="h-16 rounded-full bg-white px-10 text-lg font-bold text-blue-600 hover:bg-slate-100">
              <Phone className="mr-3 h-6 w-6" /> +91 9480987672
            </Button>
            <Button size="lg" className="h-16 rounded-full bg-white px-10 text-lg font-bold text-blue-600 hover:bg-slate-100">
              <Phone className="mr-3 h-6 w-6" /> +91 6361956068
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-16 text-slate-400">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="mb-6 flex items-center gap-2 text-white">
                <Waves className="h-8 w-8 text-blue-500" />
                <span className="font-display text-2xl font-bold">Ace Paddlers</span>
              </div>
              <p className="mb-6 font-body text-sm leading-relaxed">
                Pioneers of adventure tourism in South India. Thrill and safety across the Western Ghats since 2004.
              </p>
            </div>
            <div>
              <h4 className="mb-6 font-display text-lg font-bold text-white">Quick Links</h4>
              <ul className="space-y-4 font-body text-sm">
                <li><a href="#" className="hover:text-blue-400">About Us</a></li>
                <li><a href="#" className="hover:text-blue-400">Contact Us</a></li>
                <li><a href="#" className="hover:text-blue-400">Cancellation Policy</a></li>
                <li><a href="#" className="hover:text-blue-400">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 font-display text-lg font-bold text-white">Popular Tours</h4>
              <ul className="space-y-4 font-body text-sm">
                <li><a href="#" className="hover:text-blue-400">Barpole Rafting</a></li>
                <li><a href="#" className="hover:text-blue-400">Bhadra Rafting & Camping</a></li>
                <li><a href="#" className="hover:text-blue-400">Lake Lounge Homestay</a></li>
                <li><a href="#" className="hover:text-blue-400">Camp Karle</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 font-display text-lg font-bold text-white">Contact</h4>
              <ul className="space-y-4 font-body text-sm">
                <li className="flex items-center gap-3"><Phone className="h-4 w-4" /> +91 9480987672</li>
                <li className="flex items-center gap-3"><Phone className="h-4 w-4" /> +91 6361956068</li>
                <li className="flex items-center gap-3"><Mail className="h-4 w-4" /> info@acepaddlers.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-16 flex flex-col items-center justify-between border-t border-slate-800 pt-8 font-body text-sm sm:flex-row">
            <p>© {new Date().getFullYear()} Ace Paddlers. All rights reserved.</p>
            <p className="mt-4 sm:mt-0">Built with passion for adventure.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

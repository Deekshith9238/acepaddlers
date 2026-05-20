import React from 'react';
import { ArrowRight, CheckCircle2, MapPin, Phone, Mail, Instagram, Facebook, Twitter } from 'lucide-react';

export function BoldAdventure() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/__mockup/images/rafting-hero.png" 
            alt="White water rafting" 
            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center mt-20">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter mb-6 text-white drop-shadow-2xl">
            Conquer the <span className="text-orange-500">Rapids</span>
          </h1>
          <p className="font-body text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto mb-10 font-medium">
            Raw, intense, and adrenaline-charged. Experience the wildest white-water river rafting in the Western Ghats.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="bg-orange-600 hover:bg-orange-500 text-white font-display font-bold uppercase tracking-wider text-lg px-8 py-4 rounded-none transition-all flex items-center gap-2 w-full sm:w-auto border border-orange-600">
              Book Your Thrill <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-transparent hover:bg-white/10 text-white font-display font-bold uppercase tracking-wider text-lg px-8 py-4 rounded-none transition-all border border-zinc-700 w-full sm:w-auto">
              Explore Tours
            </button>
          </div>
        </div>
      </section>

      {/* Featured Experiences */}
      <section className="py-24 bg-zinc-900 border-y border-zinc-800 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tight text-white mb-4">
              Choose Your <span className="text-orange-500">Battle</span>
            </h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Rafting */}
            <div className="group relative bg-zinc-950 overflow-hidden border border-zinc-800 hover:border-orange-500/50 transition-colors">
              <div className="h-64 overflow-hidden">
                <img src="/__mockup/images/ghats-valley.png" alt="River Rafting" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-8">
                <h3 className="font-display text-2xl font-bold uppercase mb-2">River Rafting</h3>
                <p className="text-orange-500 font-display text-xl mb-4">From ₹1,200</p>
                <p className="text-zinc-400 font-body mb-6">Navigate the aggressive rapids of Bhadra and Barapole rivers. Not for the faint-hearted.</p>
                <button className="text-white font-display font-bold uppercase tracking-wider flex items-center gap-2 group-hover:text-orange-400 transition-colors">
                  View Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Homestays */}
            <div className="group relative bg-zinc-950 overflow-hidden border border-zinc-800 hover:border-orange-500/50 transition-colors">
              <div className="h-64 overflow-hidden">
                <img src="/__mockup/images/forest-homestay.png" alt="Eco Homestays" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-8">
                <h3 className="font-display text-2xl font-bold uppercase mb-2">Eco Homestays</h3>
                <p className="text-orange-500 font-display text-xl mb-4">From ₹1,500</p>
                <p className="text-zinc-400 font-body mb-6">Recover in raw nature. Traditional rural Karnataka eco-friendly stays hidden in the jungle.</p>
                <button className="text-white font-display font-bold uppercase tracking-wider flex items-center gap-2 group-hover:text-orange-400 transition-colors">
                  View Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Camping */}
            <div className="group relative bg-zinc-950 overflow-hidden border border-zinc-800 hover:border-orange-500/50 transition-colors">
              <div className="h-64 overflow-hidden">
                <img src="/__mockup/images/camp-karle.png" alt="Wild Camping" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-8">
                <h3 className="font-display text-2xl font-bold uppercase mb-2">Wild Camping</h3>
                <p className="text-orange-500 font-display text-xl mb-4">From ₹1,500</p>
                <p className="text-zinc-400 font-body mb-6">Sleep under a ruthless sky. Riverside camping with bonfires and absolute isolation.</p>
                <button className="text-white font-display font-bold uppercase tracking-wider flex items-center gap-2 group-hover:text-orange-400 transition-colors">
                  View Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Ace Paddlers */}
      <section className="py-24 bg-zinc-950">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <h2 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tight text-white mb-6">
                Pioneers of <span className="text-orange-500">Danger</span>
              </h2>
              <p className="text-zinc-300 font-body text-lg mb-8 leading-relaxed">
                Anything that gets your heart racing is worth doing. Will it be easy? Nope. Worth it? Absolutely. We are the flag bearers of adventure tourism in South India. Your safety is our obsession.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  "20+ Years Experience",
                  "87,000+ Thrill Seekers",
                  "NOLS Certified Instructors",
                  "Intl. Safety Standards",
                  "Zero Accident History",
                  "Rescue 3 Certified"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0" />
                    <span className="font-display uppercase tracking-wide text-zinc-100">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:w-1/2 relative">
              <div className="absolute inset-0 bg-orange-500 blur-3xl opacity-20" />
              <img src="/__mockup/images/rafting-hero.png" alt="Safety First" className="relative z-10 w-full aspect-square object-cover grayscale border-4 border-zinc-800" />
              <div className="absolute -bottom-8 -left-8 bg-zinc-900 border border-zinc-700 p-8 z-20 hidden md:block">
                <p className="font-display text-5xl text-orange-500 font-bold mb-2">100%</p>
                <p className="font-display uppercase text-zinc-400 tracking-wider">Safety Record</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Tours */}
      <section className="py-24 bg-zinc-900 border-t border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tight text-white mb-4">
                Popular <span className="text-orange-500">Missions</span>
              </h2>
              <div className="w-24 h-1 bg-orange-500" />
            </div>
            <button className="text-white font-display font-bold uppercase tracking-wider flex items-center gap-2 hover:text-orange-400 transition-colors">
              View All Tours <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Barpole Rafting", price: "₹1,200", location: "South Coorg", type: "1 Hour" },
              { title: "Bhadra Rafting", price: "₹1,200", location: "Chikmagalur", type: "1 Hour" },
              { title: "Camp Karle", price: "₹1,500", location: "Hassan", type: "Overnight" },
              { title: "Lake Lounge Homestay", price: "₹2,250", location: "Bekke Sodlur", type: "Overnight" },
              { title: "Misty Coorg Homestay", price: "₹1,750", location: "Badagarakeri", type: "Overnight" }
            ].map((tour, i) => (
              <div key={i} className="bg-zinc-950 border border-zinc-800 p-6 hover:border-orange-500 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-display text-xl font-bold uppercase text-white mb-1">{tour.title}</h3>
                    <div className="flex items-center gap-2 text-zinc-500 text-sm font-body">
                      <MapPin className="w-4 h-4" /> {tour.location}
                    </div>
                  </div>
                  <span className="bg-orange-600/10 text-orange-500 text-xs font-display uppercase tracking-wider px-2 py-1 border border-orange-500/20">
                    {tour.type}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
                  <div className="font-display text-2xl font-bold text-white">
                    {tour.price}
                  </div>
                  <button className="w-10 h-10 bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:bg-orange-600 group-hover:border-orange-500 group-hover:text-white transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Contact */}
      <section className="py-24 bg-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-multiply" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tight text-white mb-8">
            Ready for the Drop?
          </h2>
          <p className="font-body text-xl text-orange-100 mb-12 max-w-2xl mx-auto">
            Spots fill up fast. Lock in your adventure now or talk to our experts to plan your mission.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <button className="bg-zinc-950 hover:bg-black text-white font-display font-bold uppercase tracking-wider text-lg px-10 py-5 w-full sm:w-auto transition-colors shadow-2xl">
              Book Instantly
            </button>
            <div className="flex items-center gap-4 bg-orange-700/50 px-8 py-5 border border-orange-500">
              <Phone className="w-6 h-6 text-white" />
              <div className="text-left font-display">
                <div className="text-orange-200 text-sm uppercase tracking-widest">Call Basecamp</div>
                <div className="text-white text-xl font-bold">+91 94809 87672</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 pt-20 pb-10 border-t border-zinc-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <h3 className="font-display text-3xl font-bold uppercase text-white mb-6 tracking-tight">
                ACE <span className="text-orange-500">PADDLERS</span>
              </h3>
              <p className="text-zinc-400 font-body mb-8 max-w-sm leading-relaxed">
                The pioneers of white water rafting and extreme adventure in South India since 2006. NOLS certified.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-orange-500 transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-orange-500 transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-orange-500 transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-display text-lg font-bold uppercase text-white mb-6">Explore</h4>
              <ul className="space-y-4 font-body text-zinc-400">
                <li><a href="#" className="hover:text-orange-500 transition-colors">Adventure Tours</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">White Water Rafting</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Eco Homestays</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Camping</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-display text-lg font-bold uppercase text-white mb-6">Contact</h4>
              <ul className="space-y-4 font-body text-zinc-400">
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-orange-500" />
                  +91 94809 87672
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-orange-500" />
                  +91 63619 56068
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-orange-500" />
                  info@acepaddlers.com
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-body text-zinc-600">
            <div>© {new Date().getFullYear()} Ace Paddlers. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-zinc-300 transition-colors">Cancellation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';
import { Phone, MapPin, Anchor, Tent, Home, ArrowRight, ShieldCheck, Clock, Users, Star, Mountain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NaturalEarthy() {
  return (
    <div className="min-h-screen bg-[#f8f5f0] text-[#2c3325] font-sans selection:bg-[#4a5e3f] selection:text-white">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        .font-serif { font-family: 'Fraunces', serif; }
        .font-sans { font-family: 'DM Sans', sans-serif; }
      `}} />

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-6 text-white flex justify-between items-center">
        <div className="font-serif text-2xl font-bold tracking-tight">Ace Paddlers</div>
        <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
          <a href="#experiences" className="hover:text-amber-200 transition-colors">Experiences</a>
          <a href="#about" className="hover:text-amber-200 transition-colors">Who We Are</a>
          <a href="#tours" className="hover:text-amber-200 transition-colors">Tours</a>
          <a href="#destinations" className="hover:text-amber-200 transition-colors">Destinations</a>
        </div>
        <Button className="bg-[#b34d35] hover:bg-[#8c3b28] text-white rounded-full px-6 py-2 h-auto text-sm font-semibold border-none">
          Book Now
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-12 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/hero-river.png" 
            alt="Serene jungle river in Western Ghats" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f8f5f0] via-transparent to-transparent opacity-90 h-32 bottom-0 top-auto" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white mt-16">
          <span className="uppercase tracking-[0.2em] text-amber-200 text-sm font-bold mb-6 block">Western Ghats, Karnataka</span>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium leading-[1.1] mb-8 text-shadow-sm">
            Find Your <br/><span className="italic text-amber-100">Flow.</span>
          </h1>
          <p className="text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto text-stone-100 leading-relaxed">
            Experience the raw beauty of the Western Ghats with the pioneers of South Indian adventure tourism. River rafting, wild camping, and eco-homestays that reconnect you with nature.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-[#b34d35] hover:bg-[#8c3b28] text-white rounded-full px-8 py-6 text-lg font-medium border-none shadow-lg transition-transform hover:-translate-y-1">
              Start Exploring
            </Button>
            <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-full px-8 py-6 text-lg font-medium backdrop-blur-sm transition-transform hover:-translate-y-1">
              Call Local Guide
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Experiences */}
      <section id="experiences" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-[#3d4a31] mb-4">Our Core Experiences</h2>
          <div className="w-16 h-1 bg-[#b34d35] mx-auto rounded-full mb-6"></div>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg">Whether you seek the rush of rapids or the quiet of a misty morning, we have a path for you.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "White Water Rafting",
              price: "₹1,200",
              desc: "Navigate the thrilling rapids of Barpole and Bhadra rivers under expert guidance.",
              icon: <Anchor className="w-6 h-6" />,
              img: "/__mockup/images/rafting.png"
            },
            {
              title: "Eco Homestays",
              price: "₹1,500",
              desc: "Traditional Karnataka hospitality surrounded by pristine coffee plantations.",
              icon: <Home className="w-6 h-6" />,
              img: "/__mockup/images/homestay.png"
            },
            {
              title: "Wilderness Camping",
              price: "₹1,500",
              desc: "Sleep under the stars by the riverbank with bonfires and starry skies.",
              icon: <Tent className="w-6 h-6" />,
              img: "/__mockup/images/camping.png"
            }
          ].map((exp, i) => (
            <div key={i} className="group cursor-pointer rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 flex flex-col">
              <div className="relative h-64 overflow-hidden">
                <img src={exp.img} alt={exp.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-[#3d4a31]">
                  From {exp.price}
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <div className="text-[#b34d35] mb-4 bg-orange-50 w-12 h-12 rounded-full flex items-center justify-center">
                  {exp.icon}
                </div>
                <h3 className="font-serif text-2xl text-[#2c3325] mb-3">{exp.title}</h3>
                <p className="text-stone-600 mb-6 flex-1 leading-relaxed">{exp.desc}</p>
                <div className="flex items-center text-[#4a5e3f] font-semibold group-hover:text-[#b34d35] transition-colors mt-auto">
                  <span>Discover more</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Storytelling / Who We Are */}
      <section id="about" className="py-24 bg-[#eae4d8]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-[#b34d35]/10 rounded-3xl transform rotate-2"></div>
            <img src="/__mockup/images/hero-river.png" alt="Guide team" className="rounded-2xl shadow-xl relative z-10 aspect-[4/5] object-cover" />
            
            <div className="absolute -bottom-8 -right-8 bg-white p-6 rounded-2xl shadow-lg z-20 max-w-xs border border-stone-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-[#4a5e3f] text-white p-3 rounded-full">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-2xl text-[#2c3325]">20+ Years</div>
                  <div className="text-sm text-stone-500 uppercase tracking-wide">Experience</div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <span className="uppercase tracking-widest text-[#b34d35] text-sm font-bold mb-4 block">Our Heritage</span>
            <h2 className="font-serif text-4xl md:text-5xl text-[#2c3325] mb-8 leading-tight">
              Pioneers of the <span className="text-[#4a5e3f] italic">South Indian</span> Adventure
            </h2>
            <p className="text-lg text-stone-600 mb-6 leading-relaxed">
              Anything that gets your heart racing is worth doing. With this belief, Ace Paddlers started water sports, camping and trekking across India. In over two decades, we have hosted more than 87,000 travelers and adventure seekers.
            </p>
            <p className="text-lg text-stone-600 mb-10 leading-relaxed">
              Your safety is our sanctuary. Our instructors are NOLS certified, Wilderness First Responders, and CPR & Rescue 3 certified swift-water rescue professionals. We hold an exceptionally high safety track record with zero accident history.
            </p>
            
            <div className="grid grid-cols-2 gap-6 mb-10">
              {[
                { label: "Happy Travelers", value: "87,000+", icon: <Users className="w-5 h-5" /> },
                { label: "NOLS Certified", value: "Yes", icon: <Star className="w-5 h-5" /> },
                { label: "First Responders", value: "Certified", icon: <ShieldCheck className="w-5 h-5" /> },
                { label: "Safety Record", value: "100%", icon: <Anchor className="w-5 h-5" /> }
              ].map((stat, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="text-[#b34d35] mt-1">{stat.icon}</div>
                  <div>
                    <div className="font-bold text-lg text-[#2c3325]">{stat.value}</div>
                    <div className="text-sm text-stone-500">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button className="bg-[#4a5e3f] hover:bg-[#34422c] text-white rounded-full px-8 py-6 text-lg">
              Read Our Full Story
            </Button>
          </div>
        </div>
      </section>

      {/* Popular Tours */}
      <section id="tours" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <span className="uppercase tracking-widest text-[#b34d35] text-sm font-bold mb-4 block">Curated Journeys</span>
            <h2 className="font-serif text-4xl md:text-5xl text-[#2c3325]">Most Beloved <span className="italic text-[#4a5e3f]">Tours</span></h2>
          </div>
          <Button variant="outline" className="border-[#4a5e3f] text-[#4a5e3f] hover:bg-[#4a5e3f] hover:text-white rounded-full px-6 whitespace-nowrap">
            View All Tours
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Barpole Rafting", price: "₹1,200", duration: "1 Hour", loc: "T. Shettigeri", type: "Rafting" },
            { title: "Bhadra Rafting", price: "₹1,200", duration: "1 Hour", loc: "Chikmagalur", type: "Rafting" },
            { title: "Camp Karle", price: "₹1,500", duration: "Overnight", loc: "Hassan", type: "Camping" },
            { title: "Lake Lounge Homestay", price: "₹2,250", duration: "Overnight", loc: "Bekke Sodlur", type: "Homestay" },
            { title: "Misty Coorg Homestay", price: "₹1,750", duration: "Overnight", loc: "Badagarakeri", type: "Homestay" },
            { title: "Thithimathi Heritage Stay", price: "₹2,500", duration: "Overnight", loc: "Thithimathi", type: "Homestay" }
          ].map((tour, i) => (
            <Card key={i} className="border-stone-200 bg-white hover:border-[#4a5e3f]/30 hover:shadow-lg transition-all overflow-hidden rounded-xl group cursor-pointer">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#b34d35] bg-orange-50 px-3 py-1 rounded-full">{tour.type}</span>
                    <span className="font-serif text-xl text-[#2c3325]">{tour.price}</span>
                  </div>
                  <h3 className="font-serif text-xl font-medium mb-3 text-[#2c3325] group-hover:text-[#4a5e3f] transition-colors">{tour.title}</h3>
                  <div className="space-y-2 text-sm text-stone-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> {tour.duration}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> {tour.loc}
                    </div>
                  </div>
                </div>
                <div className="border-t border-stone-100 p-4 bg-stone-50/50 flex justify-center text-[#4a5e3f] text-sm font-semibold group-hover:bg-[#4a5e3f] group-hover:text-white transition-colors">
                  View Details
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section id="destinations" className="py-24 bg-[#3d4a31] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl mb-6">Explore the <span className="italic text-amber-200">Western Ghats</span></h2>
            <p className="text-[#a0b094] max-w-2xl mx-auto text-lg">Two breathtaking regions, countless hidden trails and flowing rivers.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative rounded-2xl overflow-hidden group cursor-pointer h-96">
              <img src="/__mockup/images/homestay.png" alt="Coorg" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex items-center gap-2 text-amber-200 mb-2">
                  <Mountain className="w-5 h-5" />
                  <span className="uppercase tracking-widest text-sm font-bold">Destination</span>
                </div>
                <h3 className="font-serif text-3xl mb-3">Coorg Packages</h3>
                <p className="text-stone-300 text-sm mb-4 line-clamp-2">Also known as the adventure capital of Karnataka. Dense forests, coffee plantations, and the exhilarating Barpole river.</p>
                <Button variant="link" className="text-white p-0 hover:text-amber-200">Explore Coorg <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden group cursor-pointer h-96">
              <img src="/__mockup/images/rafting.png" alt="Chikmagalur" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex items-center gap-2 text-amber-200 mb-2">
                  <Mountain className="w-5 h-5" />
                  <span className="uppercase tracking-widest text-sm font-bold">Destination</span>
                </div>
                <h3 className="font-serif text-3xl mb-3">Chikmagalur Packages</h3>
                <p className="text-stone-300 text-sm mb-4 line-clamp-2">Magnificent hills, cascading waterfalls, and organic farms. Trek through Mullayanagiri and raft the rapids of Bhadra.</p>
                <Button variant="link" className="text-white p-0 hover:text-amber-200">Explore Chikmagalur <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <footer className="bg-[#1f2618] text-stone-300 pt-24 pb-12 border-t border-[#2c3325]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 lg:col-span-2">
              <div className="font-serif text-3xl font-bold text-white mb-6">Ace Paddlers</div>
              <p className="mb-8 max-w-sm text-stone-400">
                The pioneers of South Indian adventure tourism. Curating unforgettable rafting, camping, and homestay experiences since two decades.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#b34d35]" />
                  <a href="tel:+919480987672" className="hover:text-white transition-colors">+91 9480987672</a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#b34d35]" />
                  <a href="tel:+916361956068" className="hover:text-white transition-colors">+91 6361956068</a>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cancellation Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Top Tours</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Barpole Rafting</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Camp Karle</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Lake Lounge Homestay</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bhadra Rafting</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-stone-500">
            <div>© 2026, Ace Paddlers. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white">Instagram</a>
              <a href="#" className="hover:text-white">Facebook</a>
              <a href="#" className="hover:text-white">TripAdvisor</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Link } from "wouter";
import { ArrowRight, Clock, Tag } from "lucide-react";
import Layout from "@/components/Layout";
import Animate from "@/components/Animate";
import PageMeta from "@/components/PageMeta";
import { C } from "@/data/constants";
import BLOG_POSTS from "@/data/blog";

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Ace Paddlers Blog — White Water Rafting & Adventure in Coorg",
  description: "Guides, tips, and river knowledge from Ace Paddlers — South India's most experienced white water rafting operator.",
  url: "https://acepaddlers.com/blog",
};

export default function Blog() {
  return (
    <Layout>
      <PageMeta
        title="Blog | White Water Rafting Guides & Tips | Ace Paddlers"
        description="Expert guides on white water rafting in Coorg, best seasons, river comparisons, safety certifications, and packing lists from Ace Paddlers — 20+ years on the Barapole & Bhadra rivers."
        url="/blog"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="pt-40 pb-16 px-6 text-center" style={{ backgroundColor: C.deepOcean }}>
        <Animate immediate variant="up">
          <span className="uppercase tracking-widest text-xs font-bold mb-4 block" style={{ color: C.lightTeal }}>
            From the River
          </span>
          <h1 className="text-5xl md:text-6xl text-white mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
            The Ace Paddlers{" "}
            <span className="italic" style={{ color: C.lightTeal }}>Blog</span>
          </h1>
          <p className="max-w-2xl mx-auto text-white/70 text-lg">
            River guides, seasonal advice, safety deep-dives, and travel tips from 20+ years on the Barapole and Bhadra.
          </p>
        </Animate>
      </section>

      {/* Posts grid */}
      <section className="py-20 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post, i) => (
              <Animate key={post.slug} variant="up" delay={i * 80}>
                <Link href={`/blog/${post.slug}`}
                  className="group block rounded-2xl overflow-hidden bg-white border no-underline transition-all duration-300 hover:-translate-y-1 h-full flex flex-col"
                  style={{ borderColor: C.mutedBorder, boxShadow: "0 2px 8px rgba(13,45,64,0.07)" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(13,58,94,0.14)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(13,45,64,0.07)")}>
                  <div className="relative h-48 overflow-hidden">
                    <img src={post.coverImg} alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,24,32,0.55) 0%, transparent 60%)" }} />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(6,24,32,0.72)", color: "#a8dff0" }}>
                      {post.category}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: "#8aabb8" }}>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.readTime}</span>
                      <span>{post.date}</span>
                    </div>
                    <h2 className="text-lg font-semibold mb-3 leading-snug flex-1"
                      style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                      {post.title}
                    </h2>
                    <p className="text-sm mb-4 leading-relaxed" style={{ color: "#5a8ea8" }}>{post.excerpt}</p>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.riverTeal }}>
                      Read More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </Animate>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

import { Link, useParams } from "wouter";
import { ArrowLeft, Clock, Calendar, Tag } from "lucide-react";
import Layout from "@/components/Layout";
import Animate from "@/components/Animate";
import PageMeta from "@/components/PageMeta";
import { C } from "@/data/constants";
import BLOG_POSTS from "@/data/blog";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-20">
          <h1 className="text-4xl" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>Post Not Found</h1>
          <Link href="/blog" className="no-underline" style={{ color: C.riverTeal }}>← Back to Blog</Link>
        </div>
      </Layout>
    );
  }

  const otherPosts = BLOG_POSTS.filter(p => p.slug !== slug).slice(0, 3);

  return (
    <Layout>
      <PageMeta
        title={post.metaTitle}
        description={post.metaDesc}
        url={`/blog/${post.slug}`}
        image={post.coverImg}
      />

      {/* Hero */}
      <section className="relative pt-32 pb-16 flex items-end overflow-hidden min-h-[380px]">
        <img src={post.coverImg} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,24,32,0.92) 0%, rgba(6,24,32,0.45) 60%, transparent 100%)" }} />
        <Animate immediate variant="up" className="relative z-10 max-w-4xl mx-auto px-6 pb-8 w-full text-white">
          <Link href="/blog"
            className="inline-flex items-center gap-2 text-sm mb-6 no-underline hover:text-cyan-300 transition-colors"
            style={{ color: "rgba(168,223,240,0.80)" }}>
            <ArrowLeft className="w-4 h-4" /> All Posts
          </Link>
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(26,127,166,0.50)", color: "#a8dff0" }}>
              {post.category}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-medium mb-4 leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm" style={{ color: "rgba(168,223,240,0.70)" }}>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {post.readTime}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {post.date}</span>
          </div>
        </Animate>
      </section>

      {/* Content */}
      <section className="py-16 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2">
              <Animate variant="up">
                <p className="text-xl leading-relaxed mb-10 font-medium" style={{ color: "#2e5a74" }}>
                  {post.excerpt}
                </p>
              </Animate>

              {post.sections.map((section, i) => (
                <Animate key={i} variant="up" delay={i * 60}>
                  <div className="mb-10">
                    {section.heading && (
                      <h2 className="text-2xl mb-4" style={{ fontFamily: "'Fraunces', serif", color: C.text }}>
                        {section.heading}
                      </h2>
                    )}
                    <div className="space-y-4">
                      {section.body.split("\n\n").map((para, pi) => (
                        <p key={pi} className="leading-relaxed" style={{ color: "#2e5a74", whiteSpace: "pre-line" }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                </Animate>
              ))}

              {/* CTA */}
              <Animate variant="up">
                <div className="mt-12 p-8 rounded-2xl text-center" style={{ backgroundColor: C.deepOcean }}>
                  <h3 className="text-2xl text-white mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
                    Ready to experience it yourself?
                  </h3>
                  <p className="text-white/70 mb-6">Book with South India's most experienced white water rafting team.</p>
                  <a href="tel:+919480987672"
                    className="inline-block rounded-full px-8 py-3 font-semibold no-underline"
                    style={{ backgroundColor: C.riverTeal, color: "white" }}>
                    Call +91 94809 87672
                  </a>
                </div>
              </Animate>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Animate variant="right">
                <div className="sticky top-28 space-y-6">
                  <div className="rounded-2xl p-6 border" style={{ borderColor: C.mutedBorder, backgroundColor: C.muted }}>
                    <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: "#5a8ea8" }}>Quick Info</h4>
                    <div className="space-y-3 text-sm" style={{ color: "#2e5a74" }}>
                      <div><strong>Rafting from:</strong> ₹1,200/person</div>
                      <div><strong>Season:</strong> June – October</div>
                      <div><strong>River:</strong> Barapole, Grade III–IV</div>
                      <div><strong>Duration:</strong> ~1 hour on water</div>
                    </div>
                    <a href="tel:+919480987672"
                      className="mt-5 flex items-center justify-center rounded-full py-3 text-sm font-semibold no-underline text-white"
                      style={{ backgroundColor: C.riverTeal }}>
                      Book Now
                    </a>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: "#5a8ea8" }}>More Posts</h4>
                    <div className="space-y-3">
                      {otherPosts.map(p => (
                        <Link key={p.slug} href={`/blog/${p.slug}`}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-white transition-colors no-underline group"
                          style={{ color: C.text }}>
                          <img src={p.coverImg} alt={p.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium leading-snug line-clamp-2" style={{ color: C.text }}>{p.title}</div>
                            <div className="text-xs mt-1" style={{ color: "#8aabb8" }}>{p.readTime}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </Animate>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

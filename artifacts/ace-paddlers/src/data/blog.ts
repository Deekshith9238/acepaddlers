/**
 * Shape of a blog post as the marketing pages consume it.
 *
 * Posts come from the database via `/api/blog`; the seed articles that used to
 * live here were dead weight carrying their own hardcoded images.
 */
export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDesc: string;
  category: string;
  readTime: string;
  date: string;
  coverImg: string;
  excerpt: string;
  sections: BlogSection[];
}

export interface BlogSection {
  heading?: string;
  body: string;
}

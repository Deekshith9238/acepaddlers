import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  /** Keeps a page out of search results — for anything with no durable
   *  content of its own, like a search results page. */
  noindex?: boolean;
}

/**
 * Title, description, canonical and share tags, set again in the browser as
 * pages change. Structured data (JSON-LD) is not set here: the server puts the
 * full schema graph into every page's HTML (api-server/src/lib/seo.ts), and a
 * second copy from the browser would duplicate it.
 */
export default function PageMeta({ title, description, image, url, noindex }: PageMetaProps) {
  // www is the real address; the bare domain only redirects to it.
  const siteUrl = "https://www.acepaddlers.com";
  const canonical = url ? `${siteUrl}${url}` : siteUrl;
  const ogImage = new URL(image || "/opengraph.jpg", siteUrl).href;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Ace Paddlers" />
      <meta property="og:locale" content="en_IN" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={title} />
    </Helmet>
  );
}

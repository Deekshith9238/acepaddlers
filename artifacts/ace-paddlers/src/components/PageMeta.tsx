import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description: string;
  schema?: object;
  image?: string;
  url?: string;
}

export default function PageMeta({ title, description, schema, image, url }: PageMetaProps) {
  const siteUrl = "https://acepaddlers.com";
  const canonical = url ? `${siteUrl}${url}` : siteUrl;
  const ogImage = image || `${siteUrl}/images/rafting-hero.png`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
}

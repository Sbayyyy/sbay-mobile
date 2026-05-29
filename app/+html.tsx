import { ScrollViewStyleReset } from "expo-router/html";
import { type ReactNode } from "react";

const siteDescription =
  "سباي هو سوق سوريا المحلي لبيع وشراء السيارات، العقارات، الإلكترونيات، الأثاث، الأزياء والإعلانات القريبة مع محادثة آمنة بين المشترين والبائعين.";
const siteUrl = "https://syrian-bay.com";
const siteTitle = "سباي | سوق سوريا للإعلانات والبيع والشراء";
const logoUrl = `${siteUrl}/assets/sbaylogo2.png`;
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "SBay",
      alternateName: ["سباي", "Syrian Bay"],
      url: siteUrl,
      logo: logoUrl,
      areaServed: {
        "@type": "Country",
        name: "سوريا",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "SBay",
      alternateName: "سباي",
      description: siteDescription,
      url: siteUrl,
      inLanguage: ["ar-SY", "en"],
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/browse?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta name="robots" content="index,follow" />
        <meta
          name="keywords"
          content="سباي, سوق سوريا, إعلانات سوريا, بيع وشراء في سوريا, سيارات سوريا, عقارات سوريا, إلكترونيات سوريا, SBay, Syrian marketplace"
        />
        <meta name="application-name" content="SBay" />
        <link rel="canonical" href={siteUrl} />
        <link rel="alternate" hrefLang="ar" href={siteUrl} />
        <link rel="alternate" hrefLang="en" href={`${siteUrl}/en`} />
        <link rel="alternate" hrefLang="x-default" href={siteUrl} />
        <meta property="og:site_name" content="SBay" />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:locale" content="ar_SY" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:image" content={logoUrl} />
        <meta property="og:image:alt" content="شعار سباي" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={siteDescription} />
        <meta name="twitter:image" content={logoUrl} />
        <meta name="twitter:image:alt" content="SBay logo" />
        <meta name="theme-color" content="#2563eb" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

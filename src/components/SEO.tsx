import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  type?: "website" | "article" | "product";
  image?: string;
}

export const SEO = ({ title, description, canonical, type = "website", image }: SEOProps) => {
  useEffect(() => {
    // Title
    if (title) document.title = title.slice(0, 60);

    // Meta description
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    if (description) setMeta("description", description.slice(0, 160));

    // Canonical
    const canonicalHref = canonical || window.location.href;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonicalHref);

    // Open Graph
    const setOG = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setOG("og:title", title.slice(0, 60));
    if (description) setOG("og:description", description.slice(0, 160));
    setOG("og:type", type);
    setOG("og:url", canonicalHref);
    if (image) setOG("og:image", image);
  }, [title, description, canonical, type, image]);

  return null;
};

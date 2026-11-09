import { useEffect } from "react";

type Meta = { title: string; description?: string; image?: string; path?: string; jsonLd?: object };

function setTag(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = document.createElement(selector.startsWith("link") ? "link" : "meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

/** Unique title, description, canonical URL, social tags and structured data per page. */
export function usePageMeta({ title, description, image, path, jsonLd }: Meta) {
  useEffect(() => {
    document.title = `${title} | InterPay`;
    const desc = description ?? "Buy event tickets with protected payments on InterPay.";
    const url = location.origin + (path ?? location.pathname);
    setTag('meta[name="description"]', { name: "description", content: desc });
    setTag('link[rel="canonical"]', { rel: "canonical", href: url });
    setTag('meta[property="og:title"]', { property: "og:title", content: title });
    setTag('meta[property="og:description"]', { property: "og:description", content: desc });
    setTag('meta[property="og:url"]', { property: "og:url", content: url });
    setTag('meta[property="og:type"]', { property: "og:type", content: "website" });
    if (image) {
      setTag('meta[property="og:image"]', { property: "og:image", content: image });
      setTag('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    }
    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      script?.remove();
      document.head.querySelector('meta[property="og:image"]')?.remove();
    };
  }, [title, description, image, path, JSON.stringify(jsonLd)]);
}

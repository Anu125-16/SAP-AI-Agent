import type { MetadataRoute } from "next";

/*
==================================================
HOW TO USE THIS FILE
==================================================

1. Is file ko save karo yahan: app/sitemap.ts
   (seedha 'app' folder ke andar, kisi sub-folder mein nahi)

2. Jab bhi aap koi NAYA page/route add karo (jaise /about,
   /pricing, waghera), uska entry neeche 'routes' array mein
   add kar dena - warna Google use discover nahi karega.

3. Deploy hone ke baad ye khud-ba-khud yahan available hoga:
   https://sap-ai-agent.vercel.app/sitemap.xml
*/

const BASE_URL = "https://sap-ai-agent.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/Agent",
    "/About",
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));
}
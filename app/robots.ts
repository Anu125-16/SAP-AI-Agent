import type { MetadataRoute } from "next";

/*
==================================================
HOW TO USE THIS FILE
==================================================

Is file ko save karo yahan: app/robots.ts
(seedha 'app' folder ke andar)

Deploy hone ke baad ye khud-ba-khud yahan available hoga:
https://sap-ai-agent.vercel.app/robots.txt
*/

const BASE_URL = "https://sap-ai-agent.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
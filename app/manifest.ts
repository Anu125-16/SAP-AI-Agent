import type { MetadataRoute } from "next";

/*
==================================================
HOW TO USE THIS FILE
==================================================

1. Is file ko save karo yahan: app/manifest.ts
   (seedha 'app' folder ke andar)

2. Do image files (icon-192.png aur icon-512.png) ko
   public/icons/ folder ke andar daalo (main separately
   de raha hoon).

3. layout.tsx mein bhi ek chhoti si line add karni hogi
   (neeche instructions dekho).

Ye Next.js ko batata hai ki jab koi phone se 'Add to Home
Screen' kare, to app ka naam, icon, aur colors kya hon.
*/

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ERP Tutor AI - Learn SAP Free",
    short_name: "ERP Tutor AI",
    description:
      "Free AI-powered SAP tutor. Learn SAP MM, FICO, SD, ABAP and more with step-by-step answers and real SAP screenshots.",
    start_url: "/Agent",
    display: "standalone",
    background_color: "#050816",
    theme_color: "#050816",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
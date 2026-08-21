import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

/*
==================================================
SEO METADATA
==================================================
Ye wahi info hai jo Google search results mein
dikhti hai (title + description), aur jo Google ko
batati hai aapki site kis baare mein hai.

Jab koi "learn SAP", "SAP tutor", "SAP learning"
jaisa kuch search karega, ye keywords match karne
mein madad karte hain (though ranking mein content
quality aur backlinks bhi zaroori hain, sirf
metadata se guarantee nahi hoti).
*/

export const metadata: Metadata = {
  title: "HireSAP AI - Learn SAP Free | SAP Tutor & Step-by-Step Guide",
  description:
    "Free AI-powered SAP tutor. Learn SAP MM, FICO, SD, ABAP and more with step-by-step answers and real SAP screenshots. Perfect for SAP learners preparing for interviews or jobs.",
  keywords: [
    "learn SAP",
    "SAP tutor",
    "SAP learning",
    "SAP training",
    "SAP MM tutorial",
    "SAP FICO tutorial",
    "SAP for beginners",
    "SAP interview questions",
    "SAP AI assistant",
  ],
  openGraph: {
    title: "HireSAP AI - Learn SAP Free with an AI Tutor",
    description:
      "Ask any SAP question and get step-by-step answers with real screenshots. Covers MM, FICO, SD, ABAP, and more.",
    url: "https://sap-ai-agent.vercel.app",
    siteName: "HireSAP AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">
        {children}

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-M5VM621LKS"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-M5VM621LKS');
          `}
        </Script>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://google-ai-tour.run.app"),
  title: "AI Studio Tour | Google AI Assistant Experience",
  description: "Jelajahi masa depan AI dengan Google AI Studio dan Gemini. Tur edukatif interaktif untuk belajar LLM, Generative AI, dan Agentic AI secara langsung.",
  keywords: [
    "AI Studio Tour",
    "Google AI Studio",
    "Gemini AI",
    "Generative AI Indonesia",
    "Interactive AI Tour",
    "AI education"
  ],
  authors: [{ name: "Syams Savero", url: "https://github.com/syams-savero" }],
  creator: "Syams Savero",
  openGraph: {
    title: "AI Studio Tour | Google AI Assistant Experience",
    description: "Belajar AI jadi lebih seru dengan Google AI Studio & Gemini. Tur edukatif interaktif untuk mempelajari LLM, Generative AI, dan Agentic AI.",
    url: "https://google-ai-tour.run.app",
    siteName: "AI Studio Tour",
    type: "website",
    images: [
      {
        url: "/assets/gogole.png",
        width: 1200,
        height: 630,
        alt: "AI Studio Tour - Google AI Studio"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Studio Tour | Google AI Assistant Experience",
    description: "Tur interaktif AI edukatif dengan Google AI Studio & Gemini. Cocok untuk kompetisi dan presentasi.",
    creator: "@juaravibecoding",
    images: ["/assets/gogole.png"]
  },
  icons: {
    icon: [{ url: "/assets/gogole.png", type: "image/png" }],
    shortcut: [{ url: "/assets/gogole.png" }],
    apple: [{ url: "/assets/gogole.png" }]
  },
};
 
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4285F4"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

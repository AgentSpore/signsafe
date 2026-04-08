import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWARegister } from "@/components/pwa-register";
import { LocaleProvider } from "@/components/locale-provider";

export const metadata: Metadata = {
  title: "SignSafe — Lease Forensics for First-Time Founders",
  description:
    "AI finds the $40K traps hidden in your commercial lease in 60 seconds. Don't sign blind.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SignSafe",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0C10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
        <PWARegister />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteScrollToTop } from "@/components/shared/route-scroll-to-top";
import { Analytics } from "@vercel/analytics/next";


const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roxan — Education Operations System",
  description: "Production-grade multi-tenant SaaS education ERP platform for schools and universities.",
  icons: {
    // Canonical favicon source (served from /public)
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/images/roxan-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/icon.svg" sizes="any" />
        <link rel="apple-touch-icon" href="/images/roxan-logo.svg" />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Suspense fallback={null}>
              <RouteScrollToTop />
            </Suspense>
            {children}
          </TooltipProvider>
        </ThemeProvider>
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}

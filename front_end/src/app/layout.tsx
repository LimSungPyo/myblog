import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import { site } from "@/config/site";
import SearchBar from "@/components/SearchBar";
import HeaderAuth from "@/components/HeaderAuth";
import SiteNav from "@/components/SiteNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: site.title,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto flex max-w-5xl items-center gap-5 px-4 py-2">
            <Link href="/" aria-label={site.name} className="shrink-0">
              <Image
                src="/images/logo.png"
                alt={site.name}
                width={128}
                height={128}
                priority
                className="h-16 w-auto sm:h-32 dark:invert"
              />
            </Link>
            <SiteNav />
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden md:block">
                <Suspense fallback={null}>
                  <SearchBar />
                </Suspense>
              </div>
              <HeaderAuth />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-black/10 dark:border-white/10">
          <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-neutral-500">
            © {new Date().getFullYear()} {site.name}. Built with Next.js &
            FastAPI.
          </div>
        </footer>
      </body>
    </html>
  );
}

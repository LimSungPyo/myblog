import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import { site } from "@/lib/site";
import SearchBar from "@/components/SearchBar";
import HeaderAuth from "@/components/HeaderAuth";

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
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              {site.name}
            </Link>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
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

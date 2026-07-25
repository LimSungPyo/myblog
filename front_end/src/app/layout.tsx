import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import { site } from "@/config/site";
import SearchBar from "@/components/SearchBar";
import AdminLoginButton from "@/components/AdminLoginButton";
import SiteNav from "@/components/SiteNav";
import ThemeToggle from "@/components/ThemeToggle";
import SiteFooter from "@/components/SiteFooter";

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
        <header>
          <div className="mx-auto grid max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3">
            <Link
              href="/"
              aria-label={site.name}
              className="flex shrink-0 items-center gap-2"
            >
              <Image
                src="/images/logo-mark.png"
                alt=""
                width={540}
                height={532}
                priority
                className="h-12 w-auto dark:invert"
              />
              <span className="text-xl font-bold tracking-tight">
                {site.name}
              </span>
            </Link>

            <SiteNav className="hidden justify-self-center md:flex" />

            <div className="flex items-center gap-2 justify-self-end">
              <div className="hidden sm:block">
                <Suspense fallback={null}>
                  <SearchBar />
                </Suspense>
              </div>
              <ThemeToggle />
              <AdminLoginButton />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}

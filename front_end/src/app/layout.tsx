import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
// 한글 글꼴. 글자 묶음별로 나뉜 파일이라 화면에 나온 글자가 든 묶음만 받는다
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { site } from "@/config/site";
import { THEME_COLOR } from "@/lib/theme";
import SearchBar from "@/components/SearchBar";
import AuthButton from "@/components/AuthButton";
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

// 휴대폰 위쪽 상태 표시줄·주소창 색을 페이지 배경과 맞춘다.
// 여기 값은 기기 설정(라이트/다크)을 따르고, 사용자가 테마를 직접 고르면 THEME_COLOR 기준으로 바꿔 끼운다.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        {/* 페인트 전에 테마 적용 → 새로고침 시 라이트/다크 깜빡임(FOUC) 방지.
            사용자가 테마를 직접 골라 둔 경우 상태 표시줄 색도 그 테마에 맞춘다 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');if(t){var c=d?'${THEME_COLOR.dark}':'${THEME_COLOR.light}';document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',c)});}}catch(e){}})();`,
          }}
        />
        <header>
          <div className="mx-auto grid max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3">
            <Link
              href="/"
              aria-label={site.name}
              className="flex shrink-0 items-center gap-2"
            >
              <span
                aria-hidden
                className="logo-mark block h-9 w-9 shrink-0 bg-current"
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
              <AuthButton />
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}

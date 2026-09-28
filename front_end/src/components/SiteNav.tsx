"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/config/site";
import { ChevronRightIcon } from "@/components/ui/icons";

/**
 * 주 메뉴. 넓은 화면 헤더에는 가로 한 줄(bar), 휴대폰 펼침 메뉴에는 세로 목록(menu)으로 그린다.
 * 지금 있는 메뉴는 aria-current="page"로 표시한다.
 */
export default function SiteNav({
  className = "",
  variant = "bar",
  onNavigate,
}: {
  className?: string;
  variant?: "bar" | "menu";
  /** 메뉴를 눌렀을 때 부른다. 펼침 메뉴가 지금 페이지를 다시 눌러도 닫히게 하려고 쓴다 */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "menu") {
    return (
      <nav aria-label="주 메뉴" className={`flex flex-col ${className}`}>
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`press flex h-12 items-center justify-between border-b border-line px-1 text-[17px] ${
                active ? "font-semibold text-foreground" : "text-muted"
              }`}
            >
              {item.label}
              <ChevronRightIcon className="h-4 w-4 opacity-50" />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="주 메뉴"
      className={`flex items-center gap-0.5 text-sm ${className}`}
    >
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`press rounded-lg px-3 py-1.5 whitespace-nowrap ${
              active
                ? "bg-hover font-semibold text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

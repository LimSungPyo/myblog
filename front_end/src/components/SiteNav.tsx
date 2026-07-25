"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/config/site";

export default function SiteNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex gap-1 text-sm">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 ${
            isActive(item.href)
              ? "font-semibold text-neutral-900 dark:text-white"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

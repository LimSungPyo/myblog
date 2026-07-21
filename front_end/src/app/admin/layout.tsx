"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/adminApi";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/posts", label: "글 관리" },
  { href: "/admin/comments", label: "댓글 관리" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearToken();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="flex gap-6">
      <aside className="w-40 shrink-0">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          관리자
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`rounded-md px-3 py-2 ${
                isActive(n.href)
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-4 w-full rounded-md border border-black/10 px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100 dark:border-white/15 dark:hover:bg-neutral-800"
        >
          로그아웃
        </button>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

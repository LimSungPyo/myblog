"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/ui/icons";

export default function SearchBar({
  className = "w-full sm:w-64",
}: {
  /** 폭. 헤더·검색 페이지·휴대폰 메뉴마다 다르게 준다 */
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <form onSubmit={onSubmit} role="search" className={`relative ${className}`}>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="검색 (#태그명)"
        aria-label="글 검색"
        className="h-11 w-full rounded-xl bg-chip pl-10 pr-4 text-sm outline-none transition-shadow duration-150 placeholder:text-muted focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)] lg:h-[38px]"
      />
    </form>
  );
}

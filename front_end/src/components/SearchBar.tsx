"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/ui/icons";

export default function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full sm:w-64">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="검색 (#태그명)"
        aria-label="글 검색"
        className="w-full rounded-full border border-black/10 bg-neutral-50 py-2 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:bg-transparent dark:border-white/15 dark:bg-white/5"
      />
    </form>
  );
}

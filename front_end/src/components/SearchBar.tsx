"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
    <form onSubmit={onSubmit} className="relative w-full max-w-sm">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="검색어를 입력하세요"
        aria-label="글 검색"
        className="w-full rounded-full border border-black/10 dark:border-white/20 bg-transparent px-4 py-2 text-sm outline-none focus:border-blue-500"
      />
      <button
        type="submit"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        aria-label="검색"
      >
        🔍
      </button>
    </form>
  );
}

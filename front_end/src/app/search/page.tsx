import type { Metadata } from "next";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";
import { getPosts } from "@/lib/api";

export const metadata: Metadata = { title: "검색" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = Number(pageParam) || 1;

  const { items, total, totalPages } = query
    ? await getPosts({ q: query, page })
    : { items: [], total: 0, totalPages: 1 };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">검색</h1>
      <div className="mb-6">
        <SearchBar />
      </div>

      {!query ? (
        <p className="text-neutral-500">검색어를 입력하세요.</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-neutral-500">
            &ldquo;{query}&rdquo; 검색 결과 {total}건
          </p>
          {items.length === 0 ? (
            <p className="text-neutral-500">일치하는 글이 없습니다.</p>
          ) : (
            <div className="space-y-5">
              {items.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/search"
            extraQuery={{ q: query }}
          />
        </>
      )}
    </div>
  );
}

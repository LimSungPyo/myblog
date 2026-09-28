import type { Metadata } from "next";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/ui/Pagination";
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

  const isTagSearch = query.startsWith("#");
  const tagTerm = isTagSearch ? query.slice(1).trim() : "";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-4 font-serif text-[30px] font-bold tracking-[-0.02em] lg:pt-6 lg:text-[36px]">
        검색
      </h1>
      <div className="mb-6">
        <SearchBar className="w-full" />
      </div>

      {!query ? (
        <p className="text-muted">
          검색어를 입력하세요.{" "}
          <span className="text-muted">
            (<code>#태그명</code>으로 태그 검색)
          </span>
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            {isTagSearch ? (
              <>
                태그{" "}
                <span className="font-semibold text-accent">#{tagTerm}</span>{" "}
                검색 결과 {total}건
              </>
            ) : (
              <>
                &ldquo;{query}&rdquo; 검색 결과 {total}건
              </>
            )}
          </p>
          {items.length === 0 ? (
            <p className="text-muted">일치하는 글이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-3.5 sm:gap-4">
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

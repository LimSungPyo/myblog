import type { Metadata } from "next";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/ui/Pagination";
import { getPosts } from "@/lib/api";

export const metadata: Metadata = {
  title: "전체 글",
  description: "발행된 모든 글 목록입니다.",
};

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const { items, totalPages } = await getPosts({ page });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-6 text-[28px] font-extrabold tracking-[-0.03em] lg:mb-8 lg:pt-6 lg:text-[32px]">
        전체 글
      </h1>

      {items.length === 0 ? (
        <p className="text-muted">아직 발행된 글이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3.5 sm:gap-4">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/posts" />
    </div>
  );
}

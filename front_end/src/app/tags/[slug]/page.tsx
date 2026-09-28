import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/ui/Pagination";
import { getPosts, getTags } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = (await getTags()).find((t) => t.slug === slug);
  return { title: tag ? `#${tag.name}` : "태그" };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const tag = (await getTags()).find((t) => t.slug === slug);
  if (!tag) notFound();

  const { items, totalPages } = await getPosts({ tag: slug, page });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-6 text-[30px] font-bold tracking-[-0.02em] lg:mb-8 lg:pt-6 lg:text-[36px]">
        <span className="text-muted">#</span>
        {tag.name}
      </h1>

      {items.length === 0 ? (
        <p className="text-muted">이 태그의 글이 없습니다.</p>
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
        basePath={`/tags/${slug}`}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/ui/Pagination";
import { getCategories, getPosts } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  return { title: category ? `${category.name} 카테고리` : "카테고리" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  const { items, totalPages } = await getPosts({ category: slug, page });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-6 text-[28px] font-extrabold tracking-[-0.03em] lg:mb-8 lg:pt-6 lg:text-[32px]">
        <span className="text-muted">카테고리 · </span>
        {category.name}
      </h1>

      {items.length === 0 ? (
        <p className="text-muted">이 카테고리에 글이 없습니다.</p>
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
        basePath={`/categories/${slug}`}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/Pagination";
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
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        <span className="text-neutral-400">카테고리 · </span>
        {category.name}
      </h1>

      {items.length === 0 ? (
        <p className="text-neutral-500">이 카테고리에 글이 없습니다.</p>
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
        basePath={`/categories/${slug}`}
      />
    </div>
  );
}

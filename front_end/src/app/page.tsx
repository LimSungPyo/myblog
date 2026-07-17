import PostCard from "@/components/PostCard";
import Pagination from "@/components/Pagination";
import { getCategories, getPosts } from "@/lib/api";
import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const [{ items, totalPages }, categories] = await Promise.all([
    getPosts({ page }),
    getCategories(),
  ]);

  return (
    <div>
      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">최근 글</h1>
        <nav className="mt-3 flex flex-wrap gap-2 text-sm">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className="rounded-full border border-black/10 dark:border-white/20 px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </section>

      {items.length === 0 ? (
        <p className="text-neutral-500">아직 발행된 글이 없습니다.</p>
      ) : (
        <div className="space-y-5">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/" />
    </div>
  );
}

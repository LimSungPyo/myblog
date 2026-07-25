import PostCard from "@/components/PostCard";
import Pagination from "@/components/ui/Pagination";
import { getPosts } from "@/lib/api";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const { items, totalPages } = await getPosts({ page });

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold tracking-tight">최근 글</h1>

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

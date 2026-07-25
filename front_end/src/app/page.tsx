import Link from "next/link";
import Hero from "@/components/Hero";
import PostCard from "@/components/PostCard";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getPosts } from "@/lib/api";

export default async function Home() {
  const { items } = await getPosts({ page: 1, pageSize: 4 });

  return (
    <div>
      <Hero />

      <section
        id="recent"
        className="scroll-mt-20 border-t border-black/10 pt-10 dark:border-white/10"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">최근 글</h2>
          <Link
            href="/posts"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            더 보기
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-neutral-500">아직 발행된 글이 없습니다.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

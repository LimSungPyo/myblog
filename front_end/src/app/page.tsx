import Link from "next/link";
import Hero from "@/components/Hero";
import PostCard from "@/components/PostCard";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getPosts } from "@/lib/api";

export default async function Home() {
  const { items } = await getPosts({ page: 1, pageSize: 2 });

  return (
    <div>
      <Hero />

      <section className="flex flex-col gap-4 border-t border-line pt-7 lg:gap-6 lg:pt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold tracking-tight lg:text-[22px]">
            최근 글
          </h2>
          <Link
            href="/posts"
            className="flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:underline hover:underline-offset-4"
          >
            전체 글 보기
            <ArrowRightIcon className="h-[15px] w-[15px]" />
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-muted">아직 발행된 글이 없습니다.</p>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-5">
            {items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

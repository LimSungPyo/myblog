import Link from "next/link";
import CompassHero from "@/components/CompassHero";
import CompassDial from "@/components/CompassDial";
import PostCard from "@/components/PostCard";
import StepsRuler from "@/components/StepsRuler";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getPosts } from "@/lib/api";
import { buildWeeks } from "@/lib/steps";

/** 홈에 보이는 최근 글 수 */
const RECENT = 3;

export default async function Home() {
  // 걸음 눈금자(최근 52주)와 최근 글을 한 번에 채운다. 목록 API가 한 번에 주는 최대치가 100개다
  const { items, total } = await getPosts({ page: 1, pageSize: 100 });
  const weeks = buildWeeks(
    items.map((p) => ({
      slug: p.slug,
      title: p.title,
      at: p.publishedAt ?? p.createdAt,
    })),
    new Date(),
  );
  const recent = items.slice(0, RECENT);

  return (
    <div className="flex flex-col gap-16 lg:gap-24">
      <CompassHero />

      <StepsRuler weeks={weeks} />

      <CompassDial />

      <section className="flex flex-col gap-5 lg:gap-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-[26px] font-bold tracking-[-0.02em] lg:text-[34px]">
            최근 기록
          </h2>
          <Link
            href="/posts"
            className="flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:underline hover:underline-offset-4"
          >
            전체 글 보기
            <ArrowRightIcon className="h-[15px] w-[15px]" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-muted">아직 발행된 글이 없습니다.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
            {recent.map((post, i) => (
              // 목록은 최신 글부터라, 발행 순서 번호는 전체 글 수에서 거꾸로 센다
              <PostCard key={post.id} post={post} no={total - i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

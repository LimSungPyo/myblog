import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";

type Neighbor = { slug: string; title: string } | null;

function Card({
  neighbor,
  direction,
}: {
  neighbor: Neighbor;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";
  const label = isPrev ? "이전 기록" : "다음 기록";
  const align = isPrev ? "items-start text-left" : "items-end text-right";

  // 첫 글이거나 가장 최근 글이면 그쪽 칸은 링크 없이 안내만 둔다
  if (!neighbor) {
    return (
      <div
        className={`flex flex-col gap-1.5 rounded-[4px] border border-dashed border-line px-5 py-4 ${align}`}
      >
        <span className="font-mono text-xs text-muted">{label}</span>
        <span className="text-[15px] text-muted">
          {isPrev ? "첫 기록입니다" : "가장 최근 기록입니다"}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/posts/${neighbor.slug}`}
      rel={direction}
      className={`group press flex flex-col gap-1.5 rounded-[4px] bg-surface px-5 py-4 shadow-card hover:shadow-card-hover ${align}`}
    >
      <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
        {isPrev && (
          <ArrowLeftIcon className="h-3.5 w-3.5 transition-[translate,color] duration-200 ease-out-strong group-hover:-translate-x-0.5 group-hover:text-accent" />
        )}
        {label}
        {!isPrev && (
          <ArrowRightIcon className="h-3.5 w-3.5 transition-[translate,color] duration-200 ease-out-strong group-hover:translate-x-0.5 group-hover:text-accent" />
        )}
      </span>
      <span className="font-bold">{neighbor.title}</span>
    </Link>
  );
}

/** 글 상세 아래의 이전·다음 기록. 이전은 더 오래된 글, 다음은 더 최근 글이다 */
export default function PostNav({
  prev,
  next,
}: {
  prev: Neighbor;
  next: Neighbor;
}) {
  return (
    <nav
      aria-label="이전·다음 기록"
      className="grid gap-3 sm:grid-cols-2 sm:gap-4"
    >
      <Card neighbor={prev} direction="prev" />
      <Card neighbor={next} direction="next" />
    </nav>
  );
}

import Link from "next/link";
import type { Post } from "@/types";
import { formatShortDate, readingMinutes } from "@/lib/format";
import { ArrowRightIcon } from "@/components/ui/icons";
import PostTitleMorph from "@/components/PostTitleMorph";

/** 도면 모서리의 재단 표시. 마우스를 올리면 바깥으로 살짝 벌어지며 파랗게 된다 */
const cropMarks = [
  "-top-1.5 -left-1.5 border-t border-l group-hover:-translate-x-1 group-hover:-translate-y-1",
  "-top-1.5 -right-1.5 border-t border-r group-hover:translate-x-1 group-hover:-translate-y-1",
  "-bottom-1.5 -left-1.5 border-b border-l group-hover:-translate-x-1 group-hover:translate-y-1",
  "-right-1.5 -bottom-1.5 border-r border-b group-hover:translate-x-1 group-hover:translate-y-1",
];

/**
 * 글 카드. 카드 어디를 눌러도 글로 간다.
 *
 * 제목 링크의 ::after를 카드 전체로 펼쳐서 누를 수 있는 영역을 넓힌다(링크 안에 링크를 넣지 않는 방법).
 * 카테고리·태그 링크는 relative z-10으로 그 위에 올려 따로 눌리게 한다.
 * no를 주면 도면 번호처럼 "N°03"을 앞에 붙인다(발행 순서, 첫 글이 1).
 */
export default function PostCard({ post, no }: { post: Post; no?: number }) {
  return (
    <article className="group relative flex h-full flex-col gap-2.5 rounded-[4px] bg-surface p-[18px] shadow-card transition-[box-shadow,scale] duration-[160ms] ease-out-strong hover:shadow-card-hover active:scale-[0.99] sm:px-[22px] sm:pt-[22px] sm:pb-5 motion-reduce:active:scale-100">
      {cropMarks.map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={`pointer-events-none absolute h-3 w-3 border-faint transition-[translate,border-color] duration-200 ease-out-strong group-hover:border-accent motion-reduce:translate-none ${pos}`}
        />
      ))}
      <div className="flex items-center gap-2 font-mono text-xs text-muted">
        {no !== undefined && (
          <>
            <span>N°{String(no).padStart(2, "0")}</span>
            <span aria-hidden>·</span>
          </>
        )}
        {post.category && (
          <>
            <Link
              href={`/categories/${post.category.slug}`}
              className="relative z-10 font-semibold text-foreground hover:underline hover:underline-offset-2"
            >
              {post.category.name}
            </Link>
            <span aria-hidden>·</span>
          </>
        )}
        <time dateTime={post.publishedAt ?? post.createdAt}>
          {formatShortDate(post.publishedAt ?? post.createdAt)}
        </time>
        <span aria-hidden>·</span>
        <span>{readingMinutes(post.content)}분</span>
      </div>

      <PostTitleMorph postId={post.id}>
        <h2 className="text-[17px] leading-snug font-bold tracking-tight sm:text-lg">
          <Link
            href={`/posts/${post.slug}`}
            className="after:absolute after:inset-0 after:rounded-[4px] after:content-['']"
          >
            {post.title}
          </Link>
        </h2>
      </PostTitleMorph>

      <p className="line-clamp-2 text-[14.5px] leading-relaxed text-muted">
        {post.excerpt}
      </p>

      <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Link
              key={t.id}
              href={`/tags/${t.slug}`}
              className="relative z-10 rounded-md bg-chip px-2 py-0.5 text-xs font-medium text-chip-foreground transition-colors hover:text-foreground"
            >
              #{t.name}
            </Link>
          ))}
        </div>
        <ArrowRightIcon className="h-[18px] w-[18px] shrink-0 text-muted transition-[translate,color] duration-200 ease-out-strong group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </article>
  );
}

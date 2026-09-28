import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getComments, getPost, getPosts } from "@/lib/api";
import { formatDate, formatShortDate, readingMinutes } from "@/lib/format";
import { site } from "@/config/site";
import { extractToc } from "@/lib/toc";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import CommentSection from "@/components/CommentSection";
import ViewCounter from "@/components/ViewCounter";
import TableOfContents from "@/components/TableOfContents";
import ReadingCompass, { POST_BODY_ID } from "@/components/ReadingCompass";
import PostNav from "@/components/PostNav";
import { ArrowLeftIcon } from "@/components/ui/icons";

// 제목이 하나뿐이면 목차가 있어도 갈 곳이 없어서, 이보다 적으면 목차를 두지 않는다
const MIN_TOC_ITEMS = 2;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "글을 찾을 수 없습니다" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `${site.url}/posts/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.status !== "published") notFound();

  const comments = await getComments(slug);
  const toc = extractToc(post.content);
  const showToc = toc.length >= MIN_TOC_ITEMS;

  // 발행 순서 번호(N°)와 이전·다음 기록을 찾으려고 글 목록을 한 번 본다(목록 API 최대치 100개).
  // 목록은 최신 글부터라, 뒤쪽(index + 1)이 더 오래된 "이전 기록"이다.
  // 100개 안에 없는 오래된 글이면 번호와 이전·다음 기록을 빼고 보여준다.
  const { items, total } = await getPosts({ page: 1, pageSize: 100 });
  const index = items.findIndex((p) => p.slug === post.slug);
  const found = index >= 0;
  const no = found ? total - index : null;
  const neighbor = (i: number) =>
    items[i] ? { slug: items[i].slug, title: items[i].title } : null;
  const publishedAt = post.publishedAt ?? post.createdAt;

  // 넓은 화면(lg): 왼쪽 칸(읽기 진행 컴퍼스와 목차) + 본문.
  // 더 넓은 화면(xl): 오른쪽에 "도면 정보" 칸을 더 둔다. 1180px라 main(992px)보다 넓어서 양옆으로 94px씩 빼낸다.
  // 본문 칸은 어느 폭에서든 680px. 17px 글자로 한글이 한 줄에 40자 안팎 들어가 읽기 편한 폭이다.
  return (
    <div className="mx-auto w-full max-w-[680px] lg:grid lg:max-w-none lg:grid-cols-[200px_minmax(0,680px)] lg:justify-center lg:gap-12 xl:-mx-[94px] xl:grid-cols-[200px_minmax(0,680px)_220px] xl:gap-10">
      <aside className="hidden lg:block lg:pt-6">
        <div className="sticky top-6 flex flex-col gap-6">
          <ReadingCompass variant="rail" />
          {showToc && (
            <TableOfContents
              items={toc}
              variant="sidebar"
              endId={POST_BODY_ID}
            />
          )}
        </div>
      </aside>

      <article className="min-w-0 lg:pt-6">
        <header className="mb-7 flex flex-col gap-3 border-b border-dashed border-line pb-6 lg:mb-10 lg:gap-4 lg:pb-9">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted lg:text-[13px]">
            {no !== null && (
              <>
                <span>N°{String(no).padStart(2, "0")}</span>
                <span aria-hidden>·</span>
              </>
            )}
            {post.category && (
              <>
                <Link
                  href={`/categories/${post.category.slug}`}
                  className="font-semibold text-foreground hover:underline hover:underline-offset-2"
                >
                  {post.category.name}
                </Link>
                <span aria-hidden>·</span>
              </>
            )}
            <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
            <span aria-hidden>·</span>
            <ViewCounter slug={post.slug} initial={post.viewCount} />
          </div>
          <h1 className="font-serif text-[32px] leading-[1.25] font-bold tracking-[-0.03em] break-keep text-balance lg:text-[48px] lg:leading-[1.2]">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-[17px] leading-relaxed text-muted lg:text-lg">
              {post.excerpt}
            </p>
          )}
          {post.tags.length > 0 && (
            // 가장 넓은 화면에서는 태그가 오른쪽 도면 정보 칸에 있다
            <div className="flex flex-wrap gap-1.5 xl:hidden">
              {post.tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/tags/${t.slug}`}
                  className="rounded-[7px] bg-chip px-[9px] py-1 text-[13px] font-medium text-chip-foreground transition-colors hover:text-foreground"
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          )}
        </header>

        {showToc && (
          <TableOfContents items={toc} variant="inline" endId={POST_BODY_ID} />
        )}

        {/* 읽기 진행은 이 영역을 기준으로 잰다. 안의 ## 제목에는 §1, §2 도면 번호가 붙는다 */}
        <div id={POST_BODY_ID} className="post-body">
          <MarkdownRenderer content={post.content} />
        </div>

        {found && (
          <div className="mt-14 lg:mt-[72px]">
            <PostNav prev={neighbor(index + 1)} next={neighbor(index - 1)} />
          </div>
        )}

        <CommentSection slug={post.slug} initial={comments} />

        <div className="mt-8 lg:mt-12">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeftIcon className="h-[15px] w-[15px]" />
            목록으로
          </Link>
        </div>
      </article>

      <aside className="hidden xl:block xl:pt-6">
        <div className="sticky top-6 flex flex-col gap-4 rounded-[4px] bg-surface p-5 shadow-card">
          <p className="font-mono text-xs text-muted">도면 정보</p>
          <dl className="grid grid-cols-[48px_minmax(0,1fr)] gap-y-2 font-mono text-[13px]">
            {post.category && (
              <>
                <dt className="text-faint">분류</dt>
                <dd>{post.category.name}</dd>
              </>
            )}
            <dt className="text-faint">작성</dt>
            <dd>{formatShortDate(publishedAt)}</dd>
            <dt className="text-faint">조회</dt>
            <dd>{post.viewCount}</dd>
            <dt className="text-faint">분량</dt>
            <dd>{readingMinutes(post.content)}분</dd>
          </dl>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-2.5 gap-y-1 border-t border-dashed border-line pt-3">
              {post.tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/tags/${t.slug}`}
                  className="font-mono text-xs text-accent hover:underline hover:underline-offset-2"
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>

      <ReadingCompass variant="float" />
    </div>
  );
}

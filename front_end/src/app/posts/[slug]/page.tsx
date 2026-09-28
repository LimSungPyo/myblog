import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getComments, getPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { site } from "@/config/site";
import { extractToc } from "@/lib/toc";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import CommentSection from "@/components/CommentSection";
import ViewCounter from "@/components/ViewCounter";
import TableOfContents from "@/components/TableOfContents";
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

  // 목차가 있으면 넓은 화면에서 본문 오른쪽에 목차 칸을 하나 더 둔다.
  // 본문 칸은 목차가 있든 없든 680px. 17px 글자로 한글이 한 줄에 40자 안팎 들어가 읽기 편한 폭이다.
  return (
    <div
      className={
        showToc
          ? "mx-auto w-full max-w-[680px] lg:grid lg:max-w-[936px] lg:grid-cols-[minmax(0,680px)_200px] lg:gap-14"
          : "mx-auto w-full max-w-[680px]"
      }
    >
      <article className="min-w-0 lg:pt-6">
        <header className="mb-7 flex flex-col gap-3 border-b border-line pb-6 lg:mb-9 lg:gap-3.5 lg:pb-9">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted lg:text-sm">
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
            <time dateTime={post.publishedAt ?? post.createdAt}>
              {formatDate(post.publishedAt ?? post.createdAt)}
            </time>
            <span aria-hidden>·</span>
            <ViewCounter slug={post.slug} initial={post.viewCount} />
          </div>
          <h1 className="text-[28px] leading-[1.3] font-extrabold tracking-[-0.03em] text-balance lg:text-[40px] lg:leading-[1.25]">
            {post.title}
          </h1>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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

        {showToc && <TableOfContents items={toc} variant="inline" />}

        <MarkdownRenderer content={post.content} />

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
      {showToc && (
        <aside className="hidden lg:block lg:pt-6">
          <TableOfContents items={toc} variant="sidebar" />
        </aside>
      )}
    </div>
  );
}

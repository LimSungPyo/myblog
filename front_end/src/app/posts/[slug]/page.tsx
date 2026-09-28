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
  // 본문 칸 너비는 목차가 없을 때(max-w-3xl)와 거의 같게 맞췄다.
  return (
    <div
      className={
        showToc
          ? "mx-auto w-full max-w-3xl lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-10"
          : "mx-auto w-full max-w-3xl"
      }
    >
      <article className="min-w-0">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            {post.category && (
              <Link
                href={`/categories/${post.category.slug}`}
                className="hover:underline"
              >
                {post.category.name}
              </Link>
            )}
            <span>·</span>
            <time dateTime={post.publishedAt ?? post.createdAt}>
              {formatDate(post.publishedAt ?? post.createdAt)}
            </time>
            <span>·</span>
            <ViewCounter slug={post.slug} initial={post.viewCount} />
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {post.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <Link
                key={t.id}
                href={`/tags/${t.slug}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        </header>

        {showToc && <TableOfContents items={toc} variant="inline" />}

        <MarkdownRenderer content={post.content} />

        <CommentSection slug={post.slug} initial={comments} />

        <div className="mt-12">
          <Link href="/" className="text-sm text-neutral-500 hover:underline">
            ← 목록으로
          </Link>
        </div>
      </article>
      {showToc && (
        <aside className="hidden lg:block">
          <TableOfContents items={toc} variant="sidebar" />
        </aside>
      )}
    </div>
  );
}

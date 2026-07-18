import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getComments, getPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CommentSection from "@/components/CommentSection";
import ViewCounter from "@/components/ViewCounter";

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

  return (
    <article>
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
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{post.title}</h1>
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

      <MarkdownRenderer content={post.content} />

      <CommentSection slug={post.slug} initial={comments} />

      <div className="mt-12">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← 목록으로
        </Link>
      </div>
    </article>
  );
}

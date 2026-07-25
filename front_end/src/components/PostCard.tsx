import Link from "next/link";
import type { Post } from "@/types";
import { formatShortDate, readingMinutes } from "@/lib/format";
import { FolderIcon, ArrowRightIcon } from "@/components/ui/icons";

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="group flex h-full flex-col rounded-xl border border-black/10 dark:border-white/15 p-5 transition hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
        {post.category ? (
          <Link
            href={`/categories/${post.category.slug}`}
            className="flex items-center gap-1.5 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <FolderIcon className="h-4 w-4" />
            {post.category.name}
          </Link>
        ) : (
          <span />
        )}
        <span className="shrink-0">
          <time dateTime={post.publishedAt ?? post.createdAt}>
            {formatShortDate(post.publishedAt ?? post.createdAt)}
          </time>
          {" · "}
          {readingMinutes(post.content)} min read
        </span>
      </div>

      <h2 className="mt-3 text-lg font-semibold tracking-tight">
        <Link href={`/posts/${post.slug}`} className="group-hover:underline">
          {post.title}
        </Link>
      </h2>

      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
        {post.excerpt}
      </p>

      <div className="mt-4 flex items-end justify-between gap-2 pt-1">
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Link
              key={t.id}
              href={`/tags/${t.slug}`}
              className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
            >
              #{t.name}
            </Link>
          ))}
        </div>
        <Link
          href={`/posts/${post.slug}`}
          aria-label={`${post.title} 읽기`}
          className="shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>
    </article>
  );
}

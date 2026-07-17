import Link from "next/link";
import type { Post } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="group rounded-xl border border-black/10 dark:border-white/15 p-5 transition hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        {post.category && (
          <Link
            href={`/categories/${post.category.slug}`}
            className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 hover:underline"
          >
            {post.category.name}
          </Link>
        )}
        <time dateTime={post.publishedAt ?? post.createdAt}>
          {formatDate(post.publishedAt ?? post.createdAt)}
        </time>
      </div>

      <h2 className="mt-2 text-xl font-semibold tracking-tight">
        <Link href={`/posts/${post.slug}`} className="group-hover:underline">
          {post.title}
        </Link>
      </h2>

      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
        {post.excerpt}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {post.tags.map((t) => (
          <Link
            key={t.id}
            href={`/tags/${t.slug}`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            #{t.name}
          </Link>
        ))}
      </div>
    </article>
  );
}

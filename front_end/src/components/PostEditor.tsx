"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@uiw/react-md-editor/markdown-editor.css";
import { adminApi, type PostInput } from "@/lib/adminApi";
import { slugify } from "@/lib/slug";
import type { Category, Post, Tag } from "@/lib/types";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const PUBLIC_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export default function PostEditor({ initial }: { initial?: Post }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(
    initial?.category?.id ?? null,
  );
  const [tagIds, setTagIds] = useState<number[]>(
    initial?.tags.map((t) => t.id) ?? [],
  );
  const [status, setStatus] = useState<"draft" | "published">(
    initial?.status ?? "draft",
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!PUBLIC_API) return;
    fetch(`${PUBLIC_API}/categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
    fetch(`${PUBLIC_API}/tags`)
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {});
  }, []);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function toggleTag(id: number) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function save(nextStatus: "draft" | "published") {
    setSaving(true);
    setError(null);
    const payload: PostInput = {
      title,
      slug: slug || slugify(title),
      excerpt,
      content,
      coverImage: coverImage || null,
      categoryId,
      tagIds,
      status: nextStatus,
    };
    try {
      if (initial) await adminApi.updatePost(initial.id, payload);
      else await adminApi.createPost(payload);
      router.push("/admin/posts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
      setStatus(nextStatus);
    }
  }

  return (
    <div className="space-y-4">
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="제목"
        className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-lg font-semibold outline-none focus:border-blue-500"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-neutral-500">슬러그(URL)</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="my-first-post"
            className="mt-1 w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm">
          <span className="text-neutral-500">커버 이미지 URL(선택)</span>
          <input
            value={coverImage ?? ""}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-neutral-500">요약</span>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          placeholder="목록에 표시될 한두 줄 요약"
          className="mt-1 w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-neutral-500">카테고리</span>
          <select
            value={categoryId ?? ""}
            onChange={(e) =>
              setCategoryId(e.target.value ? Number(e.target.value) : null)
            }
            className="mt-1 w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">(없음)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm">
          <span className="text-neutral-500">태그</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  tagIds.includes(t.id)
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-black/10 dark:border-white/20"
                }`}
              >
                #{t.name}
              </button>
            ))}
            {tags.length === 0 && (
              <span className="text-xs text-neutral-400">
                등록된 태그가 없습니다.
              </span>
            )}
          </div>
        </div>
      </div>

      <div data-color-mode="light">
        <MDEditor
          value={content}
          onChange={(v) => setContent(v ?? "")}
          height={420}
          textareaProps={{ placeholder: "마크다운으로 작성하세요…" }}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={() => save("draft")}
          disabled={saving}
          className="rounded-md border border-black/10 dark:border-white/20 px-4 py-2 text-sm disabled:opacity-50"
        >
          임시저장(draft)
        </button>
        <button
          onClick={() => save("published")}
          disabled={saving}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status === "published" ? "발행 업데이트" : "발행(publish)"}
        </button>
      </div>
    </div>
  );
}

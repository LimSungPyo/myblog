"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@uiw/react-md-editor/markdown-editor.css";
import { adminApi, type PostInput } from "@/lib/adminApi";
import { slugify } from "@/lib/slug";
import {
  ACCEPTED_IMAGE_TYPES,
  imageFilesOf,
  useMarkdownImageUpload,
} from "@/hooks/useMarkdownImageUpload";
import type { Category, Post, Tag } from "@/types";

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

  // 본문 이미지: 붙여넣기·끌어다 놓기·버튼 세 경로가 모두 같은 업로드 함수로 모인다
  const {
    uploadInto,
    uploading: bodyUploading,
    error: bodyImageError,
  } = useMarkdownImageUpload(setContent);
  // 버튼이나 끌어다 놓기로 넣을 때 쓸 위치. 에디터 밖을 누르는 순간 커서 정보가
  // 사라지므로, 에디터 안에서 커서가 움직일 때마다 마지막 위치를 기억해 둔다.
  const cursorRef = useRef<number | null>(null);
  const bodyFileInput = useRef<HTMLInputElement>(null);

  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverFileInput = useRef<HTMLInputElement>(null);

  // 업로드가 끝나기 전에 저장하면 "업로드 중…" 자리표시가 그대로 글에 박힌다
  const uploading = bodyUploading || coverUploading;

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

  function insertPosition() {
    return cursorRef.current ?? content.length;
  }

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    setCoverUploading(true);
    setCoverError(null);
    try {
      const { url } = await adminApi.uploadImage(file);
      setCoverImage(url);
    } catch (err) {
      setCoverError(
        err instanceof Error ? err.message : "이미지를 올리지 못했어요.",
      );
    } finally {
      setCoverUploading(false);
    }
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
        <div className="text-sm">
          <label htmlFor="cover-image" className="text-neutral-500">
            커버 이미지(선택)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="cover-image"
              value={coverImage ?? ""}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://… 또는 오른쪽 버튼으로 업로드"
              className="w-full rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => coverFileInput.current?.click()}
              disabled={coverUploading}
              className="shrink-0 rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20"
            >
              {coverUploading ? "올리는 중…" : "업로드"}
            </button>
            <input
              ref={coverFileInput}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              aria-label="커버 이미지 파일"
              className="hidden"
              onChange={(e) => {
                uploadCover(e.target.files?.[0]);
                e.target.value = ""; // 같은 파일을 다시 골라도 change가 일어나게
              }}
            />
          </div>
          {coverError && (
            <p className="mt-1 text-xs text-red-500">{coverError}</p>
          )}
          {coverImage && (
            // eslint-disable-next-line @next/next/no-img-element -- 관리자 미리보기라 최적화가 필요 없다
            <img
              src={coverImage}
              alt="커버 이미지 미리보기"
              className="mt-2 h-20 w-auto rounded border border-black/10 object-cover dark:border-white/15"
            />
          )}
        </div>
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

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-neutral-500">
          이미지는 붙여넣기(⌘V)나 끌어다 놓기로도 넣을 수 있어요
        </span>
        <button
          type="button"
          onClick={() => bodyFileInput.current?.click()}
          className="shrink-0 rounded-md border border-black/10 px-3 py-1.5 dark:border-white/20"
        >
          이미지 넣기
        </button>
        <input
          ref={bodyFileInput}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES}
          aria-label="본문 이미지 파일"
          className="hidden"
          onChange={(e) => {
            uploadInto(imageFilesOf(e.target.files), insertPosition());
            e.target.value = "";
          }}
        />
      </div>

      <div
        data-color-mode="light"
        // 기본 동작을 막지 않으면 브라우저가 파일을 새 탭으로 열어버린다
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          const files = imageFilesOf(e.dataTransfer.files);
          if (files.length === 0) return;
          e.preventDefault();
          uploadInto(files, insertPosition());
        }}
      >
        <MDEditor
          value={content}
          onChange={(v) => setContent(v ?? "")}
          height={420}
          textareaProps={{
            placeholder: "마크다운으로 작성하세요…",
            onSelect: (e) => {
              cursorRef.current = e.currentTarget.selectionStart;
            },
            onPaste: (e) => {
              const files = imageFilesOf(e.clipboardData.files);
              if (files.length === 0) return; // 글자 붙여넣기는 평소대로
              e.preventDefault();
              uploadInto(files, e.currentTarget.selectionStart);
            },
          }}
        />
      </div>

      {bodyUploading && (
        <p className="text-sm text-neutral-500">이미지를 올리는 중이에요…</p>
      )}
      {bodyImageError && (
        <p className="text-sm text-red-500">{bodyImageError}</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={() => save("draft")}
          disabled={saving || uploading}
          className="rounded-md border border-black/10 dark:border-white/20 px-4 py-2 text-sm disabled:opacity-50"
        >
          임시저장(draft)
        </button>
        <button
          onClick={() => save("published")}
          disabled={saving || uploading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status === "published" ? "발행 업데이트" : "발행(publish)"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import PostEditor from "@/components/PostEditor";
import { adminApi } from "@/lib/adminApi";
import type { Post } from "@/lib/types";

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getPost(Number(id))
      .then(setPost)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "불러오기 실패"),
      );
  }, [id]);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!post) return <p className="text-neutral-500">불러오는 중…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">글 수정</h1>
      <PostEditor initial={post} />
    </div>
  );
}

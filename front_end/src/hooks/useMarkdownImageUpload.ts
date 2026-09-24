"use client";

import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { adminApi } from "@/lib/adminApi";
import {
  imageMarkdown,
  insertAt,
  replacePlaceholder,
  uploadingPlaceholder,
} from "@/lib/markdownImage";

// 서버가 받는 형식만 거른다. 나머지는 올려봐야 415로 돌아온다.
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

let seq = 0;
function nextId(): string {
  seq += 1;
  return `${Date.now().toString(36)}-${seq}`;
}

export function imageFilesOf(
  files: FileList | File[] | null | undefined,
): File[] {
  return Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
}

/**
 * 파일을 올리고 마크다운 본문에 끼워 넣는다.
 *
 * 본문을 바꿀 때 전부 `setContent(prev => ...)` 형태로 쓴다. 업로드가 끝나는 몇 초
 * 사이에 글쓴이가 타이핑을 계속하므로, 업로드를 시작할 때 들고 있던 본문으로 덮어쓰면
 * 그사이 쓴 글이 날아간다. 항상 "지금의" 본문을 받아서 자리표시만 바꾼다.
 */
export function useMarkdownImageUpload(
  setContent: Dispatch<SetStateAction<string>>,
) {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadInto = useCallback(
    async (files: File[], position: number) => {
      if (files.length === 0) return;
      setError(null);
      const ids = files.map(() => nextId());
      // 여러 장이면 자리표시를 한 번에 꽂아서 고른 순서대로 들어가게 한다
      setContent((prev) =>
        insertAt(prev, position, ids.map(uploadingPlaceholder).join("\n")),
      );
      setPending((n) => n + files.length);

      await Promise.all(
        files.map(async (file, i) => {
          try {
            const { url } = await adminApi.uploadImage(file);
            setContent((prev) =>
              replacePlaceholder(prev, ids[i], imageMarkdown(url)),
            );
          } catch (err) {
            setContent((prev) => replacePlaceholder(prev, ids[i], ""));
            setError(
              err instanceof Error ? err.message : "이미지를 올리지 못했어요.",
            );
          } finally {
            setPending((n) => n - 1);
          }
        }),
      );
    },
    [setContent],
  );

  return { uploadInto, uploading: pending > 0, error };
}

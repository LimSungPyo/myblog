"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { GuestbookEntry } from "@/types";
import { formatDate } from "@/lib/format";

export default function AdminGuestbookPage() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setEntries(await adminApi.listGuestbook());
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function remove(id: number) {
    if (!confirm("이 방명록을 삭제할까요?")) return;
    await adminApi.deleteGuestbook(id);
    setEntries((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">방명록 관리</h1>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {loading ? (
        <p className="text-neutral-500">불러오는 중…</p>
      ) : entries.length === 0 ? (
        <p className="text-neutral-500">방명록이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {entries.map((e) => (
            <li key={e.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{e.authorName}</span>
                    <time className="text-neutral-500">
                      {formatDate(e.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {e.content}
                  </p>
                </div>
                <button
                  onClick={() => remove(e.id)}
                  className="shrink-0 text-sm text-red-500 hover:underline"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

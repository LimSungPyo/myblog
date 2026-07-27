"use client";

import { useState } from "react";

/** 게임 진입 시 플레이어 이름을 받는 팝업. 이름 입력 전에는 게임을 시작할 수 없다. */
export default function NameModal({
  onStart,
}: {
  onStart: (name: string) => void;
}) {
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onStart(trimmed);
  }

  return (
    <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-black/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-neutral-900"
      >
        <h2 className="text-lg font-bold">플레이어 이름</h2>
        <p className="mt-1 text-sm text-neutral-500">
          이름을 입력하면 게임이 시작돼요.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          maxLength={40}
          aria-label="플레이어 이름"
          className="mt-4 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-center text-sm outline-none transition focus:border-blue-500 dark:border-white/15 dark:bg-white/5"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-3 w-full rounded-xl bg-[#10213a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3157] disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-neutral-200"
        >
          게임 시작
        </button>
      </form>
    </div>
  );
}

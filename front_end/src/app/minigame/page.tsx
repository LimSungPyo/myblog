import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "미니게임",
  description: "가볍게 즐길 수 있는 미니게임 공간입니다.",
};

export default function MinigamePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">미니게임</h1>
      <div className="rounded-xl border border-dashed border-black/15 p-10 text-center dark:border-white/20">
        <p className="text-neutral-500">미니게임은 준비 중입니다. 🎮</p>
        <p className="mt-1 text-sm text-neutral-400">
          곧 가볍게 즐길 수 있는 미니게임이 추가됩니다.
        </p>
      </div>
    </div>
  );
}

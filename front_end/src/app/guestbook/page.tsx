import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "방명록",
  description: "가볍게 인사를 남겨주세요.",
};

export default function GuestbookPage() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">방명록</h1>
      <div className="rounded-xl border border-dashed border-black/15 p-10 text-center dark:border-white/20">
        <p className="text-neutral-500">방명록은 준비 중입니다. 🚧</p>
        <p className="mt-1 text-sm text-neutral-400">
          곧 방문자들이 가볍게 글을 남길 수 있게 됩니다.
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "미니게임",
  description: "가볍게 즐길 수 있는 미니게임 공간입니다.",
};

// 게임을 추가할 때 이 목록에 항목을 추가하면 된다.
const games = [
  {
    href: "/minigame/2048",
    title: "2048",
    description: "같은 숫자를 합쳐 2048 타일을 만들어보세요.",
    emoji: "🔢",
  },
];

export default function MinigamePage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">미니게임</h1>
      <p className="mb-8 text-neutral-500">잠깐 머리좀 식히고 가세요!!</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {games.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="group flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-neutral-900 dark:shadow-none"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-neutral-100 text-2xl dark:bg-white/10">
              {g.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{g.title}</span>
              <span className="block text-sm text-neutral-500">
                {g.description}
              </span>
            </span>
            <ArrowRightIcon className="h-5 w-5 shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}

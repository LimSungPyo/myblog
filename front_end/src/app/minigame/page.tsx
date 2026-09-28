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
      <h1 className="mb-2 text-[28px] font-extrabold tracking-[-0.03em] lg:pt-6 lg:text-[32px]">
        미니게임
      </h1>
      <p className="mb-6 text-muted lg:mb-8">잠깐 머리좀 식히고 가세요!!</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {games.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="group flex items-center gap-4 rounded-[14px] bg-surface p-[18px] shadow-card transition-[box-shadow,scale] duration-[160ms] ease-out-strong hover:shadow-card-hover active:scale-[0.99] sm:p-5 motion-reduce:active:scale-100"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-chip text-2xl">
              {g.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{g.title}</span>
              <span className="block text-sm break-keep text-muted">
                {g.description}
              </span>
            </span>
            <ArrowRightIcon className="h-[18px] w-[18px] shrink-0 text-muted transition-[translate,color] duration-200 ease-out-strong group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}

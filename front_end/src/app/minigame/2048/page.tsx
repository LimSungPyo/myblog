import type { Metadata } from "next";
import Link from "next/link";
import Game2048 from "@/components/minigame/2048/Game2048";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getTopScores } from "@/lib/api";

export const metadata: Metadata = {
  title: "2048",
  description: "같은 숫자를 합쳐 2048을 만드는 미니게임. 최고 점수에 도전하세요.",
};

export default async function Game2048Page() {
  // 서버에서 순위를 미리 조회해 초기 렌더에 포함 (등록 후에는 클라이언트에서 갱신)
  const initialScores = await getTopScores("2048", 10);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/minigame"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:underline"
      >
        <ArrowRightIcon className="h-4 w-4 rotate-180" />
        미니게임 목록
      </Link>

      <h1 className="mb-6 mt-2 text-3xl font-bold tracking-tight">2048</h1>

      <Game2048 initialScores={initialScores} />
    </div>
  );
}

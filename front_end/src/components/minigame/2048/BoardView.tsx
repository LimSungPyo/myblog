import type { Board as BoardType } from "./board";

/** 2048 타일 색상 (클래식 팔레트). 값이 클수록 진한 노랑/주황. */
const TILE_STYLE: Record<number, { bg: string; color: string }> = {
  0: { bg: "rgba(238,228,218,0.35)", color: "transparent" },
  2: { bg: "#eee4da", color: "#776e65" },
  4: { bg: "#ede0c8", color: "#776e65" },
  8: { bg: "#f2b179", color: "#f9f6f2" },
  16: { bg: "#f59563", color: "#f9f6f2" },
  32: { bg: "#f67c5f", color: "#f9f6f2" },
  64: { bg: "#f65e3b", color: "#f9f6f2" },
  128: { bg: "#edcf72", color: "#f9f6f2" },
  256: { bg: "#edcc61", color: "#f9f6f2" },
  512: { bg: "#edc850", color: "#f9f6f2" },
  1024: { bg: "#edc53f", color: "#f9f6f2" },
  2048: { bg: "#edc22e", color: "#f9f6f2" },
};

const SUPER = { bg: "#3c3a32", color: "#f9f6f2" }; // 2048 초과

function fontSize(value: number): string {
  if (value >= 1024) return "text-xl sm:text-2xl";
  if (value >= 128) return "text-2xl sm:text-3xl";
  return "text-3xl sm:text-4xl";
}

export default function Board({ board }: { board: BoardType }) {
  return (
    <div className="rounded-xl bg-[#bbada0] p-2.5 sm:p-3">
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {board.flatMap((row, r) =>
          row.map((value, c) => {
            const style = TILE_STYLE[value] ?? SUPER;
            return (
              <div
                key={`${r}-${c}`}
                className={`flex aspect-square items-center justify-center rounded-lg font-extrabold tabular-nums ${fontSize(
                  value,
                )}`}
                style={{ backgroundColor: style.bg, color: style.color }}
              >
                {value !== 0 ? value : ""}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
